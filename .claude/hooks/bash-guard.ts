#!/usr/bin/env node
/**
 * PreToolUse hook for Bash: a catch-net for dangerous or credential-leaking
 * shell commands.
 *
 * Adapted from the dwarvesf/claude-guardrails PreToolUse hooks (destructive
 * delete, pipe-to-shell, exfiltration hosts, permission escalation,
 * scan-commit.sh) and the old ~/.claude/hooks/security-guard.ts.
 *
 * Denied (Claude is told why and asked to leave it to the user):
 *  - piping or substituting a download into a shell or interpreter;
 *  - recursive rm of /, a system dir, $HOME, an ancestor of $HOME, or the
 *    working directory or one of its parents;
 *  - starting a coding agent with its permission checks or hooks disabled;
 *  - commands that mention known request-capture or exfiltration hosts;
 *  - shell reads of private keys and credential files (ssh, gpg, age, cloud
 *    and package-manager credentials, .env files);
 *  - `git commit` whose staged diff contains a vendor-format credential.
 *
 * Asked (the user confirms in the permission prompt):
 *  - force or destructive git push;
 *  - git commands that discard uncommitted work (reset --hard, clean -f,
 *    checkout/restore of paths, stash drop/clear);
 *  - `git commit` whose diff has a heuristic secret match.
 *
 * Pattern matching over shell text is best-effort and can be evaded by
 * wrappers, scripts, or obfuscation: the sandbox and permission rules are the
 * boundary. Any internal error allows the command: this hook fails open.
 *
 * Runs on Node's built-in TypeScript type stripping (erasable syntax only).
 */

import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { findSecrets, formatFindings } from "./secret-guard.ts";
import { isRecord, readStdin } from "./lib/hook-io.ts";

const HOME = homedir();

interface HookEvent {
  cwd?: unknown;
  tool_input?: unknown;
  tool_name?: unknown;
}

export interface Verdict {
  decision: "deny" | "ask";
  reason: string;
}

// ---------------------------------------------------------------------------
// Shell text helpers (a small recognizer, not a parser)
// ---------------------------------------------------------------------------

