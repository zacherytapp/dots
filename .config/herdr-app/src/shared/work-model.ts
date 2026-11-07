// Which open branches and pull requests on the remote belong to an issue card. Pure, so tests
// feed it branch names and PRs. A branch belongs when its name carries the issue's number as a
// whole segment ("feat/307-redesign", "fix_12", "issue-12", "gh-12") or its Jira key
// ("WEB-142-login"). A pull request belongs when the tracker links it (GitHub's "closes"), when
// its head branch belongs, or when its title or body mentions "#12" (or the Jira key).

import type { BoardItem, IssueBranch, IssuePull, PullChecks } from "./board-model.ts";

export interface RemotePull {
  number: number;
  title: string;
  url: string;
  draft: boolean;
  head: string;
  body: string;
  /** Its head commit, to look its checks up (Forgejo). */
  sha?: string;
  checks?: PullChecks;
}

/** One repository's open work: its branches (with a web link) and open pull requests. */
export interface RepoWork {
  branches: IssueBranch[];
  pulls: RemotePull[];
}

/** What a card is called on the remote: its number (GitHub, Forgejo) or its Jira key. */
export type IssueRef = { number: number } | { key: string };

export function refOf(item: BoardItem): IssueRef | null {
  const n = /^#(\d+)$/.exec(item.key);
  if (n) return { number: Number(n[1]) };
  return /^[A-Z][A-Z0-9_]*-\d+$/i.test(item.key) ? { key: item.key } : null;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The key as a whole word, any case: "web-142-login" has WEB-142, "WEB-1420" doesn't. */
function keyIn(text: string, key: string): boolean {
  return new RegExp(`(^|[^A-Za-z0-9])${escape(key)}(?![0-9])`, "i").test(text);
}

export function branchNames(name: string, ref: IssueRef): boolean {
  if ("key" in ref) return keyIn(name, ref.key);
  const n = String(ref.number);
  // Split on separators but not dots, so "v1.2" is never issue 2.
  return name
    .split(/[/_-]+/)
    .some((part) => part === n || new RegExp(`^(issues?|gh|fj|#)#?${n}$`, "i").test(part));
}

/** "#12" on its own, not "&#12;", "owner/repo#12" or "#123". */
function mentions(text: string, number: number): boolean {
  return new RegExp(`(^|[^\\w&/#])#${number}(?![0-9])`).test(text);
}

export function pullNames(p: RemotePull, ref: IssueRef): boolean {
  if (branchNames(p.head, ref)) return true;
  const text = `${p.title}\n${p.body}`;
  return "key" in ref ? keyIn(text, ref.key) : mentions(text, ref.number);
}

const toPull = (p: RemotePull | IssuePull): IssuePull => ({
  number: p.number,
  title: p.title,
  url: p.url,
  draft: p.draft,
  ...(p.checks ? { checks: p.checks } : {}),
});

/**
 * Adds `branches` and `pulls` to each card from its repo's open work. `work` is keyed by
 * lower-case "owner/repo"; a card whose repo has no entry keeps what it came with (GitHub's own
 * links), so a repo that couldn't be read never wipes them.
 */
export function attachWork(items: BoardItem[], work: Map<string, RepoWork>): BoardItem[] {
  return items.map((item) => {
    const ref = refOf(item);
    const repo = item.repo ? work.get(item.repo.toLowerCase()) : undefined;
    if (!ref || !repo) return withWorkStatus(item);
    const pulls = new Map<number, IssuePull>();
    for (const p of item.pulls ?? []) pulls.set(p.number, toPull(p));
    for (const p of repo.pulls) if (pullNames(p, ref)) pulls.set(p.number, toPull(p));
    // A branch that is already a PR's head shows as the PR.
    const heads = new Set(repo.pulls.filter((p) => pulls.has(p.number)).map((p) => p.head));
    // Branches the tracker links (Forgejo's issue ref) stay, then those named after the issue.
    const byName = new Map<string, IssueBranch>();
    for (const b of item.branches ?? []) byName.set(b.name, b);
    for (const b of repo.branches)
      if (branchNames(b.name, ref) && !byName.has(b.name)) byName.set(b.name, b);
    const branches = [...byName.values()].filter((b) => !heads.has(b.name));
    return withWorkStatus({
      ...item,
      pulls: [...pulls.values()].sort((a, b) => a.number - b.number),
      branches,
    });
  });
}

/**
 * An open issue the tracker only calls "Open" says how far its work has got: an open pull request
 * means In review, a draft or a branch means In progress. A tracker status (a GitHub Project's
 * Status, a status label) always wins.
 */
export function withWorkStatus(item: BoardItem): BoardItem {
  if (item.column === "done" || item.status !== "Open") return item;
  const pulls = item.pulls ?? [];
  if (pulls.some((p) => !p.draft)) return { ...item, status: "In review", column: "progress" };
  if (pulls.length || item.branches?.length)
    return { ...item, status: "In progress", column: "progress" };
  return item;
}
