#!/usr/bin/env node
/**
 * SessionStart hook that checks this machine has what the other hooks need,
 * and tells the user when it doesn't. Silent when everything is in place.
 *
 * Every hook fails open, so a missing dependency never shows up as an error:
 * the guard just stops guarding. This hook makes that visible:
 *
 *  - Node features the hooks rely on. Type stripping is implied (this file
 *    loaded); `import.meta.main` gates every hook's entrypoint, so on a Node
 *    without it each hook exits 0 having done nothing.
 *  - Each command hook in the user and project settings: the program it runs
 *    is on PATH and the script it names exists (stow not run, a node that only
 *    nvm puts on PATH, a hard-coded /home/<user> path). Commands ending in
 *    `|| true` are optional by design and skipped.
 *  - The vendored claude-guardrails pattern files (hooks/patterns/), which the
 *    secret guards load at runtime.
 *  - git, used by bash-guard (commit secret scan), organize-guard and the
 *    Salesforce hooks.
 *  - Inside an SFDX project: the sf CLI, and the Code Analyzer plugin that the
 *    sf-cli-guard PMD gate and strict apex-quality use.
 *
 * Node itself can't check for a missing node, so the settings.json command
 * falls back to echoing a systemMessage when this file fails to run.
 *
 * Disable with CLAUDE_DISABLED_HOOKS=hook-doctor. Fails open.
 */

import { accessSync, constants, existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, dirname, isAbsolute, join } from "node:path";
import { loadError as guardrailsLoadError } from "./lib/guardrails-patterns.ts";
import { isRecord, runHook, str } from "./lib/hook-io.ts";
import type { HookEvent, HookOutput } from "./lib/hook-io.ts";

export const ID = "hook-doctor";

export interface DoctorOptions {
  home: string;
  env: NodeJS.ProcessEnv;
  /** Whether the running Node defines import.meta.main. */
  hasImportMetaMain: boolean;
}

export interface Problem {
  /** "required": a guard is off. "optional": a feature degrades. */
  level: "required" | "optional";
  message: string;
}

/** Absolute path of `program` on PATH, or null. */
export function which(program: string, env: NodeJS.ProcessEnv): string | null {
  const candidates = program.includes("/")
    ? [program]
    : (env.PATH ?? "")
        .split(delimiter)
        .filter(Boolean)
        .map((dir) => join(dir, program));
  for (const file of candidates) {
    try {
      accessSync(file, constants.X_OK);
      if (statSync(file).isFile()) return file;
    } catch {
      // not here
    }
  }
  return null;
}

