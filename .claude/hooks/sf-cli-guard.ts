#!/usr/bin/env node
/**
 * PreToolUse guard for Salesforce CLI commands. TypeScript port of the
 * salesforce-claude-code `pre-tool-use.js`, `sfdx-validate.js` and
 * `sfdx-scanner-check.js` hooks.
 *
 * Upstream printed to stderr and exited 0 (often as async hooks), so Claude
 * never saw the warnings. Here:
 *
 *  - "ask" (permission prompt): mutating commands aimed at an org alias that
 *    looks like production (explicit --target-org/-o/-u, or the default
 *    target-org from .sf/config.json); org deletion; bulk deletes;
 *    destructive-changes deploys; `sf project delete source`; mutating
 *    commands aimed at the default Dev Hub; `project deploy quick`, and
 *    `project deploy validate` against production; --ignore-conflicts on
 *    deploy or retrieve; package version promotion; deploys or pushes with
 *    high-severity Code Analyzer (PMD) violations.
 *  - additionalContext (Claude sees it, command still runs): deprecated
 *    `sfdx force:*` commands with their `sf` replacement, production deploys
 *    without --test-level, --ignore-errors, --no-track-source, data import
 *    without --plan, package versions without --code-coverage, and read-only
 *    commands against production.
 *
 * Only `sf`/`sfdx` at command position count: text in quoted arguments,
 * commit messages and heredocs written to files is ignored.
 *
 * The Code Analyzer gate runs only for `git push` and
 * `sf project deploy start` inside an SFDX project, on changed Apex files,
 * and only when `sf code-analyzer` (v5) or `sf scanner` (v4) is installed.
 * Results are cached per HEAD and changed-file contents in
 * $XDG_RUNTIME_DIR (or the temp dir). Skip it with
 * CLAUDE_DISABLED_HOOKS=sf-code-analyzer.
 *
 * Disable everything with CLAUDE_DISABLED_HOOKS=sf-cli-guard. Fails open.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { hookEnabled, isRecord, preToolUse, runHook, str } from "./lib/hook-io.ts";
import type { HookEvent, HookOutput } from "./lib/hook-io.ts";

export const ID = "sf-cli-guard";

/** Deprecated sfdx commands and their sf replacements. */
export const SFDX_MIGRATION: Record<string, string> = {
  "force:apex:execute": "sf apex run",
  "force:apex:test:run": "sf apex run test",
  "force:apex:test:report": "sf apex get test",
  "force:apex:log:tail": "sf apex tail log",
  "force:apex:log:get": "sf apex get log",
  "force:apex:class:create": "sf apex generate class",
  "force:apex:trigger:create": "sf apex generate trigger",
  "force:lightning:component:create": "sf lightning generate component",
  "force:source:deploy": "sf project deploy start",
  "force:source:retrieve": "sf project retrieve start",
  "force:source:push": "sf project deploy start",
  "force:source:pull": "sf project retrieve start",
  "force:source:status": "sf project deploy preview / sf project retrieve preview",
  "force:source:delete": "sf project delete source",
  "force:mdapi:deploy": "sf project deploy start --metadata-dir",
  "force:mdapi:retrieve": "sf project retrieve start --target-metadata-dir",
  "force:org:create": "sf org create scratch",
  "force:org:delete": "sf org delete scratch",
  "force:org:list": "sf org list",
  "force:org:open": "sf org open",
  "force:org:display": "sf org display",
  "force:data:soql:query": "sf data query",
  "force:data:query": "sf data query",
  "force:data:record:create": "sf data create record",
  "force:data:record:update": "sf data update record",
  "force:data:record:delete": "sf data delete record",
  "force:data:bulk:upsert": "sf data upsert bulk",
  "force:data:bulk:delete": "sf data delete bulk",
  "force:data:tree:import": "sf data import tree",
  "force:data:tree:export": "sf data export tree",
  "force:package:create": "sf package create",
  "force:package:version:create": "sf package version create",
  "force:package:install": "sf package install",
  "force:user:create": "sf org create user",
  "force:user:password:generate": "sf org generate password",
  "force:auth:web:login": "sf org login web",
  "force:auth:jwt:grant": "sf org login jwt",
  "force:config:set": "sf config set",
};

const PROD_ALIAS = /(?:^|[-_.@])(?:prod|production|prd)(?:$|[-_.@])/i;

