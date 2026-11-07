#!/usr/bin/env node
/**
 * Accidental-use guardrails for agent hosts that load Claude-format hook files
 * (hooks.json): VS Code agent hooks read ~/.agents/hooks through
 * chat.hookFilesLocations, and plugin hosts run it from ${CLAUDE_PLUGIN_ROOT}.
 * Claude Code itself uses the guards in ~/.claude/hooks instead.
 *
 * Handles:
 *   - PreToolUse/Bash: rm, git add, git checkout/restore, git commit, .env access
 *   - PreToolUse/Read: direct reads of .env files
 *   - PreToolUse/Edit|Write: source-file length speed bump
 *   - UserPromptSubmit: >allow-git session toggles
 *
 * TypeScript port of the former safety-hook.sh, decision for decision. It is
 * self-contained (no imports outside .agents/hooks) so a plugin host can run
 * the directory on its own. Not a security boundary: see README.md.
 *
 * Environment: CLAUDE_HOOK_FLAG_DIR (default /tmp/claude), MAX_FILE_LINES
 * (default 10000), SHELL (whose rc file supplies first-token aliases).
 * Fails open: unreadable input or an exception approves.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export type HookOutput = Record<string, unknown>;

export interface HookContext {
  cwd: string;
  env: NodeJS.ProcessEnv;
  /** First-token aliases from the user's shell rc, loaded on first use. */
  aliases?: Map<string, string>;
}

const ALLOW_TRIGGER = ">allow-git";

const SOURCE_EXTENSIONS = new Set(
  "py ts tsx js jsx rs c cpp cc cxx h hpp go java kt swift rb php cs scala m mm r jl".split(" "),
);

/** First tokens checked as-is: alias lookup would only cost a shell spawn. */
const NO_ALIAS_LOOKUP = new Set([
  ..."git rm cat less more head tail grep rg find sed awk tee cp mv touch".split(" "),
  ..."nano vi vim emacs code subl atom gedit".split(" "),
]);

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A string field, with NUL bytes dropped as the shell did when reading it. */
function str(value: unknown): string {
  return typeof value === "string" ? value.replaceAll("\0", "") : "";
}

/**
 * The session ID as a flag-file suffix. One containing `/` is treated as
 * missing, so `path.join` can't resolve a flag outside the flag directory.
 */
function sessionIdOf(event: Record<string, unknown>): string {
  const id = str(event.session_id);
  return id.includes("/") ? "" : id;
}

/** Collapse whitespace runs and trim, line by line (newlines are kept). */
export function normalizeWs(s: string): string {
  return s
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n");
}

/** normalizeWs, split into lines: how the recognizer hands commands on. */
function normalizedLines(s: string): string[] {
  return normalizeWs(s).split("\n");
}

function flagDir(env: NodeJS.ProcessEnv): string {
  return env.CLAUDE_HOOK_FLAG_DIR || "/tmp/claude";
}

function maxFileLines(env: NodeJS.ProcessEnv): number {
  const raw = env.MAX_FILE_LINES ?? "";
  return /^-?\d+$/.test(raw) ? Number(raw) : 10000;
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function touch(path: string): void {
  try {
    writeFileSync(path, "");
  } catch {
    // best effort, like `: >file`
  }
}

/** The flag directory, created if possible (`mkdir -p … || true`). */
function ensureFlagDir(env: NodeJS.ProcessEnv): string {
  const dir = flagDir(env);
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    // best effort
  }
  return dir;
}

function isAllowed(flag: "staging" | "commit", sessionId: string, env: NodeJS.ProcessEnv): boolean {
  return sessionId !== "" && isFile(join(flagDir(env), `allow-git-${flag}.${sessionId}`));
}

function joinFirstFiles(files: string[], limit = 5): string {
  const shown = files.slice(0, limit).join(", ");
  return files.length > limit ? `${shown} (+${files.length - limit} more)` : shown;
}

