// A repository's branches, local and remote, as rows: what each git command printed, merged by
// branch name, with the open pull request whose head it is. Pure, so tests feed it git output.

export interface LocalBranch {
  name: string;
  sha: string;
  upstream: string;
  ahead: number;
  behind: number;
  /** The upstream branch was deleted on the remote. */
  gone: boolean;
  date: number;
  subject: string;
}

export interface BranchPr {
  number: number;
  title: string;
  url: string;
  draft: boolean;
  provider: "github" | "forgejo";
}

export interface Branch {
  /** "<machine>:<root>:<name>": unique across repos. */
  id: string;
  name: string;
  current: boolean;
  local: LocalBranch | null;
  /** Remote names that have it, with whether they point where the local branch does. */
  remotes: { remote: string; sha: string; same: boolean }[];
  pr: BranchPr | null;
  /** ms since the epoch, of its last commit (local, else what the last fetch saw). */
  date: number;
  subject: string;
  /** The branch on the web, when a known remote has it. */
  web: string | null;
}

export type Kind = "local" | "remote" | "both";

export function kindOf(b: Branch): Kind {
  if (b.local && b.remotes.length) return "both";
  return b.local ? "local" : "remote";
}

const FIELDS =
  "%(refname:short)%09%(upstream:short)%09%(upstream:track,nobracket)%09%(objectname)%09%(committerdate:unix)%09%(subject)";

/** `git for-each-ref --format=<FORMAT> refs/heads` (and refs/remotes, for their dates). */
export const REF_FORMAT = FIELDS;

export function parseLocal(stdout: string): LocalBranch[] {
  return stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [name = "", upstream = "", track = "", sha = "", date = "0", ...rest] =
        line.split("\t");
      return {
        name,
        sha,
        upstream,
        ahead: Number(/ahead (\d+)/.exec(track)?.[1] ?? 0),
        behind: Number(/behind (\d+)/.exec(track)?.[1] ?? 0),
        gone: track === "gone",
        date: Number(date) * 1000,
        subject: rest.join("\t"),
      };
    })
    .filter((b) => b.name);
}

/** `git ls-remote --heads <remote>`: branch name → sha. */
export function parseLsRemote(stdout: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of stdout.split("\n")) {
    const [sha, ref] = line.trim().split(/\s+/);
    if (sha && ref?.startsWith("refs/heads/")) out.set(ref.slice(11), sha);
  }
  return out;
}

/** Remote-tracking refs (`origin/feature`) by "remote/name": their last-fetched date and subject. */
export function parseRemoteRefs(stdout: string): Map<string, LocalBranch> {
  return new Map(parseLocal(stdout).map((b) => [b.name, b]));
}

export interface RemoteHeads {
  remote: string;
  heads: Map<string, string>;
  /** "https://github.com/owner/repo/tree/" style prefix for a branch link, or null. */
  web: string | null;
}

export function mergeBranches(input: {
  key: string;
  current: string;
  local: LocalBranch[];
  remotes: RemoteHeads[];
  /** Remote-tracking refs, for dates of branches that exist only remotely. */
  tracking: Map<string, LocalBranch>;
  /** Open pull requests by head branch. */
  prs: Map<string, BranchPr>;
}): Branch[] {
  const names = new Set<string>(input.local.map((b) => b.name));
  for (const r of input.remotes) for (const name of r.heads.keys()) names.add(name);
  const rows: Branch[] = [];
  for (const name of names) {
    if (name === "HEAD") continue;
    const local = input.local.find((b) => b.name === name) ?? null;
    const remotes = input.remotes
      .filter((r) => r.heads.has(name))
      .map((r) => ({
        remote: r.remote,
        sha: r.heads.get(name) as string,
        same: local?.sha === r.heads.get(name),
      }));
    const seen = remotes.map((r) => input.tracking.get(`${r.remote}/${name}`)).find(Boolean);
    const web = input.remotes.find((r) => r.heads.has(name) && r.web)?.web;
    rows.push({
      id: `${input.key}:${name}`,
      name,
      current: name === input.current,
      local,
      remotes,
      pr: input.prs.get(name) ?? null,
      date: local?.date ?? seen?.date ?? 0,
      subject: local?.subject ?? seen?.subject ?? "",
      web: web ? `${web}${name.split("/").map(encodeURIComponent).join("/")}` : null,
    });
  }
  // The checked-out branch, then those with pull requests, then most recent.
  return rows.sort(
    (a, b) =>
      Number(b.current) - Number(a.current) ||
      Number(Boolean(b.pr)) - Number(Boolean(a.pr)) ||
      b.date - a.date,
  );
}
