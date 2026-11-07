#!/usr/bin/env node
/**
 * PreToolUse guard that keeps Claude's loose files out of project roots.
 *
 * Applies only to projects under ~/projects or ~/Projects, excluding the
 * dotfiles repo. For a Write that would *create* a new file:
 *
 *  - directly in a project root, with a doc/script/scratch-looking name, the
 *    write is denied and Claude is told to use docs/, scripts/, or tmp/;
 *  - in /tmp or /var/tmp while the session runs inside a project, the write
 *    is denied and Claude is told to use <project>/tmp/ instead.
 *
 * Overwriting existing files is never blocked. Writes into <project>/tmp/
 * make sure tmp/ is git-ignored locally (.git/info/exclude, never .gitignore).
 *
 * Per-project overrides: <project>/.claude/organize.allow holds glob patterns
 * (one per line, '#' comments) for root files that are allowed; a line of '*'
 * disables the guard for that project.
 *
 * Any internal error allows the write: this hook must never fail closed.
 *
 * Runs on Node's built-in TypeScript type stripping (erasable syntax only).
 */

import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { isRecord, readStdin } from "./lib/hook-io.ts";

export interface GuardOptions {
  bases: string[];
  excluded: string[];
  systemTmp: string[];
}

const HOME = homedir();
export const DEFAULT_OPTIONS: GuardOptions = {
  bases: [join(HOME, "projects"), join(HOME, "Projects")],
  excluded: [join(HOME, "projects", "dots"), join(HOME, "Projects", "dots")],
  systemTmp: [...new Set(["/tmp", "/var/tmp", tmpdir()])],
};

/**
 * Conventional root docs, as the bare name or name.<ext> (README.md, README.zh-CN.md).
 * Not a prefix glob: `security*` used to let `security-review.md` through.
 */
const ROOT_DOCS = [
  "readme",
  "notice",
  "changelog",
  "changes",
  "history",
  "contributing",
  "code_of_conduct",
  "security",
  "support",
  "authors",
  "contributors",
  "maintainers",
  "governance",
].flatMap((name) => [name, `${name}.*`]);

/** Root files that are always fine (matched case-insensitively against the name). */
const ROOT_ALLOW = [
  ...ROOT_DOCS,
  "license*", // LICENSE-MIT, LICENSE-APACHE
  "licence*",
  "copying*",
  "codeowners",
  "claude.md",
  "agents.md",
  "gemini.md",
  "claude.local.md",
  ".*", // dotfiles: .gitignore, .env.example, .editorconfig, ...
  "*.config.*",
  "*.conf.*",
  "*rc.js",
  "*rc.cjs",
  "*rc.mjs",
  "*.d.ts", // env.d.ts, global.d.ts
  "setup.py",
  "manage.py",
  "conftest.py",
  "noxfile.py",
  "fabfile.py",
  "main.*",
  "index.*",
  "app.*",
  "server.*",
  "mod.*",
  "lib.*",
  "build.*",
  "requirements*.txt",
  "constraints*.txt",
  "robots.txt",
  "cmakelists.txt",
];

const DOC_EXT = new Set([".md", ".markdown", ".mdx", ".rst", ".adoc", ".txt", ".org"]);
const SCRIPT_EXT = new Set([
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".py",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".mts",
  ".cts",
  ".rb",
  ".pl",
  ".lua",
  ".ps1",
  ".sql",
]);
const TMP_EXT = new Set([
  ".log",
  ".out",
  ".tmp",
  ".bak",
  ".orig",
  ".rej",
  ".diff",
  ".patch",
  ".csv",
  ".tsv",
  ".html",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
]);
const SCRATCH_HINTS = [
  "tmp",
  "temp",
  "scratch",
  "debug",
  "draft",
  "output",
  "dump",
  "-v2",
  "-v3",
  "-final",
  "-fixed",
  "-old",
  "-new",
  "-copy",
  "-backup",
];

interface HookEvent {
  cwd?: unknown;
  tool_input?: unknown;
  tool_name?: unknown;
}

function expandHome(raw: string): string {
  if (raw === "~") return HOME;
  if (raw.startsWith("~/")) return join(HOME, raw.slice(2));
  return raw;
}

/** Resolve symlinks in a path that may not exist yet (via its nearest existing ancestor). */
export function canonicalPath(raw: string, cwd = process.cwd()): string {
  const expanded = expandHome(raw);
  const path = resolve(isAbsolute(expanded) ? expanded : join(cwd, expanded));
  const missing: string[] = [];
  let candidate = path;
  while (true) {
    try {
      return join(realpathSync.native(candidate), ...missing.reverse());
    } catch {
      const parent = dirname(candidate);
      if (parent === candidate) return path;
      missing.push(basename(candidate));
      candidate = parent;
    }
  }
}