function git(args: string[], ctx: HookContext): { ok: boolean; timedOut: boolean; stdout: string } {
  const res = spawnSync("git", args, {
    cwd: ctx.cwd,
    env: ctx.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 5000,
  });
  const timedOut = (res.error as NodeJS.ErrnoException | undefined)?.code === "ETIMEDOUT";
  return { ok: res.status === 0, timedOut, stdout: res.stdout ?? "" };
}

/** Two-character porcelain status of a path, or "" when clean/ignored/not a repo. */
function gitStatusCode(path: string, ctx: HookContext): string {
  const res = git(["status", "--porcelain", "--", path], ctx);
  if (res.timedOut) return " M"; // unverified: treat as modified so staging asks
  return res.stdout.split("\n")[0].slice(0, 2);
}

// ---------------------------------------------------------------------------
// Aliases
// ---------------------------------------------------------------------------

/** Parse `alias` output from bash (`alias k='v'`) or zsh (`k=v`, `k='v'`). First definition wins. */
export function parseAliases(output: string): Map<string, string> {
  const aliases = new Map<string, string>();
  for (let line of output.split("\n")) {
    if (line.startsWith("alias ")) line = line.slice(6);
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq);
    let value = line.slice(eq + 1);
    // Strip one pair of surrounding quotes.
    if (value.length >= 2 && (value[0] === "'" || value[0] === '"') && value.at(-1) === value[0]) {
      value = value.slice(1, -1);
    }
    if (!aliases.has(key)) aliases.set(key, value);
  }
  return aliases;
}

function loadAliases(ctx: HookContext): Map<string, string> {
  if (ctx.aliases) return ctx.aliases;
  const shell = ctx.env.SHELL || "/bin/bash";
  const script = shell.includes("zsh")
    ? "source ~/.zshrc 2>/dev/null; alias"
    : "source ~/.bashrc 2>/dev/null; source ~/.bash_aliases 2>/dev/null; alias";
  // One spawn per hook run, however many sub-commands need a lookup.
  const res = spawnSync(shell, ["-c", script], {
    cwd: ctx.cwd,
    env: ctx.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 8000,
  });
  ctx.aliases = parseAliases(res.stdout ?? "");
  return ctx.aliases;
}

export function expandAliasFirstToken(command: string, ctx: HookContext): string {
  const normalized = normalizeWs(command);
  if (!normalized) return "";
  const space = normalized.indexOf(" ");
  const first = space < 0 ? normalized : normalized.slice(0, space);
  const rest = space < 0 ? "" : normalized.slice(space + 1);
  if (NO_ALIAS_LOOKUP.has(first) || first.startsWith("/")) return normalized;
  const expansion = loadAliases(ctx).get(first);
  return expansion === undefined ? normalized : normalizeWs(`${expansion} ${rest}`);
}

// ---------------------------------------------------------------------------
// Command recognition
// ---------------------------------------------------------------------------

/**
 * Split on `;`, `|`, `&`, `&&`, `||` and newlines outside quotes. This is a
 * small command recognizer, not a shell parser. Newlines inside quotes also
 * end a line here, so each line of a quoted multi-line string is checked too.
 */
export function splitTopLevelCommands(command: string): string[] {
  const tokens: string[] = [];
  let token = "";
  let quote = "";
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (quote) {
      token += ch;
      if (ch === quote) quote = "";
      else if (ch === "\\" && quote === '"' && i + 1 < command.length) token += command[++i];
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      token += ch;
    } else if (ch === "\\") {
      token += ch;
      if (i + 1 < command.length) token += command[++i];
    } else if (ch === ";" || ch === "|" || ch === "&" || ch === "\n") {
      tokens.push(token);
      token = "";
      const next = command.slice(i, i + 2);
      if (next === "&&" || next === "||") i++;
    } else {
      token += ch;
    }
  }
  if (normalizeWs(token)) tokens.push(token);
  return tokens.flatMap(normalizedLines);
}

