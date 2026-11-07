// The real (sudo-ing) user. Root runs the installer, but everything under $HOME
// is created as this user so nothing in it ends up owned by root.

import { existsSync, readFileSync, readlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import * as exec from "./exec.ts";
import { warn } from "./log.ts";
import type { Env, Result, RunOptions } from "./exec.ts";

export interface Passwd {
  name: string;
  uid: number;
  gid: number;
  home: string;
  shell: string;
}

export function passwd(name: string): Passwd {
  const line = exec.output("getent", ["passwd", name]);
  const [user, , uid, gid, , home, shell] = line.split(":");
  if (!user || !home) throw new Error(`no passwd entry for ${name}`);
  return { name: user, uid: Number(uid), gid: Number(gid), home, shell: shell ?? "" };
}

export class User {
  readonly name: string;
  readonly uid: number;
  readonly gid: number;
  readonly home: string;
  /** True when this process already runs as the user (verify), so no sudo. */
  readonly isSelf: boolean;
  private nodeBin: string | null | undefined;

  constructor(entry: Passwd) {
    this.name = entry.name;
    this.uid = entry.uid;
    this.gid = entry.gid;
    this.home = entry.home;
    this.isSelf = process.getuid?.() === entry.uid;
  }

  path(...parts: string[]): string {
    return join(this.home, ...parts);
  }

  get nvmDir(): string {
    return this.path(".config", "nvm");
  }

  get pnpmHome(): string {
    return this.path(".local", "share", "pnpm");
  }

  /** Login shell from the passwd database, read fresh each time. */
  shell(): string {
    return passwd(this.name).shell;
  }

  /** The tool dirs the dotfiles put on PATH (.zshenv / .profile), plus nvm's default node. */
  searchPath(): string {
    const dirs = [
      this.path(".local", "bin"),
      this.path("bin"),
      join(this.pnpmHome, "bin"),
      this.pnpmHome,
      this.path(".cargo", "bin"),
      this.path("go", "bin"),
      "/usr/local/go/bin",
      "/opt/pmd/bin",
      this.path(".juliaup", "bin"),
      this.path(".pyenv", "bin"),
    ];
    const node = this.defaultNodeBin();
    if (node) dirs.push(node);
    dirs.push("/usr/local/sbin", "/usr/local/bin", "/usr/sbin", "/usr/bin", "/sbin", "/bin");
    return dirs.join(":");
  }

  env(): Record<string, string> {
    return {
      HOME: this.home,
      USER: this.name,
      LOGNAME: this.name,
      PATH: this.searchPath(),
      NVM_DIR: this.nvmDir,
      PNPM_HOME: this.pnpmHome,
    };
  }

  /** Forget the cached node location, after nvm installed or switched one. */
  refresh(): void {
    this.nodeBin = undefined;
  }

  /** bin dir of nvm's `default` alias, resolved through nvm.sh once. */
  defaultNodeBin(): string | null {
    if (this.nodeBin !== undefined) return this.nodeBin;
    this.nodeBin = null;
    if (existsSync(join(this.nvmDir, "nvm.sh"))) {
      const res = this.wrap("bash", [
        "-c",
        '. "$NVM_DIR/nvm.sh" >/dev/null 2>&1 && nvm which default 2>/dev/null',
      ]);
      const out = exec.capture(res.cmd, res.args, { env: this.baseEnv() });
      const node = out.stdout.trim().split("\n").pop() ?? "";
      if (out.status === 0 && node.startsWith("/")) this.nodeBin = dirname(node);
    }
    return this.nodeBin;
  }

  /** `cmd` on the user's PATH, or null. */
  which(cmd: string): string | null {
    return exec.which(cmd, this.searchPath());
  }

  private baseEnv(): Record<string, string> {
    return {
      HOME: this.home,
      PATH: "/usr/local/bin:/usr/bin:/bin",
      NVM_DIR: this.nvmDir,
      PNPM_HOME: this.pnpmHome,
    };
  }

  private wrap(
    cmd: string,
    args: readonly string[],
    env: Env = {},
  ): { cmd: string; args: string[] } {
    const assignments = Object.entries({ ...this.baseEnv(), ...env })
      .filter((entry): entry is [string, string] => entry[1] !== undefined)
      .map(([k, v]) => `${k}=${v}`);
    if (this.isSelf) return { cmd: "env", args: [...assignments, cmd, ...args] };
    return { cmd: "sudo", args: ["-u", this.name, "-H", "env", ...assignments, cmd, ...args] };
  }

  private prepare(cmd: string, args: readonly string[], opts: RunOptions) {
    const wrapped = this.wrap(cmd, args, { ...this.env(), ...opts.env });
    return { ...wrapped, opts: { ...opts, env: undefined } };
  }

  run(cmd: string, args: readonly string[] = [], opts: RunOptions = {}): void {
    const w = this.prepare(cmd, args, opts);
    exec.run(w.cmd, w.args, w.opts);
  }

  capture(cmd: string, args: readonly string[] = [], opts: RunOptions = {}): Result {
    const w = this.prepare(cmd, args, opts);
    return exec.capture(w.cmd, w.args, w.opts);
  }

  output(cmd: string, args: readonly string[] = [], opts: RunOptions = {}): string {
    const w = this.prepare(cmd, args, opts);
    return exec.output(w.cmd, w.args, w.opts);
  }

  succeeds(cmd: string, args: readonly string[] = [], opts: RunOptions = {}): boolean {
    const w = this.prepare(cmd, args, opts);
    return exec.succeeds(w.cmd, w.args, w.opts);
  }

  /** A bash script as the user (errexit, pipefail), with nvm loaded when present. */
  sh(script: string, opts: RunOptions = {}): void {
    this.run("bash", ["-c", userScript(script)], opts);
  }

  shOutput(script: string, opts: RunOptions = {}): string {
    return this.output("bash", ["-c", userScript(script)], opts);
  }

  /**
   * Download a vendor install script, then run it with `shell` and `args`.
   * Not `curl | sh`: under pipefail that fails whenever a script exits before
   * reading all of its input (plannotator --minimal does).
   */
  installScript(
    url: string,
    opts: { shell?: "sh" | "bash"; args?: string[]; env?: Env; input?: string } = {},
  ): void {
    const shell = opts.shell ?? "sh";
    const script = `tmp=$(mktemp); trap 'rm -f "$tmp"' EXIT
curl --proto '=https' --proto-redir '=https' --tlsv1.2 -fsSL --retry 3 -o "$tmp" "$1"
shift
${shell} "$tmp" "$@"`;
    this.run("bash", ["-c", userScript(script), "_", url, ...(opts.args ?? [])], {
      env: opts.env,
      input: opts.input,
    });
  }

  /** Create directories as the user (mkdir -p). */
  mkdir(...dirs: string[]): void {
    this.run("mkdir", ["-p", ...dirs]);
  }

  /** Write a file as the user, keeping an existing file's mode, owner and symlink. */
  writeFile(path: string, content: string): void {
    this.run("tee", [path], { input: content, quiet: true });
  }

  readFile(path: string): string | null {
    try {
      return readFileSync(path, "utf8");
    } catch {
      return null;
    }
  }

  /**
   * Run `fn` (a vendor tool that edits `path` as a side effect), then put
   * `path` back as it was, even when `fn` throws: the same symlink when it was
   * one (a tool that saves by rename replaces the stow link with a plain file),
   * else the same content written through it. For files that are the repo's
   * own through a stow link. A file that didn't exist before is left as the
   * tool made it. When both `fn` and the restore fail, `fn`'s error is the one
   * thrown and the restore failure is a warning.
   */
  preserving<T>(path: string, fn: () => T): T {
    const link = readLink(path);
    const before = this.readFile(path);
    const restore = () => {
      if (link !== null && readLink(path) !== link) {
        this.run("ln", ["-sfn", link, path]);
        warn(`relinked ${path} -> ${link}, which a tool replaced`);
      } else if (before !== null && this.readFile(path) !== before) {
        this.writeFile(path, before);
        warn(`restored ${path}, which a tool rewrote`);
      }
    };
    let result: T;
    try {
      result = fn();
    } catch (err) {
      try {
        restore();
      } catch (restoreErr) {
        warn(`could not restore ${path}: ${String(restoreErr)}`);
      }
      throw err;
    }
    restore();
    return result;
  }
}

function readLink(path: string): string | null {
  try {
    return readlinkSync(path);
  } catch {
    return null;
  }
}

function userScript(script: string): string {
  return `set -eo pipefail\n[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null 2>&1 || true\n${script}`;
}