function isWithin(path: string, root: string): boolean {
  const rel = relative(root, path);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function nearestExistingDir(path: string): string {
  let candidate = path;
  while (true) {
    try {
      if (statSync(candidate).isDirectory()) return candidate;
    } catch {
      // keep walking up
    }
    const parent = dirname(candidate);
    if (parent === candidate) return candidate;
    candidate = parent;
  }
}

function git(cwd: string, ...args: string[]): { ok: boolean; status: number; out: string } {
  try {
    const out = execFileSync("git", ["-C", cwd, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
    });
    return { ok: true, status: 0, out: out.trim() };
  } catch (error) {
    const status = isRecord(error) && typeof error.status === "number" ? error.status : -1;
    return { ok: false, status, out: "" };
  }
}

/** Project containing `path`, or null if it's outside the managed project dirs. */
export function projectRoot(path: string, opts: GuardOptions): string | null {
  const bases = opts.bases.filter(existsSync).map((b) => canonicalPath(b));
  const base = bases.find((b) => isWithin(path, b) && path !== b);
  if (!base) return null;
  if (opts.excluded.some((e) => isWithin(path, canonicalPath(e)))) return null;

  const top = git(nearestExistingDir(path), "rev-parse", "--show-toplevel").out;
  if (top) {
    const topPath = canonicalPath(top);
    if (isWithin(topPath, base) && topPath !== base) return topPath;
  }
  const parts = relative(base, path).split(sep);
  if (parts.length < 2) return null; // a loose file directly in ~/projects itself
  return join(base, parts[0]);
}

function projectPatterns(root: string): string[] {
  try {
    return readFileSync(join(root, ".claude", "organize.allow"), "utf8")
      .split("\n")
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line && !line.startsWith("#"));
  } catch {
    return [];
  }
}

function globMatch(name: string, pattern: string): boolean {
  const body = pattern
    .split("")
    .map((ch) => (ch === "*" ? ".*" : ch === "?" ? "." : ch.replace(/[.+^${}()|[\]\\]/g, "\\$&")))
    .join("");
  return new RegExp(`^${body}$`).test(name);
}

function suggestDir(name: string): "docs" | "scripts" | "tmp" {
  const lower = name.toLowerCase();
  const ext = extname(lower);
  if (TMP_EXT.has(ext) || SCRATCH_HINTS.some((hint) => lower.includes(hint))) return "tmp";
  if (SCRIPT_EXT.has(ext)) return "scripts";
  return "docs";
}

/** Extensionless names (Makefile, Dockerfile, justfile, ...) are never policed. */
function needsGuard(name: string): boolean {
  const ext = extname(name.toLowerCase());
  return DOC_EXT.has(ext) || SCRIPT_EXT.has(ext) || TMP_EXT.has(ext);
}

/** Add /tmp/ to .git/info/exclude unless tmp/ is already ignored. */
export function ensureTmpIgnored(root: string): void {
  // check-ignore: 0 = ignored, 1 = not ignored, 128 = not a git repo
  if (git(root, "check-ignore", "-q", "tmp/x").status !== 1) return;
  const gitDir = git(root, "rev-parse", "--absolute-git-dir").out;
  if (!gitDir) return;
  try {
    const exclude = join(gitDir, "info", "exclude");
    mkdirSync(dirname(exclude), { recursive: true });
    const existing = existsSync(exclude) ? readFileSync(exclude, "utf8") : "";
    const lead = existing === "" || existing.endsWith("\n") ? "" : "\n";
    appendFileSync(exclude, `${lead}# added by claude organize-guard\n/tmp/\n`);
  } catch {
    // best effort
  }
}

/** Reason to deny the tool call, or null to let it through. */
export function denialReason(
  event: HookEvent,
  opts: GuardOptions = DEFAULT_OPTIONS,
): string | null {
  if (event.tool_name !== "Write") return null;
  const input = isRecord(event.tool_input) ? event.tool_input : {};
  if (typeof input.file_path !== "string" || input.file_path === "") return null;

  const cwd = typeof event.cwd === "string" && event.cwd !== "" ? event.cwd : process.cwd();
  const target = canonicalPath(input.file_path, cwd);
  if (existsSync(target)) return null; // overwriting an existing file is always fine

  // 1. Temp files go in the project's tmp/, not the system temp dir.
  if (opts.systemTmp.some((t) => isWithin(target, canonicalPath(t)))) {
    const root = projectRoot(canonicalPath(cwd), opts);
    if (!root || projectPatterns(root).includes("*")) return null;
    ensureTmpIgnored(root);
    return (
      `Temporary files for this project belong inside the repo, not ${dirname(target)}. ` +
      `Write it to ${join(root, "tmp", basename(target))} instead (tmp/ is git-ignored).`
    );
  }

  // 2. Keep new files out of the project root.
  const root = projectRoot(target, opts);
  if (!root) return null;
  const parts = relative(root, target).split(sep);
  if (parts[0] === "tmp" && parts.length > 1) {
    ensureTmpIgnored(root);
    return null;
  }
  if (parts.length !== 1) return null; // only the project root is policed

  const patterns = projectPatterns(root);
  if (patterns.includes("*")) return null;
  const name = basename(target);
  const lower = name.toLowerCase();
  if ([...ROOT_ALLOW, ...patterns].some((pattern) => globMatch(lower, pattern))) return null;
  if (!needsGuard(name)) return null;

  return [
    `Don't create loose files in the project root (${root}). Put '${name}' in one of:`,
    "  - docs/    notes, plans, reports, write-ups",
    "  - scripts/ reusable helper or maintenance scripts",
    "  - tmp/     scratch, debug, one-off tests, logs, output (git-ignored)",
    `Suggested: ${join(root, suggestDir(name), name)}`,
    "If this file genuinely belongs at the root (e.g. a project entrypoint), ask the user " +
      `to add a matching pattern to ${join(root, ".claude", "organize.allow")}.`,
  ].join("\n");
}

async function main(): Promise<void> {
  try {
    const event: unknown = JSON.parse(await readStdin());
    if (!isRecord(event)) return;
    const reason = denialReason(event);
    if (reason === null) return;
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: reason,
        },
      }),
    );
  } catch {
    // fail open
  }
}

if (import.meta.main) await main();
