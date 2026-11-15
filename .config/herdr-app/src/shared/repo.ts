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

/** Splits `git rev-parse --show-toplevel` from `git remote -v` in one run's output. */
const SEP = "\x1e";

async function ask(machine: string | null, cwd: string): Promise<SpaceRepo> {
  const none: SpaceRepo = { machine, cwd, root: null, remotes: [] };
  if (!cwd) return none;
  // One run for both questions: on another machine each run is a round trip.
  const r = await exec(
    "sh",
    ["-c", `git rev-parse --show-toplevel && printf '${SEP}\\n' && git remote -v`],
    { cwd, on: machine ?? undefined },
  );
  const cut = r.stdout.indexOf(SEP);
  if (r.code !== 0 || cut < 0) return none;
  const urls = new Map<string, string>();
  for (const line of r.stdout.slice(cut + 1).split("\n")) {
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
  return { machine, cwd, root: r.stdout.slice(0, cut).trim(), remotes };
}

/** Spaces whose repo has a remote with this slug, on any machine. Resolves every space once. */
export async function spacesForSlug(slug: string): Promise<SpaceInfo[]> {
  const want = slug.toLowerCase();
  // Every space at once: each is a git call, maybe on another machine, cached for a few minutes.
  const all = spaces();
  const repos = await Promise.all(all.map((space) => repoOf(space).catch(() => null)));
  return all.filter((_, i) => repos[i]?.remotes.some((r) => r.slug.toLowerCase() === want));
}