/** Subcommands that change org state (data, metadata, users, the org itself). */
const MUTATING =
  /^(?:project deploy (?:start|resume|quick)|project delete|data (?:create|update|delete|upsert|import|resume)|apex run(?! test)|org (?:delete|create user|assign|generate password)|package (?:install|uninstall)|community publish|force:(?:source:(?:deploy|push|delete)|mdapi:deploy|data:|apex:execute|package:install|user:))/i;

interface Finding {
  level: "ask" | "warn";
  message: string;
}

// --- Shell parsing --------------------------------------------------------------
// Only words at command position run. `sf …` inside a commit message, an echo
// argument or a heredoc written to a file is data and must not trigger checks.

/** Programs that run their heredoc body or `-c` argument as shell code. */
const SHELLS = new Set(["sh", "bash", "zsh", "dash", "ksh", "fish", "ssh"]);
/** Prefixes and keywords that hand the next word command position. */
const WRAPPERS = new Set([
  "sudo",
  "doas",
  "env",
  "command",
  "exec",
  "nice",
  "nohup",
  "time",
  "builtin",
  "timeout",
  "xargs",
  "then",
  "do",
  "else",
  "if",
  "elif",
  "while",
  "until",
  "!",
  "{",
]);
/** Wrapper flags that take a separate value. */
const WRAPPER_ARGS: Record<string, string[]> = {
  sudo: ["-u", "-g", "-C", "-h", "-p", "-D", "-U"],
  doas: ["-u", "-C"],
  env: ["-u", "-C", "-S"],
  nice: ["-n"],
  timeout: ["-s", "-k"],
  xargs: ["-I", "-P", "-L", "-n", "-d", "-s", "-E", "-a"],
};

function baseName(word: string): string {
  return word.slice(word.lastIndexOf("/") + 1);
}

/**
 * Command segments of `src`, split at unquoted `;`, `&`, `|`, newlines and
 * parens. `$(…)` and backtick bodies become segments of their own (a "_"
 * stands in for them in the outer segment); quoted text and comments do not.
 */
export function shellSegments(src: string): string[] {
  interface Frame {
    buf: string;
    quote: string;
    close: string;
    depth: number;
  }
  const out: string[] = [];
  const stack: Frame[] = [{ buf: "", quote: "", close: "", depth: 0 }];
  const flush = (f: Frame) => {
    if (f.buf.trim()) out.push(f.buf.trim());
    f.buf = "";
  };
  for (let i = 0; i < src.length; i++) {
    const f = stack.at(-1)!;
    const ch = src[i]!;
    if (f.quote === "'") {
      f.buf += ch;
      if (ch === "'") f.quote = "";
      continue;
    }
    if (ch === "\\") {
      f.buf += ch + (src[i + 1] ?? "");
      i++;
      continue;
    }
    if (ch === "`" && f.close === "`" && f.quote === "") {
      flush(f);
      stack.pop();
      continue;
    }
    if ((ch === "$" && src[i + 1] === "(") || ch === "`") {
      f.buf += "_";
      if (ch === "$") i++;
      stack.push({ buf: "", quote: "", close: ch === "`" ? "`" : ")", depth: 0 });
      continue;
    }
    if (f.quote === '"') {
      f.buf += ch;
      if (ch === '"') f.quote = "";
      continue;
    }
    if (ch === "'" || ch === '"') {
      f.quote = ch;
      f.buf += ch;
    } else if (ch === "#" && (f.buf === "" || /\s$/.test(f.buf))) {
      const nl = src.indexOf("\n", i);
      i = (nl < 0 ? src.length : nl) - 1;
    } else if (ch === ")" && f.close === ")" && f.depth === 0) {
      flush(f);
      stack.pop();
    } else if (ch === "(" || ch === ")") {
      f.depth += ch === "(" ? 1 : -1;
      flush(f);
    } else if (ch === ";" || ch === "&" || ch === "|" || ch === "\n") {
      flush(f);
    } else {
      f.buf += ch;
    }
  }
  for (const f of stack) flush(f); // unterminated: innermost last
  return out;
}

