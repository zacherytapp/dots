#!/usr/bin/env node
/**
 * Inventory a git repository's branches, worktrees, stashes and temp leftovers, and classify
 * every branch against the base (default) branch. Prints JSON.
 *
 *   node inventory.ts [--base <ref>] [--repo <path>]
 *
 * Changes nothing. `git merge-tree --write-tree` adds only unreachable objects, which gc collects.
 * Run `git fetch --all --prune` first so remote-tracking refs are current.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * landed: every change on the branch is already in base.
 * pointer: no commits of its own (tip sits on base's first-parent history), so either freshly
 *   created or fast-forwarded with no reflog to tell which.
 * unlanded: has changes base lacks.
 */
export type Status = "landed" | "pointer" | "unlanded";
export type Via = "ancestor" | "fast-forward" | "rebase" | "merge-tree" | "squash";

export interface Branch {
  ref: string;
  name: string;
  remote: string | null;
  tip: string;
  lastCommit: string;
  author: string;
  status: Status;
  via: Via | null;
  mergeBase: string | null;
  ahead: number;
  behind: number;
  upstream: string | null;
  upstreamGone: boolean;
  unpushed: number | null;
  worktree: string | null;
  current: boolean;
  protected: boolean;
}

export interface Worktree {
  path: string;
  branch: string | null;
  head: string | null;
  main: boolean;
  dirty: number | null;
  locked: boolean;
  prunable: boolean;
  inUse: boolean;
}

export interface TempEntry {
  path: string;
  kind: "project-scratch" | "orphan-worktree" | "machine-temp";
  match: string | null;
  modified: string;
  sizeKB: number | null;
  tracked: boolean;
  inUse: boolean;
}

export interface Stash {
  ref: string;
  branch: string | null;
  message: string;
}

export interface Inventory {
  root: string;
  base: { ref: string; sha: string; local: { name: string; ahead: number; behind: number } | null };
  branches: Branch[];
  worktrees: Worktree[];
  stashes: Stash[];
  temp: TempEntry[];
}

export interface Options {
  base?: string;
  /** Machine temp dirs to scan; defaults to the OS temp dir, /tmp and /var/tmp. */
  tmpDirs?: string[];
}

const PROTECTED = /^(main|master|trunk|develop|dev|staging|production|prod|gh-pages)$|^release[/-]/;
const SCRATCH_DIRS = ["tmp", ".tmp", "scratch"];
const WORKTREE_DIRS = [".worktrees", ".claude/worktrees"];

function run(cmd: string, args: string[], cwd: string, input?: string) {
  const r = spawnSync(cmd, args, {
    cwd,
    input,
    encoding: "utf8",
    maxBuffer: 1 << 30,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" },
  });
  return { ok: r.status === 0, out: (r.stdout ?? "").trimEnd() };
}

function lines(text: string): string[] {
  return text ? text.split("\n") : [];
}

