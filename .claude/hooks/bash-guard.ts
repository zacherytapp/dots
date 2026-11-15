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
 *    working directory or one of its parents, and emptying (`rm -rf *`) one
 *    of those or a git repository's top level;
 *  - starting a coding agent with its permission checks or hooks disabled;
 *  - sending traffic to known request-capture or exfiltration hosts (the host
 *    in a pipeline with curl/wget/nc/ssh/an interpreter, not in grep or echo);
 *  - shell reads of private keys and credential files (ssh, gpg, age, cloud
 *    and package-manager credentials, .env files); `ssh -i <key>` is fine;
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
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { findSecrets, formatFindings } from "./secret-guard.ts";
import { isRecord, preToolUse, runHook } from "./lib/hook-io.ts";

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

/**
 * Split on unquoted ; & && || ( ) and newlines into pipelines, and each pipeline on | into
 * segments. Redirections (2>&1, &>file) are not separators.
 */
function splitPipelines(command: string): string[][] {
  const out: string[][] = [];
  let pipeline: string[] = [];
  let token = "";
  let quote = "";
  const endSegment = () => {
    if (token.trim()) pipeline.push(token.trim());
    token = "";
  };
  const endPipeline = () => {
    endSegment();
    if (pipeline.length > 0) out.push(pipeline);
    pipeline = [];
  };
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
    } else if (ch === "|") {
      if (command[i + 1] === "|") {
        i++;
        endPipeline();
      } else {
        if (command[i + 1] === "&") i++; // |&
        endSegment();
      }
    } else if (ch === "&" && (command[i - 1] === ">" || command[i - 1] === "<")) {
      token += ch; // 2>&1
    } else if (ch === "&" && command[i + 1] === ">" && command[i - 1] !== "&") {
      token += ch; // &>file
    } else if (ch === ";" || ch === "&" || ch === "\n" || ch === "(" || ch === ")") {
      endPipeline();
    } else {
      token += ch;
    }
  }
  endPipeline();
  return out;
}

/** Split on unquoted ; & | ( ) and newlines, plus the bodies of `...` substitutions. */
export function segments(command: string): string[] {
  const out = splitPipelines(command).flat();
  // $(...) bodies are already split out by the parens above; backtick bodies are not.
  for (const [, inner] of command.matchAll(/`([^`]*)`/g)) out.push(...segments(inner));
  return out;
}

/** Bodies of $(...) inside double quotes, which `segments` leaves in place. */
function quotedSubstitutions(segment: string): string[] {
  const out: string[] = [];
  let quote = "";
  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i];
    if (quote === "'") {
      if (ch === "'") quote = "";
    } else if (ch === "\\") {
      i++;
    } else if (ch === "'" && !quote) {
      quote = ch;
    } else if (ch === '"') {
      quote = quote ? "" : ch;
    } else if (quote === '"' && ch === "$" && segment[i + 1] === "(") {
      let depth = 1;
      let j = i + 2;
      for (; j < segment.length && depth > 0; j++) {
        if (segment[j] === "(") depth++;
        else if (segment[j] === ")") depth--;
      }
      out.push(segment.slice(i + 2, depth === 0 ? j - 1 : j));
      i = j - 1;
    }
  }
  return out;
}

const SHELL_NAME = /^(?:ba|z|da|k|fi|c|tc|a|mk)?sh$/;

/** The program text a segment runs inline: `sh -c '<script>'` or `eval <words>`. */
function inlineScript(segment: string): string | null {
  const argv = commandWords(segment);
  if (argv.length < 2) return null;
  const cmd = baseName(argv[0]);
  if (cmd === "eval") return argv.slice(1).join(" ");
  if (!SHELL_NAME.test(cmd)) return null;
  let sawC = false;
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-o" || arg === "+o") i++;
    else if (/^-[a-zA-Z]*c[a-zA-Z]*$/.test(arg)) sawC = true;
    else if (!arg.startsWith("-") && !arg.startsWith("+")) return sawC ? arg : null;
  }
  return null;
}

/**
 * Every pipeline to check: the top level plus the bodies of backtick and quoted $(...)
 * substitutions and of `sh -c` / `eval` scripts.
 */
export function pipelines(command: string, depth = 0): string[][] {
  const out = splitPipelines(command);
  if (depth > 4) return out;
  const nested = [...command.matchAll(/`([^`]*)`/g)].map((m) => m[1]);
  for (const segment of out.flat()) {
    nested.push(...quotedSubstitutions(segment));
    const script = inlineScript(segment);
    if (script !== null) nested.push(script);
  }
  for (const inner of nested) out.push(...pipelines(inner, depth + 1));
  return out;
}