function expand(word: string, home: string): string {
  return word
    .replace(/^(["'])(.*)\1$/, "$2")
    .replace(/^~(?=\/|$)/, home)
    .replace(/\$\{HOME\}|\$HOME\b/g, home);
}

/** Words of a simple command, after leading VAR=value assignments. */
function commandWords(command: string, home: string): string[] {
  const words = (command.match(/"[^"]*"|'[^']*'|[^\s|&;]+/g) ?? []).map((w) => expand(w, home));
  let i = 0;
  while (i < words.length && /^[A-Za-z_]\w*=/.test(words[i]!)) i++;
  return words.slice(i);
}

const INTERPRETERS = new Set(["node", "bash", "sh", "zsh", "python3", "python", "deno", "bun"]);

/** What a hook command needs: its program, and the script file it runs (if any). */
export function commandNeeds(
  command: string,
  home: string,
): { program: string; script: string | null } | null {
  const words = commandWords(command, home);
  const program = words[0];
  if (!program) return null;
  const base = program.slice(program.lastIndexOf("/") + 1);
  if (INTERPRETERS.has(base)) {
    // `bash -c '…'`, `node -e '…'`: the next word is inline code, not a file.
    if (words.some((w) => /^-(?:c|e|-eval|p|-print)$/.test(w))) return { program, script: null };
    const script = words.slice(1).find((w) => !w.startsWith("-"));
    return { program, script: script && /[./]/.test(script) ? script : null };
  }
  return { program, script: null };
}

/** `[event, command]` for every `type: "command"` hook in a settings file. */
export function eventCommands(settings: unknown): Array<[string, string]> {
  if (!isRecord(settings) || !isRecord(settings.hooks)) return [];
  const out: Array<[string, string]> = [];
  for (const [event, groups] of Object.entries(settings.hooks)) {
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      if (!isRecord(group) || !Array.isArray(group.hooks)) continue;
      for (const hook of group.hooks)
        if (isRecord(hook) && (hook.type ?? "command") === "command" && str(hook.command))
          out.push([event, str(hook.command)]);
    }
  }
  return out;
}

/** Every `type: "command"` hook command in a settings file. */
export function hookCommands(settings: unknown): string[] {
  return eventCommands(settings).map(([, command]) => command);
}

/**
 * Scripts that one event runs from more than one differently written command.
 * Tool installers match only their own exact command line, so a portable entry
 * (`bash "$HOME/.claude/hooks/x.sh"`) gets a hard-coded duplicate appended when
 * the tool reinstalls (herdr does this for herdr-agent-state.sh).
 */
export function duplicateScripts(settings: unknown, home: string): string[] {
  const first = new Map<string, string>();
  const dupes = new Set<string>();
  for (const [event, command] of eventCommands(settings)) {
    const script = commandNeeds(command, home)?.script;
    if (!script || !isAbsolute(script)) continue;
    const key = `${event} ${script}`;
    const prior = first.get(key);
    if (prior === undefined) first.set(key, command);
    else if (prior !== command) dupes.add(key);
  }
  return [...dupes];
}

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function findUp(start: string, name: string): string | null {
  let dir = start;
  for (let i = 0; i < 25; i++) {
    if (existsSync(join(dir, name))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

/** True/false when the sf plugin manifest says whether Code Analyzer is installed, null if unknown. */
export function codeAnalyzerInstalled(home: string, env: NodeJS.ProcessEnv): boolean | null {
  const dataDir = env.XDG_DATA_HOME || join(home, ".local", "share");
  const manifest = readJson(join(dataDir, "sf", "package.json"));
  if (!isRecord(manifest)) return null;
  const deps = isRecord(manifest.dependencies) ? Object.keys(manifest.dependencies) : [];
  return deps.some(
    (d) => d === "@salesforce/plugin-code-analyzer" || d === "@salesforce/sfdx-scanner",
  );
}

export function diagnose(event: HookEvent, opts: DoctorOptions): Problem[] {
  const { home, env } = opts;
  const problems: Problem[] = [];
  const add = (level: Problem["level"], message: string) => {
    if (!problems.some((p) => p.message === message)) problems.push({ level, message });
  };

  if (!opts.hasImportMetaMain)
    add(
      "required",
      `Node ${process.versions.node} lacks import.meta.main, so every TypeScript hook exits without running. ` +
        "Install Node 24.2 or newer.",
    );

  const cwd = str(event.cwd) || process.cwd();
  const projectDir = env.CLAUDE_PROJECT_DIR || cwd;
  const configDir = env.CLAUDE_CONFIG_DIR || join(home, ".claude");
  const files = [
    join(configDir, "settings.json"),
    join(projectDir, ".claude", "settings.json"),
    join(projectDir, ".claude", "settings.local.json"),
  ];
  const seen = new Set<string>();
  for (const file of files) {
    const settings = readJson(file);
    for (const key of duplicateScripts(settings, home)) {
      const [event, script] = [key.slice(0, key.indexOf(" ")), key.slice(key.indexOf(" ") + 1)];
      add(
        "optional",
        `${event} runs ${script} from two different hook entries, so it fires twice. A tool reinstall ` +
          "(e.g. `herdr integration install`) probably re-added its own copy; keep the portable `$HOME` one.",
      );
    }
    for (const command of hookCommands(settings)) {
      if (seen.has(command) || /\|\|\s*true\s*$/.test(command)) continue;
      seen.add(command);
      const needs = commandNeeds(command, home);
      if (!needs) continue;
      if (!which(needs.program, env))
        add("required", `\`${needs.program}\` is not on PATH, so hooks that run it are off.`);
      else if (needs.script) {
        const script = isAbsolute(needs.script) ? needs.script : join(projectDir, needs.script);
        if (!existsSync(script)) add("required", `Hook script ${script} is missing (${file}).`);
      }
    }
  }

  const patternsError = guardrailsLoadError();
  if (patternsError)
    add(
      "optional",
      `claude-guardrails patterns failed to load, so secret-guard, bash-guard and sensitive-data-guard ` +
        `run without them: ${patternsError}`,
    );

  if (!which("git", env))
    add(
      "required",
      "`git` is not on PATH: bash-guard can't scan commits for secrets and organize-guard can't find project roots.",
    );

  if (findUp(cwd, "sfdx-project.json")) {
    if (!which("sf", env))
      add(
        "optional",
        "Salesforce project, but the `sf` CLI is not on PATH: the Code Analyzer gate on push/deploy is off.",
      );
    else if (codeAnalyzerInstalled(home, env) === false)
      add(
        "optional",
        "Salesforce project, but the Code Analyzer plugin is not installed (`sf plugins install code-analyzer`): " +
          "the PMD gate on push/deploy is skipped.",
      );
  }
  return problems;
}

export function evaluate(event: HookEvent, opts: DoctorOptions): HookOutput | null {
  const problems = diagnose(event, opts);
  if (problems.length === 0) return null;
  const lines = problems.map((p) => `  - ${p.message}`).join("\n");
  const required = problems.some((p) => p.level === "required");
  return {
    systemMessage: `${ID}: ${required ? "some Claude Code hooks are not running" : "hook features are limited"}:\n${lines}`,
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext:
        `${ID}: hook dependency problems on this machine:\n${lines}\n` +
        "The affected hooks fail open. Mention this to the user if it matters for the task; don't try to install anything unasked.",
    },
  };
}

// Deliberately not `if (import.meta.main)`: on a Node without it, this hook must still run to say so.
if (import.meta.main !== false)
  await runHook(ID, "minimal", (event) =>
    evaluate(event, {
      home: homedir(),
      env: process.env,
      hasImportMetaMain: typeof import.meta.main === "boolean",
    }),
  );
