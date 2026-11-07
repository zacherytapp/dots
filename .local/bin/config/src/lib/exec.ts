// Child processes. Everything is synchronous: the installer runs one command at
// a time and steps read better without await on every line.

import { spawnSync } from "node:child_process";
import { accessSync, constants as fsConstants } from "node:fs";
import { constants } from "node:os";
import { delimiter, join } from "node:path";

export type Env = Record<string, string | undefined>;

export interface RunOptions {
  /** Merged over the inherited environment. */
  env?: Env;
  cwd?: string;
  /** Written to stdin; without it stdin is inherited (so prompts reach the tty). */
  input?: string;
  /** Discard stdout and stderr. */
  quiet?: boolean;
}

export interface Result {
  status: number;
  stdout: string;
  stderr: string;
}

export class CommandError extends Error {
  readonly status: number;
  readonly command: string;
  readonly stderr: string;

  constructor(command: string, status: number, stderr = "") {
    const tail = stderr.trim().split("\n").slice(-5).join("\n");
    super(`\`${command}\` exited ${status}${tail ? `:\n${tail}` : ""}`);
    this.name = "CommandError";
    this.status = status;
    this.command = command;
    this.stderr = stderr;
  }
}

export function quote(word: string): string {
  return /^[\w@%+=:,./-]+$/.test(word) ? word : `'${word.replaceAll("'", `'\\''`)}'`;
}

export function describe(cmd: string, args: readonly string[]): string {
  return [cmd, ...args].map(quote).join(" ");
}

function spawn(cmd: string, args: readonly string[], opts: RunOptions, pipe: boolean): Result {
  const env = opts.env ? { ...process.env, ...opts.env } : process.env;
  const stdin = opts.input === undefined ? "inherit" : "pipe";
  const out = opts.quiet ? "ignore" : pipe ? "pipe" : "inherit";
  const res = spawnSync(cmd, args, {
    cwd: opts.cwd,
    env,
    input: opts.input,
    stdio: [stdin, out, opts.quiet ? "ignore" : pipe ? "pipe" : "inherit"],
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (res.error) {
    const missing = (res.error as NodeJS.ErrnoException).code === "ENOENT";
    return { status: missing ? 127 : 1, stdout: "", stderr: res.error.message };
  }
  // killed by a signal: report it the way a shell would (128 + signal number)
  const signal = res.signal ? (constants.signals[res.signal] ?? 0) : 0;
  return {
    status: res.status ?? 128 + signal,
    stdout: res.stdout ?? "",
    // captured stderr is "" (not null) when piped, so || rather than ??
    stderr: res.stderr || (res.signal ? `killed by ${res.signal}` : ""),
  };
}

/** Run with output on the terminal; throws CommandError on a non-zero exit. */
export function run(cmd: string, args: readonly string[] = [], opts: RunOptions = {}): void {
  const res = spawn(cmd, args, opts, false);
  if (res.status !== 0) throw new CommandError(describe(cmd, args), res.status, res.stderr);
}

/** Run with output on the terminal and return the exit status. Never throws. */
export function attempt(cmd: string, args: readonly string[] = [], opts: RunOptions = {}): number {
  return spawn(cmd, args, opts, false).status;
}

/** Run with stdout and stderr captured. Never throws. */
export function capture(cmd: string, args: readonly string[] = [], opts: RunOptions = {}): Result {
  return spawn(cmd, args, opts, true);
}

/** Captured stdout, trimmed; throws CommandError on a non-zero exit. */
export function output(cmd: string, args: readonly string[] = [], opts: RunOptions = {}): string {
  const res = capture(cmd, args, opts);
  if (res.status !== 0) throw new CommandError(describe(cmd, args), res.status, res.stderr);
  return res.stdout.trim();
}

/** True when the command exits 0. Output is discarded. */
export function succeeds(
  cmd: string,
  args: readonly string[] = [],
  opts: RunOptions = {},
): boolean {
  return spawn(cmd, args, { ...opts, quiet: true }, false).status === 0;
}

/** Full path of `cmd` on `path` (default: this process's PATH), or null. */
export function which(cmd: string, path = process.env.PATH ?? ""): string | null {
  if (cmd.includes("/")) return isExecutable(cmd) ? cmd : null;
  for (const dir of path.split(delimiter)) {
    if (!dir) continue;
    const full = join(dir, cmd);
    if (isExecutable(full)) return full;
  }
  return null;
}

export function isExecutable(path: string): boolean {
  try {
    accessSync(path, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** A bash script with errexit and pipefail, output on the terminal. */
export function sh(script: string, opts: RunOptions = {}): void {
  run("bash", ["-c", `set -eo pipefail\n${script}`], opts);
}