/** Words of a segment, quotes kept (`FOO="a b"` stays one word). */
function rawWords(segment: string): string[] {
  return segment.match(/(?:[^\s"'\\]|\\.|"(?:[^"\\]|\\.)*"?|'[^']*'?)+/g) ?? [];
}

function unquote(word: string): string {
  return word.replace(/"((?:[^"\\]|\\.)*)"?|'([^']*)'?|\\(.)/g, "$1$2$3");
}

/** Index of the command word, past VAR=value assignments, wrappers and shell keywords. */
function commandStart(words: string[]): number {
  let i = 0;
  while (i < words.length) {
    const w = words[i]!;
    if (/^[A-Za-z_]\w*=/.test(w)) {
      i++;
      continue;
    }
    if (!WRAPPERS.has(w)) break;
    i++;
    while (i < words.length && words[i]!.startsWith("-")) {
      // sudo -u user, env -u VAR, xargs -I {}: the flag takes the next word.
      if (WRAPPER_ARGS[w]?.includes(words[i]!)) i++;
      i++;
    }
    if (w === "timeout" && /^\d/.test(words[i] ?? "")) i++;
  }
  return i;
}

/** Unquoted words of a segment from its command word on. */
function commandWords(segment: string): { raw: string[]; words: string[] } {
  const raw = rawWords(segment);
  const start = commandStart(raw.map(unquote));
  return { raw: raw.slice(start), words: raw.slice(start).map(unquote) };
}

/** Drop heredoc bodies, unless a shell (or ssh) runs them. */
function stripHeredocs(command: string): string {
  const lines = command.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i++]!;
    out.push(line);
    for (const op of line.matchAll(/(?<!<)<<(?!<)(-?)\s*(["']?)([A-Za-z_][\w-]*)\2/g)) {
      const end = lines.findIndex(
        (l, n) => n >= i && (op[1] ? l.replace(/^\t+/, "") : l) === op[3],
      );
      if (end < 0) break; // unterminated: leave everything in place
      const owner = commandWords(shellSegments(line.slice(0, op.index)).at(-1) ?? "").words[0];
      if (SHELLS.has(baseName(owner ?? ""))) out.push(...lines.slice(i, end));
      out.push("");
      i = end + 1;
    }
  }
  return out.join("\n");
}

/** Every command segment that runs, including `bash -c '…'` and `eval '…'` bodies. */
export function commandSegments(command: string, depth = 0): string[] {
  const out: string[] = [];
  for (const seg of shellSegments(stripHeredocs(command))) {
    out.push(seg);
    if (depth >= 3) continue;
    const { words } = commandWords(seg);
    const cmd = baseName(words[0] ?? "");
    let body: string | undefined;
    if (cmd === "eval") body = words.slice(1).join(" ");
    else if (SHELLS.has(cmd) && cmd !== "ssh") {
      const c = words.findIndex((w, n) => n > 0 && /^-[a-z]*c[a-z]*$/.test(w));
      if (c > 0) body = words[c + 1];
    }
    if (body) out.push(...commandSegments(body, depth + 1));
  }
  return out;
}

interface Invocation {
  bin: string;
  sub: string;
  seg: string;
}

/** `sf`/`sfdx` invocations at command position, with the segment from `sf` on. */
function sfInvocations(command: string): Invocation[] {
  const out: Invocation[] = [];
  for (const segment of commandSegments(command)) {
    const { raw, words } = commandWords(segment);
    const bin = baseName(words[0] ?? "").toLowerCase();
    if (bin !== "sf" && bin !== "sfdx") continue;
    const sub: string[] = [];
    for (const w of words.slice(1, 5)) {
      if (!(sub.length === 0 ? /^[a-z][\w:-]*$/i : /^[a-z][\w-]*$/i).test(w)) break;
      sub.push(w);
    }
    if (sub.length > 0) out.push({ bin, sub: sub.join(" ").toLowerCase(), seg: raw.join(" ") });
  }
  return out;
}

function explicitOrg(seg: string): string {
  return /(?:--target-org|--targetusername|\s-o|\s-u)(?:=|\s+)["']?([^\s"']+)/.exec(seg)?.[1] ?? "";
}

function findUp(start: string, name: string): string | null {
  let dir = start;
  for (let i = 0; i < 25; i++) {
    const candidate = join(dir, name);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** A config value from the nearest .sf/config.json, then ~/.sf/config.json. */
function sfConfig(key: string, cwd: string, home: string): string {
  for (const file of [findUp(cwd, join(".sf", "config.json")), join(home, ".sf", "config.json")]) {
    if (!file || !existsSync(file)) continue;
    try {
      const cfg: unknown = JSON.parse(readFileSync(file, "utf8"));
      if (isRecord(cfg) && typeof cfg[key] === "string") return cfg[key];
    } catch {
      // ignore malformed config
    }
  }
  return "";
}

/** Default target-org from the nearest .sf/config.json, then ~/.sf/config.json. */
export function defaultOrg(cwd: string, home = homedir()): string {
  return sfConfig("target-org", cwd, home);
}

export function checkCommand(command: string, cwd: string, home = homedir()): Finding[] {
  const findings: Finding[] = [];
  const devHub = sfConfig("target-dev-hub", cwd, home);
  const add = (level: Finding["level"], message: string) => {
    if (!findings.some((f) => f.message === message)) findings.push({ level, message });
  };

  for (const { bin, sub, seg } of sfInvocations(command)) {
    const head = sub.split(/\s+/)[0]!;
    if (bin === "sfdx" || head.startsWith("force:")) {
      const repl = SFDX_MIGRATION[head];
      add(
        "warn",
        repl
          ? `\`${bin} ${head}\` is deprecated; use \`${repl}\`.`
          : `\`${bin} ${head}\` uses the retired sfdx command set; use the \`sf\` equivalent.`,
      );
    }

    const org = explicitOrg(seg) || defaultOrg(cwd, home);
    const prod = org !== "" && PROD_ALIAS.test(org);
    const mutating = MUTATING.test(sub);
    const orgNote = explicitOrg(seg) ? `org "${org}"` : `default target-org "${org}"`;
    if (prod && mutating)
      add("ask", `\`${bin} ${sub}\` changes ${orgNote}, which looks like PRODUCTION.`);
    else if (prod)
      add(
        "warn",
        `\`${bin} ${sub}\` runs against ${orgNote}, which looks like PRODUCTION. Keep it read-only.`,
      );
    if (mutating && devHub !== "" && org === devHub)
      add(
        "ask",
        `\`${bin} ${sub}\` changes ${orgNote}, the default Dev Hub. Develop and deploy in scratch orgs or sandboxes.`,
      );
    // validate is check-only: it matters only as the first half of a production quick deploy.
    if (/^project deploy quick\b/.test(sub) || (prod && /^project deploy validate\b/.test(sub)))
      add(
        "ask",
        `\`sf ${sub}\` is the production quick-deploy workflow. For scratch orgs and sandboxes use \`sf project deploy start --dry-run\`.`,
      );
    if (/^package version promote\b/.test(sub))
      add("ask", "Promoting a package version releases it permanently; it can't be un-promoted.");
    if (
      /^project (?:deploy|retrieve) start/.test(sub) &&
      /--ignore-conflicts|\s-c\b/.test(seg) &&
      !/--dry-run/.test(seg)
    )
      add(
        "ask",
        "--ignore-conflicts overwrites conflicting changes (in the org on deploy, in local source on retrieve). Resolve conflicts instead.",
      );

    if (/^org delete\b|^force:org:delete/.test(sub))
      add(
        "ask",
        "Deletes a Salesforce org. Make sure it is the right org and that source changes are retrieved.",
      );
    if (/^data delete bulk|^force:data:bulk:delete/.test(sub))
      add("ask", "Bulk delete permanently removes records. Check the CSV and target org first.");
    if (/^project delete source|^force:source:delete/.test(sub))
      add("ask", "Deletes metadata from the org and local project.");
    if (/^project deploy start/.test(sub) || /^force:source:deploy|^force:mdapi:deploy/.test(sub)) {
      if (/--(?:pre|post)-destructive-changes|destructiveChanges(?:Pre|Post)?\.xml/i.test(seg))
        add(
          "ask",
          "Destructive-changes deploy deletes metadata in the target org. Verify the manifest.",
        );
      const preview = /--dry-run|--validate|--checkonly|--check-only/.test(seg);
      if (prod && !preview && !/--test-level|\s-l\s/.test(seg))
        add(
          "warn",
          "Production deploy without --test-level. Use --test-level RunLocalTests (or RunSpecifiedTests), or --dry-run first.",
        );
      if (/--ignore-errors/.test(seg))
        add("warn", "--ignore-errors can leave the org partially deployed.");
    }
    if (/--no-track-source/.test(seg))
      add("warn", "--no-track-source: local source tracking won't reflect these changes.");
    if (/^org delete scratch/.test(sub) && !/--no-prompt/.test(seg))
      add("warn", "Retrieve or commit any scratch-org changes before deleting it.");
    if (/^data import tree/.test(sub) && !/--plan|\s-p\s/.test(seg))
      add("warn", "Data import without --plan. A plan file makes imports repeatable.");
    if (/^package version create/.test(sub) && !/--code-coverage|-c\b|--skip-validation/.test(seg))
      add(
        "warn",
        "Package version without --code-coverage can't be promoted (managed packages need 75% coverage).",
      );
  }
  return findings;
}

// --- Code Analyzer gate -------------------------------------------------------

interface Violation {
  severity: number;
  rule: string;
  message: string;
  file: string;
  line: number;
}

function sh(cmd: string, args: string[], cwd: string, timeout: number) {
  return spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    timeout,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function changedApex(root: string): string[] {
  const files = new Set<string>();
  for (const args of [
    ["diff", "--name-only", "HEAD"],
    ["diff", "--name-only", "--cached"],
    ["diff", "--name-only", "@{upstream}...HEAD"],
  ]) {
    const r = sh("git", args, root, 5000);
    if (r.status !== 0) continue;
    for (const f of r.stdout.split("\n"))
      if (/\.(?:cls|trigger)$/.test(f) && existsSync(join(root, f))) files.add(f);
  }
  return [...files].slice(0, 50);
}

/** Run Code Analyzer v5 (or v4 sf scanner) PMD rules on `files`; severity 1-2 only. */
export function runCodeAnalyzer(root: string, files: string[]): Violation[] | null {
  const dir = mkdtempSync(join(tmpdir(), "sf-ca-"));
  try {
    const out = join(dir, "out.json");
    const targets = files.flatMap((f) => ["-t", f]);
    const v5 = sh(
      "sf",
      ["code-analyzer", "run", "-r", "pmd:1", "-r", "pmd:2", ...targets, "-f", out],
      root,
      50000,
    );
    if (existsSync(out)) {
      const data: unknown = JSON.parse(readFileSync(out, "utf8"));
      if (!isRecord(data) || !Array.isArray(data.violations)) return [];
      return data.violations.filter(isRecord).map((v) => {
        const locs = Array.isArray(v.locations) ? v.locations.filter(isRecord) : [];
        const loc =
          locs[typeof v.primaryLocationIndex === "number" ? v.primaryLocationIndex : 0] ?? {};
        return {
          severity: Number(v.severity),
          rule: str(v.rule),
          message: str(v.message),
          file: str(loc.file),
          line: Number(loc.startLine) || 0,
        };
      });
    }
    // v5.error means sf is missing (ENOENT) or v5 hit its timeout. Falling back to v4 then
    // would only burn a second 50s budget and overrun the hook's 75s timeout.
    if (v5.error) return null;
    if (/not a sf command|command code-analyzer not found/i.test(v5.stderr ?? "")) {
      const v4 = sh(
        "sf",
        ["scanner", "run", "--target", files.join(","), "--format", "json", "--engine", "pmd"],
        root,
        50000,
      );
      const parsed: unknown = JSON.parse(v4.stdout || "null");
      if (!Array.isArray(parsed)) return null;
      return parsed.filter(isRecord).flatMap((f) =>
        (Array.isArray(f.violations) ? f.violations.filter(isRecord) : []).map((v) => ({
          severity: Number(v.severity),
          rule: str(v.ruleName),
          message: str(v.message).trim(),
          file: str(f.fileName),
          line: Number(v.line) || 0,
        })),
      );
    }
    return null;
  } catch {
    return null;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Whether a segment that actually runs is `git push` or `sf project deploy start` (not a preview). */
export function pushesOrDeploys(command: string): boolean {
  if (!/\bpush\b|\bdeploy\b/.test(command)) return false;
  return commandSegments(command).some((segment) => {
    const { words } = commandWords(segment);
    if (words.some((w) => /^--(?:dry-run|help)$/.test(w))) return false;
    const cmd = baseName(words[0] ?? "");
    if (cmd === "git") {
      let i = 1;
      while (words[i]?.startsWith("-")) {
        if (/^(?:-C|-c|--git-dir|--work-tree|--namespace)$/.test(words[i]!)) i++;
        i++;
      }
      return words[i] === "push";
    }
    return (
      (cmd === "sf" || cmd === "sfdx") &&
      words.slice(1, 4).join(" ").toLowerCase() === "project deploy start"
    );
  });
}

const CACHE_TTL = 24 * 60 * 60 * 1000;

function cacheFile(): string {
  const uid = process.getuid?.() ?? "user";
  return join(process.env.XDG_RUNTIME_DIR || tmpdir(), `claude-sf-code-analyzer-${uid}.json`);
}

/** HEAD sha plus the changed files' names and contents. */
function cacheKey(root: string, files: string[]): string | null {
  const head = sh("git", ["rev-parse", "HEAD"], root, 5000);
  if (head.status !== 0) return null;
  const hash = createHash("sha256").update(`${root}\0${head.stdout.trim()}`);
  for (const f of [...files].sort()) hash.update(`\0${f}\0`).update(readFileSync(join(root, f)));
  return hash.digest("hex");
}

type Cache = Record<string, { at: number; violations: Violation[] }>;

function readCache(): Cache {
  try {
    const file = cacheFile();
    // A shared temp dir: trust only our own file.
    if (process.getuid && statSync(file).uid !== process.getuid()) return {};
    const data: unknown = JSON.parse(readFileSync(file, "utf8"));
    return isRecord(data) ? (data as Cache) : {};
  } catch {
    return {};
  }
}

function writeCache(key: string, violations: Violation[]): void {
  try {
    const now = Date.now();
    const entries = Object.entries(readCache())
      .filter(([k, v]) => k !== key && now - v.at < CACHE_TTL)
      .slice(-19);
    const file = cacheFile();
    const tmp = `${file}.${process.pid}`;
    writeFileSync(
      tmp,
      JSON.stringify(Object.fromEntries([...entries, [key, { at: now, violations }]])),
      {
        mode: 0o600,
      },
    );
    renameSync(tmp, file);
  } catch {
    // no cache: the next push just runs the analyzer again
  }
}

/** Code Analyzer results for `files`, reused while HEAD and the files are unchanged. */
function cachedCodeAnalyzer(root: string, files: string[]): Violation[] | null {
  let key: string | null = null;
  try {
    key = cacheKey(root, files);
  } catch {
    key = null;
  }
  const hit = key ? readCache()[key] : undefined;
  if (hit && Date.now() - hit.at < CACHE_TTL && Array.isArray(hit.violations))
    return hit.violations;
  const violations = runCodeAnalyzer(root, files);
  if (key && violations) writeCache(key, violations);
  return violations;
}

function codeAnalyzerGate(command: string, cwd: string): Finding | null {
  if (!hookEnabled("sf-code-analyzer", "standard")) return null;
  if (!pushesOrDeploys(command)) return null;
  const project = findUp(cwd, "sfdx-project.json");
  if (!project) return null;
  const root = dirname(project);
  const files = changedApex(root);
  if (files.length === 0) return null;
  const violations = cachedCodeAnalyzer(root, files)?.filter((v) => v.severity <= 2) ?? [];
  if (violations.length === 0) return null;
  const lines = violations
    .slice(0, 10)
    .map(
      (v) =>
        `    [${v.severity === 1 ? "CRITICAL" : "HIGH"}] ${v.file}:${v.line} ${v.rule}: ${v.message}`,
    );
  if (violations.length > 10) lines.push(`    …and ${violations.length - 10} more`);
  return {
    level: "ask",
    message: `Code Analyzer found ${violations.length} critical/high PMD violation(s) in changed Apex:\n${lines.join("\n")}\n  Fix them before pushing or deploying, or approve to continue anyway.`,
  };
}

export function evaluate(event: HookEvent): HookOutput | null {
  if (str(event.tool_name) !== "Bash") return null;
  const input = isRecord(event.tool_input) ? event.tool_input : {};
  const command = str(input.command);
  if (!command) return null;
  const cwd = str(event.cwd) || process.cwd();

  const findings = /\b(?:sf|sfdx)\s/.test(command) ? checkCommand(command, cwd) : [];
  const gate = codeAnalyzerGate(command, cwd);
  if (gate) findings.push(gate);
  if (findings.length === 0) return null;

  const asks = findings.filter((f) => f.level === "ask").map((f) => `  - ${f.message}`);
  const warns = findings.filter((f) => f.level === "warn").map((f) => `  - ${f.message}`);
  if (asks.length > 0) {
    return preToolUse(
      "ask",
      `${ID}: confirm this Salesforce operation:\n${asks.join("\n")}` +
        (warns.length ? `\nAlso:\n${warns.join("\n")}` : ""),
    );
  }
  return preToolUse(
    undefined,
    "",
    `${ID}: Salesforce CLI notes for this command:\n${warns.join("\n")}`,
  );
}

if (import.meta.main) await runHook(ID, "minimal", evaluate);