export function inventory(repo: string, opts: Options = {}): Inventory {
  const git = (...args: string[]) => run("git", args, repo);
  const must = (...args: string[]) => {
    const r = git(...args);
    if (!r.ok) throw new Error(`git ${args.join(" ")} failed in ${repo}`);
    return r.out;
  };

  const worktrees = listWorktrees(repo);
  const root = worktrees[0]?.path ?? must("rev-parse", "--show-toplevel");
  const remotes = lines(git("remote").out);
  const baseRef = opts.base ?? resolveBase(git, remotes);
  const base = must("rev-parse", "--verify", `${baseRef}^{commit}`);
  const baseTree = must("rev-parse", `${base}^{tree}`);
  const baseFull = must("rev-parse", "--symbolic-full-name", baseRef) || baseRef;
  const baseName = baseRef.replace(new RegExp(`^(${remotes.map(escape).join("|")})/`), "");
  const currentBranch = git("symbolic-ref", "--quiet", "--short", "HEAD").out || null;

  let firstParent: Set<string> | null = null;
  const onFirstParent = (sha: string) =>
    (firstParent ??= new Set(lines(must("rev-list", "--first-parent", base)))).has(sha);
  const patchCache = new Map<string, Set<string>>();
  const basePatchIds = (mergeBase: string) => {
    let ids = patchCache.get(mergeBase);
    if (!ids) {
      const log = git("log", "-p", "--no-merges", `${mergeBase}..${base}`).out;
      ids = new Set(lines(run("git", ["patch-id", "--stable"], repo, log).out).map(firstWord));
      patchCache.set(mergeBase, ids);
    }
    return ids;
  };
  const count = (range: string) => Number(must("rev-list", "--count", range));

  const classify = (ref: string, tip: string, local: boolean) => {
    const mergeBase = git("merge-base", base, tip).out || null;
    const ahead = count(`${base}..${tip}`);
    const behind = count(`${tip}..${base}`);
    let status: Status = "unlanded";
    let via: Via | null = null;
    if (ahead === 0) {
      if (!onFirstParent(tip)) [status, via] = ["landed", "ancestor"];
      else if (local && reflogCommits(git, ref) > 0) [status, via] = ["landed", "fast-forward"];
      else status = "pointer";
    } else if (lines(git("cherry", base, tip).out).every((l) => l.startsWith("-"))) {
      [status, via] = ["landed", "rebase"];
    } else if (
      firstWord(git("merge-tree", "--write-tree", "--no-messages", base, tip).out) === baseTree
    ) {
      [status, via] = ["landed", "merge-tree"];
    } else if (mergeBase) {
      const diff = git("diff", mergeBase, tip).out;
      const id = firstWord(run("git", ["patch-id", "--stable"], repo, diff + "\n").out);
      if (id && basePatchIds(mergeBase).has(id)) [status, via] = ["landed", "squash"];
    }
    return { status, via, mergeBase, ahead, behind };
  };

  const fmt = [
    "%(refname)",
    "%(objectname)",
    "%(committerdate:iso-strict)",
    "%(authorname)",
    "%(upstream)",
    "%(upstream:track)",
    "%(symref)",
  ].join("%09");
  const branches: Branch[] = [];
  for (const row of lines(must("for-each-ref", `--format=${fmt}`, "refs/heads", "refs/remotes"))) {
    const [ref, tip, lastCommit, author, upstream, track, symref] = row.split("\t");
    if (symref) continue;
    const local = ref.startsWith("refs/heads/");
    const remote = local
      ? null
      : (remotes.find((r) => ref.startsWith(`refs/remotes/${r}/`)) ?? null);
    if (!local && !remote) continue;
    const name = local ? ref.slice(11) : ref.slice(`refs/remotes/${remote}/`.length);
    const isBase = ref === baseFull;
    const upstreamGone = track === "[gone]";
    const shown = isBase
      ? { status: "landed" as Status, via: "ancestor" as Via, mergeBase: base, ahead: 0, behind: 0 }
      : classify(ref, tip, local);
    branches.push({
      ref,
      name,
      remote,
      tip,
      lastCommit,
      author,
      ...shown,
      upstream: upstream ? upstream.replace(/^refs\/remotes\//, "") : null,
      upstreamGone,
      unpushed: local && upstream && !upstreamGone ? count(`${upstream}..${tip}`) : null,
      worktree: local ? (worktrees.find((w) => w.branch === name)?.path ?? null) : null,
      current: local && name === currentBranch,
      protected: isBase || name === baseName || PROTECTED.test(name),
    });
  }

  const localBase = branches.find((b) => !b.remote && b.name === baseName && b.ref !== baseFull);
  const stashes = lines(git("stash", "list", "--format=%gd%x09%gs").out).map((row) => {
    const [ref, message] = row.split("\t");
    return { ref, branch: message.match(/^(?:WIP on|On) ([^:]+):/)?.[1] ?? null, message };
  });

  const opens = openPaths();
  const inUse = (p: string) => opens.some((o) => o === p || o.startsWith(`${p}/`));
  for (const w of worktrees) {
    w.inUse = !w.main && inUse(w.path);
    if (fs.existsSync(w.path)) {
      w.dirty = lines(run("git", ["status", "--porcelain"], w.path).out).length;
    }
  }

  const temp: TempEntry[] = [];
  const entry = (p: string, kind: TempEntry["kind"], match: string | null): TempEntry | null => {
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(p);
    } catch {
      return null;
    }
    const du = run("du", ["-sk", p], "/");
    return {
      path: p,
      kind,
      match,
      modified: stat.mtime.toISOString(),
      sizeKB: du.ok ? Number(firstWord(du.out)) : null,
      tracked: p.startsWith(`${root}/`) && git("ls-files", "--", p).out !== "",
      inUse: inUse(p),
    };
  };
  const children = (dir: string) => {
    try {
      return fs.readdirSync(dir).map((n) => path.join(dir, n));
    } catch {
      return [];
    }
  };
  for (const dir of SCRATCH_DIRS) {
    for (const p of children(path.join(root, dir))) push(temp, entry(p, "project-scratch", null));
  }
  const registered = new Set(worktrees.map((w) => w.path));
  for (const dir of WORKTREE_DIRS) {
    for (const p of children(path.join(root, dir))) {
      if (!registered.has(p) && fs.statSync(p, { throwIfNoEntry: false })?.isDirectory()) {
        push(temp, entry(p, "orphan-worktree", null));
      }
    }
  }

  const tokens = new Set([path.basename(root)]);
  for (const b of branches) {
    const slug = b.name.replaceAll("/", "-");
    if (!b.protected && slug.length >= 4) tokens.add(slug);
  }
  const patterns = [...tokens].map(
    (t) => [t, new RegExp(`(^|[^a-z0-9])${escape(t.toLowerCase())}([^a-z0-9]|$)`)] as const,
  );
  const uid = process.getuid?.();
  const tmpDirs = opts.tmpDirs ?? [os.tmpdir(), "/tmp", "/var/tmp"];
  for (const dir of new Set(tmpDirs.map((d) => path.resolve(d)))) {
    for (const p of children(dir)) {
      if (p === root || p.startsWith(`${root}/`) || registered.has(p)) continue;
      const stat = fs.lstatSync(p, { throwIfNoEntry: false });
      if (!stat || (uid !== undefined && stat.uid !== uid)) continue;
      const hit = patterns.find(([, re]) => re.test(path.basename(p).toLowerCase()));
      if (hit) push(temp, entry(p, "machine-temp", hit[0]));
    }
  }

  return {
    root,
    base: {
      ref: baseRef,
      sha: base,
      local: localBase
        ? {
            name: localBase.name,
            ahead: count(`${base}..${localBase.tip}`),
            behind: count(`${localBase.tip}..${base}`),
          }
        : null,
    },
    branches,
    worktrees,
    stashes,
    temp,
  };
}

