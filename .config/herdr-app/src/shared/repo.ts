// Which repository a space is in: its first terminal's live folder, asked of git on the
// space's own machine. Cached for a few minutes per (machine, folder).

import { exec, panes, spaces, type SpaceInfo } from "herdr";
import { parseRemote, type Remote } from "./remote.ts";

export interface SpaceRepo {
  machine: string | null;
  /** The folder git was asked in. */
  cwd: string;
  /** `git rev-parse --show-toplevel`, or null outside a repo. */
  root: string | null;
  /** Every remote, `origin` first. */
  remotes: Remote[];
}

const TTL = 5 * 60000;
const cache = new Map<string, { at: number; value: Promise<SpaceRepo> }>();

/** Where a space is now: its first terminal's folder, else where it was made. */
export function spaceFolder(space: SpaceInfo): string {
  const tabs = new Set(space.tabs.map((t) => t.id));
  return panes().find((p) => tabs.has(p.tab) && p.cwd)?.cwd || space.folder || "";
}

/** Every live folder of a space's terminals, and its own folder. */
export function spaceFolders(space: SpaceInfo): string[] {
  const tabs = new Set(space.tabs.map((t) => t.id));
  const all = panes()
    .filter((p) => tabs.has(p.tab) && p.cwd)
    .map((p) => p.cwd as string);
  if (space.folder) all.push(space.folder);
  return [...new Set(all)];
}

export function activeSpace(): SpaceInfo | null {
  return spaces().find((s) => s.active) ?? null;
}

export function repoOf(space: SpaceInfo): Promise<SpaceRepo> {
  return repoAt(space.machine ?? null, spaceFolder(space));
}

export function repoAt(machine: string | null, cwd: string): Promise<SpaceRepo> {
  const key = JSON.stringify([machine, cwd]);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const value = ask(machine, cwd);
  cache.set(key, { at: Date.now(), value });
  // A failure (machine away) is asked again next time.
  value.catch(() => cache.delete(key));
  return value;
}

async function ask(machine: string | null, cwd: string): Promise<SpaceRepo> {
  const none: SpaceRepo = { machine, cwd, root: null, remotes: [] };
  if (!cwd) return none;
  const on = machine ?? undefined;
  const top = await exec("git", ["rev-parse", "--show-toplevel"], { cwd, on });
  if (top.code !== 0) return none;
  const list = await exec("git", ["remote", "-v"], { cwd, on });
  const urls = new Map<string, string>();
  for (const line of list.stdout.split("\n")) {
    const [name, url] = line.split(/\s+/);
    if (name && url && !urls.has(name)) urls.set(name, url);
  }
  const names = [...urls.keys()].sort((a, b) => (a === "origin" ? -1 : b === "origin" ? 1 : 0));
  const remotes = names
    .map((n): Remote | null => {
      const r = parseRemote(urls.get(n));
      return r ? { ...r, remoteName: n } : null;
    })
    .filter((r): r is Remote => r !== null);
  return { machine, cwd, root: top.stdout.trim(), remotes };
}

/** Spaces whose repo has a remote with this slug, on any machine. Resolves every space once. */
export async function spacesForSlug(slug: string): Promise<SpaceInfo[]> {
  const want = slug.toLowerCase();
  const found: SpaceInfo[] = [];
  for (const space of spaces()) {
    const repo = await repoOf(space).catch(() => null);
    if (repo?.remotes.some((r) => r.slug.toLowerCase() === want)) found.push(space);
  }
  return found;
}