/** Split on unquoted ; & | ( ) and newlines, plus the bodies of `...` substitutions. */
export function segments(command: string): string[] {
  const out: string[] = [];
  let token = "";
  let quote = "";
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (quote) {
      token += ch;
      if (ch === quote) quote = "";
      else if (ch === "\\" && quote === '"' && i + 1 < command.length) token += command[++i];
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      token += ch;
    } else if (ch === "\\" && i + 1 < command.length) {
      token += ch + command[++i];
    } else if (ch === ";" || ch === "&" || ch === "|" || ch === "\n" || ch === "(" || ch === ")") {
      out.push(token);
      token = "";
    } else {
      token += ch;
    }
  }
  out.push(token);
  // $(...) bodies are already split out by the parens above; backtick bodies are not.
  for (const [, inner] of command.matchAll(/`([^`]*)`/g)) out.push(...segments(inner));
  return out.map((s) => s.trim()).filter(Boolean);
}

/** Whitespace-split words with surrounding quotes removed. */
function words(segment: string): string[] {
  return (segment.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map((w) =>
    w.replace(/^(["'])(.*)\1$/, "$2"),
  );
}

/** Words after leading VAR=value assignments and sudo/env/command/exec/nice/time wrappers. */
function commandWords(segment: string): string[] {
  const all = words(segment);
  let i = 0;
  while (i < all.length) {
    const w = all[i];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w)) i++;
    else if (
      ["sudo", "doas", "env", "command", "exec", "nice", "nohup", "time", "builtin"].includes(w)
    ) {
      i++;
      while (i < all.length && all[i].startsWith("-")) i++;
    } else break;
  }
  return all.slice(i);
}

function baseName(word: string): string {
  return word.slice(word.lastIndexOf("/") + 1);
}

function expandPath(raw: string, cwd: string): string {
  const expanded = raw
    .replace(/^~(?=\/|$)/, HOME)
    .replace(/^\$\{HOME\}(?=\/|$)/, HOME)
    .replace(/^\$HOME(?=\/|$)/, HOME);
  return resolve(isAbsolute(expanded) ? expanded : join(cwd, expanded));
}

function isWithin(path: string, root: string): boolean {
  const rel = relative(root, path);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

// ---------------------------------------------------------------------------
// Inert text: data that is quoted or written to a file, never executed
// ---------------------------------------------------------------------------

/** Commands that only write a heredoc to stdout or a file. */
const HEREDOC_SINKS = new Set(["cat", "tee"]);
/** Commands that may share a heredoc's line without running its body as a program. */
const HEREDOC_NEIGHBORS = new Set([
  ...HEREDOC_SINKS,
  "echo",
  "printf",
  "true",
  ":",
  "mkdir",
  "chmod",
]);

const MESSAGE_FLAG = String.raw`(?:-[A-Za-z]*[mbtn]|--(?:message|body|title|notes))`;
const SUBSTITUTION = /\$\(|`|<\(|>\(/;

/** A git commit/tag or gh pr/issue/release write: its message arguments are data. */
function hasMessageArgs(segment: string): boolean {
  const git = gitArgs(segment);
  if (git) return git[0] === "commit" || git[0] === "tag";
  const argv = commandWords(segment);
  return (
    argv.length >= 3 &&
    baseName(argv[0]) === "gh" &&
    ["pr", "issue", "release"].includes(argv[1]) &&
    ["create", "edit", "comment"].includes(argv[2])
  );
}

/** Blank quoted message values, unless a double-quoted one runs a substitution. */
function scrubMessages(segment: string): string {
  const re = new RegExp(String.raw`(\s${MESSAGE_FLAG}(?:\s+|=))("(?:[^"\\]|\\.)*"|'[^']*')`, "g");
  return segment.replace(re, (whole, flag: string, value: string) =>
    value.startsWith('"') && SUBSTITUTION.test(value) ? whole : `${flag}""`,
  );
}

/** Whether a heredoc opened after `prefix` and followed by `suffix` only feeds a writer. */
function inertHeredoc(prefix: string, suffix: string): boolean {
  if (suffix.includes("`")) return false;
  let tail = prefix;
  const sub = prefix.lastIndexOf("$(");
  if (sub >= 0) {
    // `-m "$(cat <<'EOF' ... EOF)"` is data only as the value of a message flag.
    const head = prefix.slice(0, sub);
    const flagged = new RegExp(String.raw`\s${MESSAGE_FLAG}(?:\s+|=)"$`).test(head);
    const owner = segments(`${head}"`).at(-1) ?? "";
    return flagged && hasMessageArgs(owner) && /^\s*cat\s*$/.test(prefix.slice(sub + 2));
  }
  if ((tail.match(/['"`]/g) ?? []).length % 2 === 1) return false; // inside a quoted string
  const owner = commandWords(segments(tail).at(-1) ?? "")[0];
  if (!owner || !HEREDOC_SINKS.has(baseName(owner))) return false;
  // Whatever else is chained on the same line must not execute the body either.
  const rest = suffix
    .replace(/\d*[<>]&\d*-?/g, "")
    .split(/[;&|()]+/)
    .slice(1);
  return rest.every((piece) => {
    const word = commandWords(piece.trim())[0];
    return word === undefined || /^[^A-Za-z0-9_./~$-]/.test(word) || HEREDOC_NEIGHBORS.has(word);
  });
}

/** Drop heredoc bodies that are only written out (cat/tee); bodies fed to anything else stay. */
export function stripHeredocs(command: string): string {
  const lines = command.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i++];
    out.push(line);
    for (const op of line.matchAll(/(?<!<)<<(-?)\s*(["']?)([A-Za-z_][\w-]*)\2/g)) {
      const end = lines.findIndex(
        (l, n) => n >= i && (op[1] ? l.replace(/^\t+/, "") : l) === op[3],
      );
      if (end < 0) break; // unterminated: leave everything in place
      const body = lines.slice(i, end);
      // An unquoted delimiter lets the body run $(...) and backticks.
      const expands = op[2] === "" && SUBSTITUTION.test(body.join("\n"));
      const rest = line.slice(op.index + op[0].length);
      if (expands || !inertHeredoc(line.slice(0, op.index), rest)) out.push(...body);
      out.push(lines[end]);
      i = end + 1;
    }
  }
  return out.join("\n");
}

/** The command minus inert data, for the rules that scan raw text. */
export function scrubInert(command: string): string {
  let scrubbed = stripHeredocs(command);
  for (const segment of segments(scrubbed)) {
    if (!hasMessageArgs(segment)) continue;
    const clean = scrubMessages(segment);
    if (clean !== segment) scrubbed = scrubbed.split(segment).join(clean);
  }
  return scrubbed;
}

// ---------------------------------------------------------------------------
// Deny rules
// ---------------------------------------------------------------------------

const SHELLS = String.raw`(?:sudo\s+(?:-\S+\s+)*)?(?:\S*/)?(?:ba|z|da|k|fi|c|tc)?sh|(?:\S*/)?(?:python[0-9.]*|node|perl|ruby|php|deno|bun)`;
const DOWNLOADERS = String.raw`curl|wget|fetch`;
/** The interpreter runs its program from stdin: no arguments, or only "-", "-s" or "--". */
const FROM_STDIN = String.raw`\s*(?:$|[;&|)]|\s-(?:-|s)?(?=\s|$))`;

const PIPE_TO_SHELL = [
  new RegExp(String.raw`\b(?:${DOWNLOADERS})\b[^\n;&]*\|\s*(?:${SHELLS})(?=${FROM_STDIN})`),
  new RegExp(String.raw`(?:^|[\s;&|(])(?:${SHELLS})\s+(?:-\S+\s+)*<\(\s*(?:${DOWNLOADERS})\b`),
  new RegExp(String.raw`(?:^|[\s;&|(])(?:${SHELLS})\s+-c\s+["']?\$\(\s*(?:${DOWNLOADERS})\b`),
  new RegExp(String.raw`\b(?:eval|source|\.)\s+["']?(?:\$\(|<\()\s*(?:${DOWNLOADERS})\b`),
];

const AGENT_BYPASS =
  /\b(?:claude|codex|gemini|opencode|pi)\b[^\n;&|]*(?:--dangerously-skip-permissions|--allow-dangerously-skip-permissions|--permission-mode[=\s]+["']?bypassPermissions|--dangerously-bypass-approvals-and-sandbox|--yolo\b|disableAllHooks)/;

const EXFIL_HOSTS =
  /\b(?:webhook\.site|requestbin\.(?:com|net)|pipedream\.net|(?:[a-z0-9-]+\.)?ngrok(?:-free)?\.(?:io|app|dev)|interact\.sh|oast\.(?:fun|me|pro|live|site|online)|oastify\.com|burpcollaborator\.net|canarytokens\.(?:com|org)|hookbin\.com|beeceptor\.com|requestcatcher\.com|transfer\.sh|0x0\.st|termbin\.com|ptpb\.pw)\b/i;

/** Credential files, with the commands that legitimately take them as an argument. */
const SECRET_PATHS: { re: RegExp; label: string; users: string[] }[] = [
  {
    re: /\.ssh\/id_[A-Za-z0-9_-]+(?!\.pub)(?![A-Za-z0-9_.-])/,
    label: "an SSH private key",
    users: ["ssh", "ssh-add", "ssh-keygen", "scp", "sftp"],
  },
  { re: /\.gnupg\/(?:private-keys|secring)/, label: "the GnuPG private keyring", users: [] },
  { re: /\bgpg-secret\.asc\b/, label: "an exported GnuPG secret key", users: [] },
  {
    re: /\bage-key\.txt\b|\.config\/sops\/age\/keys\.txt/,
    label: "an age secret key",
    users: ["age", "rage", "sops"],
  },
  { re: /\.aws\/credentials\b/, label: "AWS credentials", users: ["aws"] },
  { re: /\.claude\/\.credentials\.json\b/, label: "Claude Code credentials", users: [] },
  { re: /\.git-credentials\b/, label: "stored git credentials", users: ["git"] },
  { re: /(?:~|\$HOME|\$\{HOME\}|\/home\/[^/\s]+)\/\.netrc\b/, label: "a .netrc file", users: [] },
  { re: /\.config\/gh\/hosts\.yml\b/, label: "GitHub CLI tokens", users: ["gh"] },
  { re: /\.kube\/config\b/, label: "a kubeconfig", users: ["kubectl", "helm", "k9s", "kubectx"] },
  {
    re: /\.docker\/config\.json\b/,
    label: "Docker registry credentials",
    users: ["docker", "podman"],
  },
  {
    re: /(?:~|\$HOME|\$\{HOME\}|\/home\/[^/\s]+)\/\.(?:npmrc|pypirc)\b/,
    label: "package registry credentials",
    users: ["npm", "pnpm", "yarn", "twine", "pip"],
  },
  {
    re: /(?:^|[\s/"'=])\.env(?:\.(?:local|production|prod|staging|development|dev)(?:\.local)?)?(?=$|[\s"';|&)])/,
    label: "a .env file",
    users: ["dotenv", "dotenvx", "docker", "direnv", "cp", "mv", "source", "."],
  },
];

/** Commands that name a path without reading it (`echo .env >> .gitignore` is fine). */
const LIST_ONLY = new Set([
  "echo",
  "printf",
  "ls",
  "stat",
  "test",
  "[",
  "file",
  "chmod",
  "chown",
  "touch",
  "mkdir",
  "realpath",
  "readlink",
  "du",
  "which",
]);

/** System paths a recursive rm should never target. */
const SYSTEM_DIRS = [
  "/",
  "/bin",
  "/boot",
  "/dev",
  "/etc",
  "/home",
  "/lib",
  "/lib64",
  "/mnt",
  "/opt",
  "/proc",
  "/root",
  "/run",
  "/sbin",
  "/srv",
  "/sys",
  "/usr",
  "/var",
];

function rmViolation(segment: string, cwd: string): string | null {
  const argv = commandWords(segment);
  if (argv.length === 0 || baseName(argv[0]) !== "rm") return null;
  const args = argv.slice(1);
  if (args.includes("--no-preserve-root")) return "rm --no-preserve-root";
  const recursive = args.some((a) => /^-[a-zA-Z]*[rR]/.test(a) || a === "--recursive");
  if (!recursive) return null;
  let endOfOpts = false;
  for (const arg of args) {
    if (!endOfOpts && arg === "--") {
      endOfOpts = true;
      continue;
    }
    if (!endOfOpts && arg.startsWith("-")) continue;
    if (/[*?[]/.test(arg)) {
      const parent = expandPath(dirname(arg), cwd);
      const last = arg.slice(arg.lastIndexOf("/") + 1);
      // A bare wildcard (`*`, `.*`) deletes the directory's contents: judge the directory.
      // A partial glob (`*.o`, `build*`) only deletes matching entries, so it is dangerous
      // when the directory holds something protected: a system dir, $HOME or an ancestor
      // of it, or a strict ancestor of the working directory.
      const protectedHit = /^\.?[*?]+$/.test(last)
        ? SYSTEM_DIRS.includes(parent) || isWithin(HOME, parent) || isWithin(cwd, parent)
        : SYSTEM_DIRS.includes(parent) ||
          isWithin(HOME, parent) ||
          (isWithin(cwd, parent) && parent !== cwd);
      if (protectedHit) return `rm -r ${arg} (globs in ${parent})`;
      continue;
    }
    const target = expandPath(arg, cwd);
    const protectedHit =
      SYSTEM_DIRS.includes(target) ||
      isWithin(HOME, target) || // $HOME or one of its ancestors
      isWithin(cwd, target); // the working directory or one of its ancestors
    if (protectedHit) return `rm -r ${arg} (resolves to ${target})`;
  }
  return null;
}

function secretPathViolation(segment: string): string | null {
  const argv = commandWords(segment);
  if (argv.length === 0) return null;
  const cmd = baseName(argv[0]);
  // `echo "$(cat .env)"` stays one segment (quoted), so a substitution or input redirect
  // inside a list-only command still reads the file.
  const listOnly = LIST_ONLY.has(cmd) && !/\$\(|`|</.test(segment);
  for (const { re, label, users } of SECRET_PATHS) {
    if (!re.test(segment)) continue;
    if (listOnly || users.includes(cmd)) continue;
    if (cmd === "git" && label !== "stored git credentials") continue;
    return label;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Ask rules
// ---------------------------------------------------------------------------

function gitArgs(segment: string): string[] | null {
  const argv = commandWords(segment);
  if (argv.length === 0 || baseName(argv[0]) !== "git") return null;
  let i = 1;
  while (i < argv.length && argv[i].startsWith("-"))
    i += ["-C", "-c", "--git-dir", "--work-tree", "--namespace"].includes(argv[i]) ? 2 : 1;
  return argv.slice(i);
}

/** -C <dir> from git's global options, resolved against cwd. */
function gitDir(segment: string, cwd: string): string {
  const argv = commandWords(segment);
  let dir = cwd;
  for (let i = 1; i < argv.length && argv[i].startsWith("-"); i++) {
    if (argv[i] === "-C" && argv[i + 1]) dir = expandPath(argv[++i], dir);
    else if (["-c", "--git-dir", "--work-tree", "--namespace"].includes(argv[i])) i++;
  }
  return dir;
}

function gitAsk(args: string[]): string | null {
  const [sub, ...rest] = args;
  const has = (...flags: string[]) => rest.some((a) => flags.includes(a));
  const shortHas = (letter: string) =>
    rest.some((a) => new RegExp(`^-[a-zA-Z]*${letter}[a-zA-Z]*$`).test(a));
  switch (sub) {
    case "push":
      return has(
        "--force",
        "--force-with-lease",
        "--force-if-includes",
        "--mirror",
        "--delete",
        "--prune",
      ) ||
        shortHas("f") ||
        shortHas("d") ||
        rest.some((a) => a.startsWith("--force-with-lease=") || /^\+./.test(a) || /^:./.test(a))
        ? "a force or destructive git push"
        : null;
    case "reset":
      return has("--hard", "--merge", "--keep")
        ? "git reset that discards uncommitted changes"
        : null;
    case "clean":
      return shortHas("f") || has("--force") ? "git clean that deletes untracked files" : null;
    case "checkout": {
      const dashdash = rest.indexOf("--");
      if (dashdash >= 0 && dashdash < rest.length - 1)
        return "git checkout of paths, which discards their changes";
      if (rest.includes(".") || has("-f", "--force"))
        return "git checkout that discards working-tree changes";
      return null;
    }
    case "restore":
      if (has("--staged", "-S") && !has("--worktree", "-W")) return null;
      return rest.some((a) => !a.startsWith("-"))
        ? "git restore, which discards working-tree changes"
        : null;
    case "stash":
      return rest[0] === "drop" || rest[0] === "clear" ? `git stash ${rest[0]}` : null;
    case "branch":
      return has("-D") || (has("-d", "--delete") && has("-f", "--force"))
        ? "force-deleting a git branch"
        : null;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Commit-time secret scan
// ---------------------------------------------------------------------------

const MAX_DIFF_BYTES = 20 * 1024 * 1024;

function runGit(dir: string, args: string[]): string {
  try {
    return execFileSync("git", ["-C", dir, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 4000,
      maxBuffer: MAX_DIFF_BYTES,
    });
  } catch {
    return "";
  }
}

/** Added lines of a unified diff, grouped by file. */
export function addedLines(diff: string): Map<string, string[]> {
  const files = new Map<string, string[]>();
  let current = "";
  let inHeader = false;
  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) {
      inHeader = true;
      current = line.replace(/^diff --git a\/.* b\//, "");
    } else if (inHeader && line.startsWith("+++ ")) {
      const path = line.slice(4).replace(/^b\//, "");
      if (path !== "/dev/null") current = path;
    } else if (line.startsWith("@@")) {
      inHeader = false;
    } else if (!inHeader && line.startsWith("+")) {
      const list = files.get(current) ?? [];
      list.push(line.slice(1));
      files.set(current, list);
    }
  }
  return files;
}

export function commitSecrets(diff: string): Verdict | null {
  const hits: string[] = [];
  let high = false;
  for (const [file, lines] of addedLines(diff)) {
    const findings = findSecrets(lines.join("\n"), "commit");
    if (findings.length === 0) continue;
    high ||= findings.some((f) => f.confidence === "high");
    hits.push(`${file}:\n${formatFindings(findings).replace(/^/gm, "  ")}`);
    if (hits.length >= 10) break;
  }
  if (hits.length === 0) return null;
  const reason = [
    "The changes being committed look like they contain credentials:",
    ...hits,
    high
      ? "Do not commit this. Remove the secret, move it to an env var or secret store, and tell the user so they can rotate it. If it is a known false positive, ask the user to commit it themselves."
      : "Approve only if these are test fixtures or other non-secrets.",
  ].join("\n");
  return { decision: high ? "deny" : "ask", reason };
}

function commitScan(segment: string, cwd: string): Verdict | null {
  const args = gitArgs(segment);
  if (!args || args[0] !== "commit") return null;
  const dir = gitDir(segment, cwd);
  const rest = args.slice(1);
  let diff = runGit(dir, ["diff", "--cached", "--no-color", "--no-ext-diff", "--unified=0"]);
  // -a / --all commit tracked modifications that are not staged yet.
  if (rest.some((a) => a === "--all" || /^-[a-zA-Z]*a[a-zA-Z]*$/.test(a))) {
    diff += `\n${runGit(dir, ["diff", "--no-color", "--no-ext-diff", "--unified=0"])}`;
  }
  return diff.trim() ? commitSecrets(diff) : null;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/** The strongest verdict for a Bash command, or null to stay out of the way. */
export function evaluateCommand(rawCommand: string, cwd: string): Verdict | null {
  const command = scrubInert(rawCommand);
  const denies: string[] = [];
  const asks: string[] = [];

  if (PIPE_TO_SHELL.some((re) => re.test(command))) {
    denies.push(
      "Piping or substituting a download straight into a shell or interpreter. Download to a file, show it to the user, and let them run it.",
    );
  }
  if (AGENT_BYPASS.test(command)) {
    denies.push(
      "Starting a coding agent with permission checks or hooks disabled is not allowed from inside a session.",
    );
  }
  const host = command.match(EXFIL_HOSTS);
  if (host) {
    denies.push(
      `The command contacts ${host[0]}, a request-capture service commonly used for data exfiltration.`,
    );
  }

  let commitVerdict: Verdict | null = null;
  let dir = cwd;
  for (const segment of segments(command)) {
    const argv = commandWords(segment);
    if (argv[0] === "cd" && argv[1] && argv[1] !== "-") {
      dir = expandPath(argv[1], dir); // follow `cd sub && git commit`
      continue;
    }
    const rm = rmViolation(segment, dir);
    if (rm) denies.push(`Refusing a catastrophic delete: ${rm}. Delete specific paths instead.`);
    const secret = secretPathViolation(segment);
    if (secret)
      denies.push(
        `The command reads ${secret}. Don't read or move credentials; ask the user if this is really needed.`,
      );
    const args = gitArgs(segment);
    const ask = args && gitAsk(args);
    if (ask) asks.push(`This runs ${ask}. Confirm before it runs.`);
    commitVerdict ??= commitScan(segment, dir);
  }
  if (commitVerdict?.decision === "deny") denies.push(commitVerdict.reason);
  else if (commitVerdict) asks.push(commitVerdict.reason);

  const unique = (list: string[]) => [...new Set(list)].join("\n");
  if (denies.length > 0) return { decision: "deny", reason: `bash-guard: ${unique(denies)}` };
  if (asks.length > 0) return { decision: "ask", reason: `bash-guard: ${unique(asks)}` };
  return null;
}

export function evaluate(event: HookEvent): Verdict | null {
  if (event.tool_name !== "Bash") return null;
  const input = isRecord(event.tool_input) ? event.tool_input : {};
  if (typeof input.command !== "string" || input.command.trim() === "") return null;
  const cwd = typeof event.cwd === "string" && event.cwd !== "" ? event.cwd : process.cwd();
  return evaluateCommand(input.command, resolve(cwd));
}

async function main(): Promise<void> {
  try {
    const event: unknown = JSON.parse(await readStdin());
    if (!isRecord(event)) return;
    const verdict = evaluate(event);
    if (!verdict) return;
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: verdict.decision,
          permissionDecisionReason: verdict.reason,
        },
      }),
    );
  } catch {
    // fail open
  }
}

if (import.meta.main) await main();