/** Bodies of balanced `$(…)` (nested ones via recursion) and of `…` backticks. */
export function extractSubshellCommands(command: string): string[] {
  const out: string[] = [];
  const len = command.length;
  for (let i = 0; i < len - 1; i++) {
    if (!command.startsWith("$(", i)) continue;
    const start = i + 2;
    let depth = 1;
    for (let j = start; j < len; j++) {
      if (command.startsWith("$(", j)) {
        depth++;
        j++;
      } else if (command[j] === ")" && --depth === 0) {
        out.push(...normalizedLines(command.slice(start, j)));
        i = j;
        break;
      }
    }
  }
  for (const line of command.split("\n")) {
    for (const m of line.matchAll(/`[^`]+`/g)) out.push(m[0].slice(1, -1));
  }
  return out;
}

/**
 * Drop grouping and compound-command keywords so `then git add .`, `do rm "$f"`,
 * `(rm x)` and `{ rm x` are checked as the command they wrap.
 */
export function stripCompoundPrefix(command: string): string {
  let cmd = command;
  let prev: string;
  do {
    prev = cmd;
    cmd = normalizeWs(cmd);
    if (cmd.startsWith("(")) cmd = cmd.slice(1);
    else if (cmd.startsWith("{ ") || cmd.startsWith("! ")) cmd = cmd.slice(2);
    else if (/^(if|then|elif|else|while|until|do|time) /.test(cmd)) {
      cmd = cmd.slice(cmd.indexOf(" ") + 1);
    }
  } while (cmd !== prev);
  // Closing parens of a `( … )` group, but not of `$(…)` or `fn()`.
  while (cmd.endsWith(")") && !cmd.includes("(")) cmd = normalizeWs(cmd.slice(0, -1));
  return cmd;
}

/** Every recognizable sub-command: top-level parts, then substitutions (5 levels deep). */
export function extractAllCommands(command: string, ctx: HookContext, depth = 0): string[] {
  if (depth > 5) return [];
  const out: string[] = [];
  for (const sub of splitTopLevelCommands(command)) {
    const stripped = stripCompoundPrefix(sub);
    if (stripped) out.push(expandAliasFirstToken(stripped, ctx));
  }
  for (const sub of extractSubshellCommands(command)) {
    if (sub) out.push(...extractAllCommands(sub, ctx, depth + 1));
  }
  return out.filter(Boolean);
}

// ---------------------------------------------------------------------------
// rm
// ---------------------------------------------------------------------------

const RM_REASON = `Instead of using 'rm':
- MOVE files using \`mv\` to the TRASH directory in the CURRENT folder (create it if needed),
- Add an entry in a markdown file called \`TRASH-FILES.md\` in the current directory, where you show a one-liner with the file name, where it moved, and the reason to trash it, e.g.:

\`\`\`text
test_script.py - moved to TRASH/ - temporary test script
data/junk.txt - moved to TRASH/ - data file we don't need
\`\`\``;

export function isRmCommand(command: string): boolean {
  const cmd = normalizeWs(command);
  return cmd === "rm" || cmd.startsWith("rm ") || /^\/\S*\/rm(\s|$)/.test(cmd);
}

// ---------------------------------------------------------------------------
// .env
// ---------------------------------------------------------------------------

const ENV_REASON = `Blocked: Direct access to \`.env\` files is not allowed for security reasons.

- Reading \`.env\` files could expose sensitive values
- Writing/editing \`.env\` files should be done manually outside Claude Code

For safe inspection, use the \`env-safe\` command:
- \`env-safe list\` - List all environment variable keys
- \`env-safe list --status\` - Show keys with defined/empty status
- \`env-safe check KEY_NAME\` - Check if a specific key exists
- \`env-safe count\` - Count variables in the file
- \`env-safe validate\` - Check \`.env\` file syntax
- \`env-safe --help\` - See all options

To modify \`.env\` files, please edit them manually outside of Claude Code.`;

const READ_ENV_REASON = `Blocked: Direct access to \`.env\` files is not allowed for security reasons.

Reading \`.env\` files could expose sensitive API keys, passwords, and secrets.

For safe inspection, use the \`env-safe\` command in Bash:
- \`env-safe list\` - List all environment variable keys
- \`env-safe list --status\` - Show keys with defined/empty status
- \`env-safe check KEY_NAME\` - Check if a specific key exists

To view \`.env\` contents, please do so manually outside of Claude Code.`;

/**
 * Commands that may mention .env in prose (messages, titles) without reading
 * it. The trailing lookahead is a Unicode-aware `\b`, as GNU grep's is.
 */
const ENV_EXEMPT = /^(git\s+(commit|tag)|gh\s+(pr|issue|release)\s+create)(?![\p{L}\p{N}_])/iu;

/** A .env-like name ending at whitespace or the end of its span. */
const ENV_NAME = /\.env[.A-Za-z0-9_-]*(?:\s|$)/gi;
const FILE_COMMAND =
  /(?:^|\s)(?:cat|less|more|head|tail|nano|vi|vim|emacs|code|subl|atom|gedit|grep|rg|ag|ack|tee|cp|mv|touch)\s/gi;

/**
 * Patterns of the form `(^|[\s;|&])cmd\s[^;|&]*A[^;|&]*B…`, as steps matched
 * in order inside one `;|&`-free span. Taking each step's earliest match is
 * equivalent and linear, where the single backtracking regex is cubic on
 * crafted input (and a hook timeout fails open).
 */
const ENV_SEQUENCES: RegExp[][] = [
  // cat/less/…/touch … .env*
  [FILE_COMMAND, ENV_NAME],
  // find … -name .env*
  [/(?:^|\s)find\s/gi, /-name\s+["']?\.env/gi],
  // sed … -i … .env*
  [/(?:^|\s)sed\s/gi, /-i/gi, ENV_NAME],
];

const ENV_PATTERNS: RegExp[] = [
  // Redirection into .env* (also covers `echo|printf|awk … > .env`).
  /(>|>>)\s*\.env([.A-Za-z0-9_-]*)($|[\s;|&])/i,
  // Bare `env` file reads/writes, but only for obvious file-access commands.
  /(^|[\s;|&])(cat|less|more|head|tail)\s+["']?env["']?($|[\s;|&])|(>|>>)\s*["']?env["']?($|[\s;|&])/i,
];

function matchesInOrder(span: string, steps: RegExp[]): boolean {
  let from = 0;
  for (const step of steps) {
    step.lastIndex = from;
    const m = step.exec(span);
    if (!m) return false;
    from = m.index + m[0].length;
  }
  return true;
}

/** True when one sub-command reads or writes a .env file. The exemption covers only that sub-command. */
export function isEnvAccess(command: string): boolean {
  const norm = normalizeWs(command);
  if (ENV_EXEMPT.test(norm)) return false;
  const spans = norm.split(/[;|&]/);
  return (
    ENV_SEQUENCES.some((steps) => spans.some((span) => matchesInOrder(span, steps))) ||
    ENV_PATTERNS.some((re) => re.test(norm))
  );
}

export function isEnvPath(filePath: string): boolean {
  const base = (filePath.split("/").pop() ?? "").toLowerCase();
  return base === ".env" || base.startsWith(".env.");
}

// ---------------------------------------------------------------------------
// git
// ---------------------------------------------------------------------------

const GIT_ADD_WILDCARD_REASON = `BLOCKED: Wildcard patterns are not allowed in git add!

DO NOT use wildcards like \`git add *.py\` or \`git add *\`

Instead, use:
- \`git add <specific-files>\` to stage specific files
- \`git ls-files -m "*.py" | xargs git add\` if you really need pattern matching

This restriction prevents accidentally staging unwanted files.`;

const GIT_ADD_DANGER_REASON = `BLOCKED: Dangerous git add pattern detected!

DO NOT use:
- \`git add -A\`, \`git add -a\`, \`git add --all\` (adds ALL files)
- \`git add .\` (adds entire current directory)
- \`git add ../\` or similar parent directory patterns
- \`git add *\` (wildcard patterns)

Instead, use:
- \`git add <specific-files>\` to stage specific files
- \`git add <specific-directory>/\` to stage a specific directory with confirmation
- \`git add -u\` to stage all modified/deleted files, but not untracked

This restriction prevents accidentally staging unwanted files.`;

const COMMIT_A_REASON =
  'Avoid `git commit -a` without a message flag. Use `gcam "message"` instead, which is an alias for `git commit -a -m`.';

function destructiveCheckoutReason(detail: string): string {
  return `DANGEROUS COMMAND DETECTED!\n\n${detail}\n\nThis command can destroy uncommitted work. Inspect \`git diff\` or save work with \`git stash\` first.`;
}

/**
 * Drop common Git global options so policy checks see the subcommand
 * (`git -C dir add .` → `git add .`). Wrappers such as sudo/env/bash are
 * intentionally unsupported.
 */
export function canonicalizeGitCommand(raw: string): string {
  const norm = normalizeWs(raw);
  const parts = norm.split(" ");
  if (parts[0] !== "git") return norm;
  let i = 1;
  while (i < parts.length) {
    const part = parts[i];
    if (["-C", "-c", "--git-dir", "--work-tree", "--namespace"].includes(part)) i += 2;
    else if (
      /^--(git-dir|work-tree|namespace)=/.test(part) ||
      ["--no-pager", "--paginate", "--literal-pathspecs", "--no-optional-locks"].includes(part)
    ) {
      i += 1;
    } else break;
  }
  return ["git", ...parts.slice(i)].join(" ");
}

/**
 * True when a `git commit` stages everything (-a/--all, including clustered
 * short flags) and supplies no message source. Message sources (-m, -F, -C,
 * -c, --message, --file, --reuse-message, --reedit-message, --no-edit) keep git
 * from opening an editor. Parsing stops at `--`. In a short-flag cluster, the
 * first option that takes an argument consumes the rest of the cluster
 * (`-aFmsg.txt` is -a -F msg.txt), so only flags before it count.
 */
export function commitStagesAllWithoutMessage(norm: string): boolean {
  let all = false;
  let msg = false;
  for (const part of norm.split(" ").slice(2)) {
    if (part === "--") break;
    if (part === "--all") all = true;
    else if (
      /^--(message|file|reuse-message|reedit-message)(=.*)?$/.test(part) ||
      part === "--no-edit"
    ) {
      msg = true;
    } else if (part.startsWith("--")) continue;
    else if (part.length > 1 && part.startsWith("-")) {
      for (const ch of part.slice(1)) {
        if (ch === "a") all = true;
        else if ("mFCc".includes(ch)) {
          msg = true;
          break;
        } else if ("tuS".includes(ch)) break;
      }
    }
  }
  return all && !msg;
}

type Finding = { kind: "deny" | "ask"; reason: string };

function gitAddDirectoryArg(parts: string[]): string | null {
  let prev = "";
  for (const part of parts) {
    if (prev === "add" && !part.startsWith("-") && part.endsWith("/")) return part.slice(0, -1);
    prev = part;
  }
  return null;
}

function modifiedFilesForArgs(parts: string[], ctx: HookContext): string[] {
  const addAt = parts.indexOf("add");
  if (addAt < 0) return [];
  return parts.slice(addAt + 1).filter((part) => {
    if (part.startsWith("-")) return false;
    const status = gitStatusCode(part, ctx);
    return status !== "" && !status.includes("?");
  });
}

export function checkGitAdd(raw: string, sessionId: string, ctx: HookContext): Finding | null {
  const norm = canonicalizeGitCommand(raw);
  const isAdd = norm.startsWith("git add ");
  if (!isAdd && !norm.startsWith("git commit ")) return null;

  // Always allow dry-run probes. `-n` is --dry-run only for `git add`; for
  // `git commit` it means --no-verify, so commit dry-runs need --dry-run.
  if (norm.includes("--dry-run")) return null;
  if (isAdd && /(^|\s)-n($|\s)/.test(norm)) return null;

  if (isAdd && norm.includes("*")) return { kind: "deny", reason: GIT_ADD_WILDCARD_REASON };

  if (
    isAdd &&
    (/(^|\s)-[A-Za-z]*[Aa][A-Za-z]*($|\s)/.test(norm) ||
      /(^|\s)--all($|\s)/.test(norm) ||
      /(^|\s)\.($|\s)/.test(norm) ||
      /(^|\s)\.\.\/\S*($|\s)/.test(norm))
  ) {
    return { kind: "deny", reason: GIT_ADD_DANGER_REASON };
  }

  if (!isAdd) {
    return commitStagesAllWithoutMessage(norm) ? { kind: "deny", reason: COMMIT_A_REASON } : null;
  }

  const parts = norm.split(" ");
  const dir = gitAddDirectoryArg(parts);
  if (dir !== null) {
    const dry = git(["add", "--dry-run", "--", `${dir}/`], ctx);
    if (!dry.ok) {
      return { kind: "ask", reason: `Staging directory ${dir}/ (couldn't verify file status)` };
    }
    const files = dry.stdout
      .split("\n")
      .filter((line) => line.startsWith("add "))
      .map((line) => line.slice(4).replace(/^'/, "").replace(/'$/, ""))
      .filter(Boolean);
    const modified = files.filter((file) => !gitStatusCode(file, ctx).includes("?"));
    if (modified.length === 0 || isAllowed("staging", sessionId, ctx.env)) return null;
    return {
      kind: "ask",
      reason: `Staging directory ${dir}/ with modified files: ${joinFirstFiles(modified)}`,
    };
  }

  const modified = modifiedFilesForArgs(parts, ctx);
  if (modified.length === 0 || isAllowed("staging", sessionId, ctx.env)) return null;
  return { kind: "ask", reason: `Staging modified files: ${joinFirstFiles(modified)}` };
}

export function checkGitCheckout(raw: string): Finding | null {
  const norm = canonicalizeGitCommand(raw);
  if (!norm.startsWith("git checkout")) return null;
  const deny = (detail: string): Finding => ({
    kind: "deny",
    reason: destructiveCheckoutReason(detail),
  });
  if (/(^|\s)(-f|--force)($|\s)/.test(norm)) {
    return deny("`git checkout --force` discards uncommitted changes.");
  }
  if (/^git\s+checkout\s+\.($|\s)/.test(norm)) {
    return deny("`git checkout .` discards changes in the current directory.");
  }
  if (/^git\s+checkout\s.*\s--\s+/.test(norm)) {
    return deny("`git checkout <tree-ish> -- <paths>` overwrites local paths.");
  }
  // Ordinary branch switching is left to Git's own overwrite checks. A dirty
  // tree or a non-Git directory is not, by itself, a reason to deny checkout.
  return null;
}

export function checkGitRestore(raw: string): Finding | null {
  const norm = canonicalizeGitCommand(raw);
  if (!norm.startsWith("git restore")) return null;
  if (/(^|\s)--help($|\s)/.test(norm)) return null;
  if (/(^|\s)--staged($|\s)/.test(norm) && !/(^|\s)--worktree($|\s)/.test(norm)) return null;
  return {
    kind: "deny",
    reason: destructiveCheckoutReason("`git restore` discards working-tree changes."),
  };
}

export function checkGitCommit(
  raw: string,
  sessionId: string,
  env: NodeJS.ProcessEnv,
): Finding | null {
  const norm = canonicalizeGitCommand(raw);
  if (!norm.startsWith("git commit") || isAllowed("commit", sessionId, env)) return null;
  return { kind: "ask", reason: "Git commit requires your approval." };
}

// ---------------------------------------------------------------------------
// File length
// ---------------------------------------------------------------------------

export function isSourceFile(filePath: string): boolean {
  const base = filePath.slice(filePath.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return dot >= 0 && SOURCE_EXTENSIONS.has(base.slice(dot + 1).toLowerCase());
}

/** Line count as the shell saw it: trailing newlines dropped, a final partial line counted. */
export function lineCount(content: string): number {
  const trimmed = content.replace(/\n+$/, "");
  return trimmed === "" ? 0 : trimmed.split("\n").length;
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  for (
    let at = haystack.indexOf(needle);
    at >= 0;
    at = haystack.indexOf(needle, at + needle.length)
  ) {
    count++;
  }
  return count;
}

export function resultingLineCount(
  toolName: string,
  filePath: string,
  input: Record<string, unknown>,
  cwd: string,
): number {
  if (toolName === "Write") return lineCount(str(input.content));
  if (toolName !== "Edit") return 0;
  const path = resolve(cwd, filePath);
  if (!isFile(path)) return 0; // also keeps a FIFO from blocking the read
  let current: string;
  try {
    current = readFileSync(path, "utf8");
  } catch {
    return 0; // missing, unreadable or not a regular file
  }
  const oldString = str(input.old_string);
  const newString = str(input.new_string);
  const currentLines = lineCount(current);
  if (oldString === "") return currentLines;
  const replaceAll = input.replace_all === true || input.replace_all === "true";
  const occurrences = replaceAll ? Math.max(1, countOccurrences(current, oldString)) : 1;
  const resulting = currentLines + occurrences * (lineCount(newString) - lineCount(oldString));
  return Math.max(0, resulting);
}

export function checkFileLength(
  toolName: string,
  filePath: string,
  input: Record<string, unknown>,
  sessionId: string,
  ctx: HookContext,
): string | null {
  if (toolName !== "Edit" && toolName !== "Write") return null;
  if (!isSourceFile(filePath)) return null;
  const max = maxFileLines(ctx.env);
  const resulting = resultingLineCount(toolName, filePath, input, ctx.cwd);
  if (resulting <= max) return null;

  // Speed bump: deny once, then let the identical retry through.
  const flag = join(ensureFlagDir(ctx.env), `file-length-warning.${sessionId || "global"}`);
  if (isFile(flag)) {
    rmSync(flag, { force: true });
    return null;
  }
  touch(flag);

  return `**File length limit exceeded (${resulting} lines > ${max} lines).**

The resulting file \`${filePath}\` would be ${resulting} lines long.

To maintain code quality and modularity, files should be kept under ${max} lines.

**Please pause and ask the user:**
"This operation would create a file with ${resulting} lines. Would you like me to:
1. Refactor the code into smaller, more modular files?
2. Proceed with the large file anyway?"

**Only retry this operation if the user approves proceeding with the large file.**
Otherwise, work on refactoring the code into smaller modules.`;
}

// ---------------------------------------------------------------------------
// UserPromptSubmit: >allow-git
// ---------------------------------------------------------------------------

function blockPrompt(reason: string): HookOutput {
  return { decision: "block", reason };
}

export function handleUserPrompt(
  event: Record<string, unknown>,
  env: NodeJS.ProcessEnv,
): HookOutput | null {
  const sessionId = sessionIdOf(event);
  const rawPrompt = typeof event.prompt === "string" ? event.prompt : str(event.user_prompt);
  const prompt = normalizeWs(rawPrompt.toLowerCase()).replace(/\n+$/, "");

  if (prompt !== ALLOW_TRIGGER && !prompt.startsWith(`${ALLOW_TRIGGER} `)) return null;
  if (!sessionId) return blockPrompt("No session ID available.");

  const dir = ensureFlagDir(env);
  const flag = (name: string) => join(dir, `allow-git-${name}.${sessionId}`);
  const restore = "Use >allow-git off to restore approval prompts.";
  const arg = normalizeWs(prompt.slice(ALLOW_TRIGGER.length));

  switch (arg) {
    case "off":
      rmSync(flag("staging"), { force: true });
      rmSync(flag("commit"), { force: true });
      return blockPrompt("Git approval prompts restored.");
    case "staging":
    case "commit":
      touch(flag(arg));
      return blockPrompt(`Git ${arg} allowed for this session.\n${restore}`);
    case "status": {
      const active = ["staging", "commit"].filter((name) => isFile(flag(name)));
      return blockPrompt(
        active.length
          ? `Active: ${active.join(", ")}\nUse >allow-git off to restore prompts.`
          : "All git operations require approval.",
      );
    }
    default:
      touch(flag("staging"));
      touch(flag("commit"));
      return blockPrompt(`Git staging and commit allowed for this session.\n${restore}`);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const APPROVE: HookOutput = { decision: "approve" };

function permission(decision: "deny" | "ask", reason: string): HookOutput {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: decision,
      permissionDecisionReason: reason,
    },
  };
}

function bashFindings(command: string, sessionId: string, ctx: HookContext): Finding[] {
  // Split once: alias expansion may spawn the user's shell.
  const subs = extractAllCommands(command, ctx);
  const findings: Finding[] = [];
  if (subs.some(isRmCommand)) findings.push({ kind: "deny", reason: RM_REASON });
  if (subs.some(isEnvAccess)) findings.push({ kind: "deny", reason: ENV_REASON });
  for (const sub of subs) {
    for (const finding of [
      checkGitAdd(sub, sessionId, ctx),
      checkGitCheckout(sub),
      checkGitRestore(sub),
      checkGitCommit(sub, sessionId, ctx.env),
    ]) {
      if (finding) findings.push(finding);
    }
  }
  return findings;
}

/** Evaluate one raw hook payload. Returns the JSON to print, or null to print nothing. */
export function evaluate(raw: string, ctx: HookContext): HookOutput | null {
  let event: unknown;
  try {
    event = JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch {
    return APPROVE;
  }
  if (!isRecord(event)) return APPROVE;

  const hookEvent = str(event.hook_event_name);
  const toolName = str(event.tool_name);
  const sessionId = sessionIdOf(event);
  const input = isRecord(event.tool_input) ? event.tool_input : {};

  if (hookEvent === "UserPromptSubmit" || (toolName === "" && raw.includes(ALLOW_TRIGGER))) {
    return handleUserPrompt(event, ctx.env);
  }

  let findings: Finding[];
  switch (toolName) {
    case "Bash": {
      const command = str(input.command);
      if (!command) return APPROVE;
      findings = bashFindings(command, sessionId, ctx);
      break;
    }
    case "Read":
      findings = isEnvPath(str(input.file_path)) ? [{ kind: "deny", reason: READ_ENV_REASON }] : [];
      break;
    case "Edit":
    case "Write": {
      const reason = checkFileLength(toolName, str(input.file_path), input, sessionId, ctx);
      findings = reason ? [{ kind: "deny", reason }] : [];
      break;
    }
    default:
      return APPROVE;
  }

  const denies = findings.filter((f) => f.kind === "deny").map((f) => f.reason);
  if (denies.length === 1) return permission("deny", denies[0]);
  if (denies.length > 1) {
    const list = denies.map((reason, i) => `${i + 1}. ${reason}\n\n`).join("");
    return permission("deny", `Multiple safety checks failed:\n\n${list}`);
  }
  const asks = findings.filter((f) => f.kind === "ask").map((f) => f.reason);
  if (asks.length === 1) return permission("ask", asks[0]);
  if (asks.length > 1) return permission("ask", `Approval required: ${asks.join("; ")}`);
  return APPROVE;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

if (import.meta.main) {
  let output: HookOutput | null = APPROVE;
  try {
    output = evaluate(await readStdin(), { cwd: process.cwd(), env: process.env });
  } catch {
    // fail open
  }
  if (output) process.stdout.write(`${JSON.stringify(output)}\n`);
}