/** Shell words with quotes removed; adjacent quoted and unquoted parts join (`"$HOME"/x`). */
function words(segment: string): string[] {
  const out: string[] = [];
  let word = "";
  let inWord = false;
  let quote = "";
  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i];
    if (quote) {
      if (ch === quote) quote = "";
      else if (ch === "\\" && quote === '"' && /["\\$`]/.test(segment[i + 1] ?? ""))
        word += segment[++i];
      else word += ch;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      inWord = true;
    } else if (ch === "\\" && i + 1 < segment.length) {
      if (segment[++i] === "\n") continue; // line continuation
      word += segment[i];
      inWord = true;
    } else if (/\s/.test(ch)) {
      if (inWord) out.push(word);
      word = "";
      inWord = false;
    } else {
      word += ch;
      inWord = true;
    }
  }
  if (inWord) out.push(word);
  return out;
}

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
]);
/** Reserved words that can precede a command in the same segment (`then rm -rf ~`). */
const RESERVED = new Set(["if", "then", "else", "elif", "while", "until", "do", "!", "{"]);

/** Words after leading VAR=value assignments, reserved words and sudo/env/exec/... wrappers. */
function commandWords(segment: string): string[] {
  const all = words(segment);
  let i = 0;
  while (i < all.length) {
    const w = all[i];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w) || RESERVED.has(w)) i++;
    else if (WRAPPERS.has(w)) {
      i++;
      while (i < all.length && all[i].startsWith("-")) i++;
    } else break;
  }
  return all.slice(i);
}

/** Options of package runners, xargs and timeout that take a separate value. */
const RUNNER_OPTION_VALUES = new Set([
  "-p",
  "--package",
  "-I",
  "-L",
  "-n",
  "-P",
  "-d",
  "-E",
  "-s",
  "-a",
  "-k",
  "--signal",
  "--kill-after",
]);