function resolveBase(git: (...a: string[]) => { ok: boolean; out: string }, remotes: string[]) {
  const order = ["upstream", "origin"].filter((r) => remotes.includes(r));
  for (const r of [...order, ...remotes.filter((r) => !order.includes(r))]) {
    const head = git("symbolic-ref", "--quiet", "--short", `refs/remotes/${r}/HEAD`);
    if (head.ok && head.out) return head.out;
  }
  for (const r of [...order.map((r) => `${r}/main`), ...order.map((r) => `${r}/master`)]) {
    if (git("rev-parse", "--verify", "--quiet", `${r}^{commit}`).ok) return r;
  }
  for (const r of ["main", "master"]) {
    if (git("rev-parse", "--verify", "--quiet", `${r}^{commit}`).ok) return r;
  }
  throw new Error("cannot find the base branch; pass --base <ref>");
}

/** Reflog entries that record work done on the branch itself, not just moves. */
function reflogCommits(git: (...a: string[]) => { out: string }, ref: string): number {
  return lines(git("reflog", "show", "--format=%gs", ref, "--").out).filter((l) =>
    /^(commit|cherry-pick|rebase)/.test(l),
  ).length;
}

function listWorktrees(repo: string): Worktree[] {
  const out = run("git", ["worktree", "list", "--porcelain"], repo).out;
  return out
    .split(/\n\n+/)
    .filter(Boolean)
    .map((block, i) => {
      const fields = new Map(
        lines(block).map((l) => [l.split(" ")[0], l.slice(l.indexOf(" ") + 1)] as const),
      );
      return {
        path: fields.get("worktree") ?? "",
        branch: fields.get("branch")?.replace(/^refs\/heads\//, "") ?? null,
        head: fields.get("HEAD") ?? null,
        main: i === 0,
        dirty: null,
        locked: fields.has("locked"),
        prunable: fields.has("prunable"),
        inUse: false,
      };
    });
}

/** Every cwd and open file of other processes (Linux /proc); empty where /proc is absent. */
function openPaths(): string[] {
  const out: string[] = [];
  let pids: string[];
  try {
    pids = fs.readdirSync("/proc").filter((p) => /^\d+$/.test(p) && Number(p) !== process.pid);
  } catch {
    return out;
  }
  for (const pid of pids) {
    try {
      out.push(fs.readlinkSync(`/proc/${pid}/cwd`));
    } catch {}
    try {
      for (const fd of fs.readdirSync(`/proc/${pid}/fd`)) {
        try {
          out.push(fs.readlinkSync(`/proc/${pid}/fd/${fd}`));
        } catch {}
      }
    } catch {}
  }
  return out;
}

function push<T>(list: T[], item: T | null) {
  if (item) list.push(item);
}

function firstWord(text: string): string {
  return text.split(/\s/, 1)[0] ?? "";
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const flag = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  try {
    const repo = path.resolve(flag("--repo") ?? ".");
    console.log(JSON.stringify(inventory(repo, { base: flag("--base") }), null, 2));
  } catch (error) {
    console.error(`inventory: ${(error as Error).message}`);
    process.exit(1);
  }
}
