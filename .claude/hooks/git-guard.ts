#!/usr/bin/env node
/**
 * PreToolUse guard that stops Claude from skipping git hooks. TypeScript port
 * of the `block-no-verify` package the salesforce-claude-code hooks run via
 * npx.
 *
 * Denies, for commit / push / pull / merge / am / cherry-pick / rebase / revert:
 *  - `--no-verify` (and `--no-verify=…`)
 *  - `git commit -n`, including short-flag clusters like `-anm "msg"`
 *  - `git -c core.hooksPath=…` overrides
 *  - `HUSKY=0`, `HUSKY_SKIP_HOOKS=1` or `SKIP=…` env prefixes, also after
 *    wrappers such as `env`, `sudo` or `nice -n 5`
 *
 * Quoted text (commit messages, heredoc bodies) is ignored. Pre-commit and
 * pre-push failures should be fixed, not bypassed; the user can still run the
 * command themselves.
 *
 * Disable with CLAUDE_DISABLED_HOOKS=git-guard. Fails open.
 */

import { isRecord, preToolUse, runHook, str } from "./lib/hook-io.ts";
import type { HookEvent, HookOutput } from "./lib/hook-io.ts";

export const ID = "git-guard";

const HOOKED = new Set([
  "commit",
  "push",
  "merge",
  "am",
  "cherry-pick",
  "rebase",
  "revert",
  "pull",
]);
/** git commit short options that consume the next argument (or the rest of the cluster). */
const COMMIT_ARG_SHORT = new Set(["m", "F", "c", "C", "t", "u", "S"]); // u/S take attached values only
const GLOBAL_WITH_ARG = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--exec-path",
  "--config-env",
]);

/**
 * Split into simple-command segments at unquoted separators (newline, ;, &, |,
 * parens, backticks, $( ), with heredoc bodies removed. Quoted text stays
 * inside its segment, so a commit message mentioning --no-verify is ignored.
 */
export function segments(command: string): string[] {
  const text = command.replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2\s*(?:\n|$)/g, "\n");
  const out: string[] = [];
  let cur = "";
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quote) {
      if (ch === "\\" && quote === '"') cur += ch + (text[++i] ?? "");
      else {
        if (ch === quote) quote = null;
        cur += ch;
      }
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      cur += ch;
    } else if (ch === "\\") {
      cur += ch + (text[++i] ?? "");
    } else if (/[\n;&|()`]/.test(ch) || (ch === "$" && text[i + 1] === "(")) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.filter((s) => s.trim());
}

/** Shell-ish tokenizer: handles '…', "…" and backslash escapes. */
export function tokenize(segment: string): string[] {
  const tokens: string[] = [];
  let cur = "";
  let quote: string | null = null;
  let has = false;
  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i]!;
    if (quote) {
      if (ch === quote) quote = null;
      else if (ch === "\\" && quote === '"' && i + 1 < segment.length) cur += segment[++i];
      else cur += ch;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      has = true;
    } else if (ch === "\\" && i + 1 < segment.length) {
      cur += segment[++i];
      has = true;
    } else if (/\s/.test(ch)) {
      if (has || cur) tokens.push(cur);
      cur = "";
      has = false;
    } else {
      cur += ch;
      has = true;
    }
  }
  if (has || cur) tokens.push(cur);
  return tokens;
}

const HOOK_SKIP_ENV =
  /^(?:HUSKY=0|HUSKY_SKIP_HOOKS=(?:1|true)|SKIP=\S+|PRE_COMMIT_ALLOW_NO_CONFIG=1)$/;
const WRAPPERS = /^(?:env|command|exec|nice|nohup|time|sudo)$/;

export function findBypass(command: string): string | null {
  for (const seg of segments(command)) {
    const tokens = tokenize(seg.trim());
    let i = 0;
    const envSkips: string[] = [];
    const skipAssignments = () => {
      while (i < tokens.length && /^[A-Za-z_]\w*=/.test(tokens[i]!)) {
        if (HOOK_SKIP_ENV.test(tokens[i]!)) envSkips.push(tokens[i]!);
        i++;
      }
    };
    skipAssignments();
    // Wrappers may carry their own options (`env -i`, `nice -n 5`) and, for env, assignments.
    while (i < tokens.length && WRAPPERS.test(tokens[i]!)) {
      i++;
      while (i < tokens.length && (tokens[i]!.startsWith("-") || /^\d+$/.test(tokens[i]!))) i++;
      skipAssignments();
    }
    if (tokens[i] !== "git" && !/\/git$/.test(tokens[i] ?? "")) continue;
    i++;

    let hooksOverride = "";
    while (i < tokens.length && tokens[i]!.startsWith("-")) {
      const t = tokens[i]!;
      if (t === "-c" && /^core\.hookspath=/i.test(tokens[i + 1] ?? ""))
        hooksOverride = `-c ${tokens[i + 1]}`;
      i += GLOBAL_WITH_ARG.has(t) ? 2 : 1;
    }
    const sub = tokens[i];
    if (!sub || !HOOKED.has(sub)) continue;
    if (hooksOverride) return `git ${hooksOverride} ${sub}`;
    if (envSkips.length) return `${envSkips.join(" ")} git ${sub}`;

    for (let j = i + 1; j < tokens.length; j++) {
      const t = tokens[j]!;
      if (t === "--") break;
      if (t === "--no-verify" || t.startsWith("--no-verify=")) return `git ${sub} --no-verify`;
      if (sub === "commit" && /^-[A-Za-z]+$/.test(t)) {
        for (const ch of t.slice(1)) {
          if (ch === "n") return `git commit ${t} (-n is --no-verify)`;
          if (COMMIT_ARG_SHORT.has(ch)) break;
        }
        if (/^-[A-Za-z]*[mFcCt]$/.test(t)) j++; // option value follows as its own token
      }
    }
  }
  return null;
}

export function evaluate(event: HookEvent): HookOutput | null {
  if (str(event.tool_name) !== "Bash") return null;
  const input = isRecord(event.tool_input) ? event.tool_input : {};
  const hit = findBypass(str(input.command));
  if (!hit) return null;
  return preToolUse(
    "deny",
    `${ID}: \`${hit}\` skips git hooks. Fix the hook failure instead (run the failing check, fix the code, and ` +
      "commit again). If the user explicitly wants to bypass hooks, ask them to run the command themselves.",
  );
}

if (import.meta.main) await runHook(ID, "minimal", evaluate);