/** `commandWords` past package runners (npx, pnpm dlx, bunx, ...), xargs and timeout. */
function programWords(segment: string): string[] {
  let argv = commandWords(segment);
  for (let round = 0; round < 4 && argv.length > 0; round++) {
    const cmd = baseName(argv[0]);
    let i = 0;
    if (["npx", "pnpx", "bunx", "uvx", "xargs", "timeout"].includes(cmd)) i = 1;
    else if (
      (["npm", "pnpm", "yarn"].includes(cmd) && ["exec", "dlx", "x"].includes(argv[1])) ||
      (cmd === "bun" && argv[1] === "x")
    )
      i = 2;
    if (i === 0) break;
    while (i < argv.length && argv[i].startsWith("-"))
      i += RUNNER_OPTION_VALUES.has(argv[i]) ? 2 : 1;
    if (cmd === "timeout") i++; // the duration
    argv = argv.slice(i);
  }
  return argv;
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

/** Coding agents, as the program name (npm package names included, `@version` stripped). */
const AGENTS = new Set([
  "claude",
  "claude-code",
  "codex",
  "gemini",
  "gemini-cli",
  "opencode",
  "opencode-ai",
  "pi",
  "pi-coding-agent",
]);
const BYPASS_FLAGS =
  /--dangerously-skip-permissions|--allow-dangerously-skip-permissions|--permission-mode[=\s]+["']?bypassPermissions|--dangerously-bypass-approvals-and-sandbox|--yolo\b|disableAllHooks/;

/** A coding agent in command position, started with a bypass flag. */
function agentBypass(segment: string): boolean {
  const argv = programWords(segment);
  if (argv.length < 2) return false;
  const name = baseName(argv[0]).replace(/(?<=.)@[^/]*$/, "");
  return AGENTS.has(name) && BYPASS_FLAGS.test(argv.slice(1).join(" "));
}

const EXFIL_HOSTS =
  /\b(?:webhook\.site|requestbin\.(?:com|net)|pipedream\.net|(?:[a-z0-9-]+\.)?ngrok(?:-free)?\.(?:io|app|dev)|interact\.sh|oast\.(?:fun|me|pro|live|site|online)|oastify\.com|burpcollaborator\.net|canarytokens\.(?:com|org)|hookbin\.com|beeceptor\.com|requestcatcher\.com|transfer\.sh|0x0\.st|termbin\.com|ptpb\.pw)\b/i;

/** Programs that open network connections to hosts named in their arguments. */
const NETWORK_COMMANDS = new Set([
  "curl",
  "wget",
  "wget2",
  "aria2c",
  "http",
  "https",
  "httpie",
  "xh",
  "xhs",
  "nc",
  "ncat",
  "netcat",
  "socat",
  "telnet",
  "websocat",
  "openssl",
  "ssh",
  "scp",
  "sftp",
  "rsync",
  "ftp",
  "lftp",
]);
/** Interpreters: a host in their arguments is a one-liner or script that may fetch it. */
const INTERPRETER = /^(?:python[0-9.]*|node|nodejs|deno|bun|perl|ruby|php|pwsh|powershell)$/;
const GIT_NETWORK = new Set(["clone", "fetch", "pull", "push", "ls-remote", "remote", "submodule"]);

function networkCapable(segment: string): boolean {
  const argv = programWords(segment);
  if (argv.length === 0) return false;
  const cmd = baseName(argv[0]);
  if (NETWORK_COMMANDS.has(cmd) || INTERPRETER.test(cmd)) return true;
  // `sh -c '<script>'` is judged by its script; a bare shell runs whatever it is fed.
  if (SHELL_NAME.test(cmd)) return inlineScript(segment) === null;
  if (cmd === "git") return GIT_NETWORK.has(gitArgs(segment)?.[0] ?? "");
  return false;
}

/** `URL=https://...`, `export URL=...` or `for u in ...`: a value a later command may use. */
function bindsValue(segment: string): boolean {
  const all = words(segment);
  if (all[0] === "for") return true;
  const rest = ["export", "declare", "typeset", "local", "readonly"].includes(all[0] ?? "")
    ? all.slice(1)
    : all;
  return rest.length > 0 && rest.every((w) => w.startsWith("-") || /^[A-Za-z_]\w*=/.test(w));
}

/**
 * An exfiltration host the command sends traffic to: one named in a pipeline with a
 * network-capable command, bound to a variable in a command that has one, or inside a heredoc
 * fed to one. Mentions in grep, git log, echo and the like are left alone.
 */
function exfilHost(command: string, groups: string[][]): string | null {
  const network = groups.map((pipeline) => pipeline.some(networkCapable));
  if (!network.includes(true)) return null;
  for (const [n, pipeline] of groups.entries()) {
    for (const segment of pipeline) {
      const host = EXFIL_HOSTS.exec(segment)?.[0];
      if (host && (network[n] || bindsValue(segment))) return host;
    }
  }
  const heredocFed = groups.flat().some((s) => /<</.test(s) && networkCapable(s));
  return heredocFed ? (EXFIL_HOSTS.exec(command)?.[0] ?? null) : null;
}

const SSH_KEY_LABEL = "an SSH private key";
const SSH_CLIENTS = new Set(["ssh", "scp", "sftp", "sshfs", "autossh", "mosh", "ssh-copy-id"]);
/** `-i <key>` or `-o IdentityFile=<key>`: ssh uses the key to authenticate, it doesn't leak it. */
const SSH_KEY_ARG =
  /(?<=^|[\s"'=])(?:-i\s*|-o\s*["']?IdentityFile[=\s]+)["']?[^\s"';|&]*\.ssh\/id_[A-Za-z0-9_-]+/g;
/** A quoted ssh command line: `rsync -e "ssh -i ..."`, `GIT_SSH_COMMAND='ssh -i ...'`. */
const SSH_COMMAND_STRING = /(["'])(?:[^\s"']*\/)?ssh\s[^"']*\1/g;

/** The segment minus key paths that ssh is only told to authenticate with. */
function withoutSshIdentities(segment: string, cmd: string): string {
  const text = segment.replace(SSH_COMMAND_STRING, (s) => s.replace(SSH_KEY_ARG, ""));
  return SSH_CLIENTS.has(cmd) ? text.replace(SSH_KEY_ARG, "") : text;
}

/** Credential files, with the commands that legitimately take them as an argument. */
const SECRET_PATHS: { re: RegExp; label: string; users: string[] }[] = [
  {
    re: /\.ssh\/id_[A-Za-z0-9_-]+(?!\.pub)(?![A-Za-z0-9_.-])/,
    label: SSH_KEY_LABEL,
    // ssh/scp/sftp pass as `-i <key>` (stripped above); `scp <key> host:` copies the key itself.
    users: ["ssh-add", "ssh-keygen"],
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
    if (arg === "") continue;
    if (/[*?[]/.test(arg)) {
      const parent = expandPath(dirname(arg), cwd);
      const last = arg.slice(arg.lastIndexOf("/") + 1);
      // Any glob is dangerous when the directory holds something protected: a system dir,
      // $HOME or an ancestor of it, or a strict ancestor of the working directory. A bare
      // wildcard (`*`, `.*`) empties the directory, so it is also refused at the top of a git
      // repository; emptying an ordinary directory (`cd tmp && rm -rf *`) is left to the
      // rm permission prompt.
      const protectedHit =
        SYSTEM_DIRS.includes(parent) ||
        isWithin(HOME, parent) ||
        (isWithin(cwd, parent) && parent !== cwd) ||
        (/^\.?[*?]+$/.test(last) && existsSync(join(parent, ".git")));
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
    if (!re.test(label === SSH_KEY_LABEL ? withoutSshIdentities(segment, cmd) : segment)) continue;
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
  const groups = pipelines(command);
  const all = groups.flat();
  const denies: string[] = [];
  const asks: string[] = [];

  if (PIPE_TO_SHELL.some((re) => re.test(command))) {
    denies.push(
      "Piping or substituting a download straight into a shell or interpreter. Download to a file, show it to the user, and let them run it.",
    );
  }
  if (all.some(agentBypass)) {
    denies.push(
      "Starting a coding agent with permission checks or hooks disabled is not allowed from inside a session.",
    );
  }
  const host = exfilHost(command, groups);
  if (host) {
    denies.push(
      `The command contacts ${host}, a request-capture service commonly used for data exfiltration.`,
    );
  }

  let commitVerdict: Verdict | null = null;
  let dir = cwd;
  for (const segment of all) {
    const argv = commandWords(segment);
    if (argv[0] === "cd" || argv[0] === "pushd") {
      // Follow `cd sub && git commit`; a bare `cd` goes home, `cd -` is unknown.
      const to = argv.slice(1).find((a) => a === "-" || !a.startsWith("-"));
      if (to === undefined && argv[0] === "cd") dir = HOME;
      else if (to !== undefined && to !== "-") dir = expandPath(to, dir);
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

if (import.meta.main)
  await runHook("bash-guard", "minimal", (event) => {
    const verdict = evaluate(event);
    return verdict ? preToolUse(verdict.decision, verdict.reason) : null;
  });
