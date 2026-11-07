// GitHub GraphQL results to board cards and pull-request rows. Pure, so tests feed it fixtures.

import {
  columnFor,
  columnForStatus,
  statusFromLabels,
  type BoardItem,
  type PullChecks,
} from "./board-model.ts";

/** A status check rollup state ("SUCCESS", "FAILURE", ...) as checks. */
export function rollupChecks(state: string | null | undefined): PullChecks {
  if (!state) return "none";
  if (state === "SUCCESS") return "passing";
  if (state === "FAILURE" || state === "ERROR") return "failing";
  return "pending";
}

type GhCommits = { nodes: { commit: { statusCheckRollup: { state: string } | null } }[] };

export interface GhIssue {
  /** The node id, for the Projects status lookup. */
  id?: string;
  number: number;
  title: string;
  url: string;
  state: string;
  /** Why it closed: COMPLETED, NOT_PLANNED, DUPLICATE (or REOPENED). */
  stateReason?: string | null;
  updatedAt: string;
  repository: { nameWithOwner: string };
  assignees?: { nodes: { login: string }[] };
  labels?: { nodes: { name: string; color?: string }[] };
  comments?: { totalCount: number };
  milestone?: { title: string } | null;
  closedByPullRequestsReferences?: {
    nodes: {
      number: number;
      title: string;
      url: string;
      isDraft: boolean;
      commits?: GhCommits;
    }[];
  };
}

/** The issue's status word: Projects' Status column, a status label, or why it closed. */
export function ghIssueStatus(i: GhIssue, labels: string[], project: string | null): string {
  if (i.state !== "OPEN") {
    if (i.stateReason === "NOT_PLANNED") return "Not planned";
    if (i.stateReason === "DUPLICATE") return "Duplicate";
    return "Closed";
  }
  return project ?? statusFromLabels(labels) ?? "Open";
}

export interface GhPull {
  number: number;
  title: string;
  url: string;
  state: string;
  isDraft: boolean;
  updatedAt: string;
  headRefName: string;
  baseRefName: string;
  additions: number;
  deletions: number;
  repository: { nameWithOwner: string };
  author: { login: string } | null;
  reviewDecision: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED" | null;
  comments: { totalCount: number };
  reviewThreads: { nodes: { isResolved: boolean }[] };
  reviewRequests: { nodes: { requestedReviewer: { login?: string } | null }[] };
  commits: { nodes: { commit: { statusCheckRollup: { state: string } | null } }[] };
}

export type Checks = PullChecks;
export type Review = "approved" | "changes" | "required" | "none";
export type PullGroup = "review" | "mine" | "other";

export type Provider = "github" | "forgejo";

export interface PullItem {
  id: string;
  provider: Provider;
  number: number;
  slug: string;
  title: string;
  url: string;
  draft: boolean;
  author: string;
  head: string;
  base: string;
  additions: number;
  deletions: number;
  updated: number;
  checks: Checks;
  review: Review;
  comments: number;
  unresolved: number;
  group: PullGroup;
  tabName: string;
}

const repoName = (slug: string) => slug.split("/").pop() ?? slug;

/** `project`: the issue's Status in a GitHub Project, when that could be read. */
export function issueItem(i: GhIssue, project: string | null = null): BoardItem {
  const slug = i.repository.nameWithOwner;
  const assignees = (i.assignees?.nodes ?? []).map((a) => a.login);
  const labels = (i.labels?.nodes ?? []).map((l) => l.name);
  const labelColors = Object.fromEntries(
    (i.labels?.nodes ?? []).filter((l) => l.color).map((l) => [l.name, `#${l.color}`]),
  );
  const open = i.state === "OPEN";
  return {
    id: `github:${slug}#${i.number}`,
    key: `#${i.number}`,
    title: i.title,
    url: i.url,
    column: project && open ? columnForStatus(project, open) : columnFor(open, assignees, labels),
    status: ghIssueStatus(i, labels, project),
    where: slug,
    assignees,
    labels,
    labelColors,
    comments: i.comments?.totalCount,
    milestone: i.milestone?.title ?? null,
    pulls: (i.closedByPullRequestsReferences?.nodes ?? []).map((p) => ({
      number: p.number,
      title: p.title,
      url: p.url,
      draft: p.isDraft,
      checks: rollupChecks(p.commits?.nodes[0]?.commit.statusCheckRollup?.state),
    })),
    updated: Date.parse(i.updatedAt),
    repo: slug,
    tabName: `${repoName(slug)}#${i.number}`,
    task: [
      `Work on GitHub issue ${slug}#${i.number}: ${i.title}`,
      i.url,
      `Read it first with \`gh issue view ${i.number} -R ${slug} --comments\`.`,
    ].join("\n"),
  };
}

function checksOf(p: GhPull): Checks {
  return rollupChecks(p.commits.nodes[0]?.commit.statusCheckRollup?.state);
}

function reviewOf(p: GhPull): Review {
  if (p.reviewDecision === "APPROVED") return "approved";
  if (p.reviewDecision === "CHANGES_REQUESTED") return "changes";
  if (p.reviewDecision === "REVIEW_REQUIRED") return "required";
  return "none";
}

export function pullItem(p: GhPull, viewer: string): PullItem {
  const slug = p.repository.nameWithOwner;
  const author = p.author?.login ?? "ghost";
  const asked = p.reviewRequests.nodes.some((r) => r.requestedReviewer?.login === viewer);
  return {
    id: `github:${slug}!${p.number}`,
    provider: "github",
    number: p.number,
    slug,
    title: p.title,
    url: p.url,
    draft: p.isDraft,
    author,
    head: p.headRefName,
    base: p.baseRefName,
    additions: p.additions,
    deletions: p.deletions,
    updated: Date.parse(p.updatedAt),
    checks: checksOf(p),
    review: reviewOf(p),
    comments: p.comments.totalCount,
    unresolved: p.reviewThreads.nodes.filter((n) => !n.isResolved).length,
    group: asked ? "review" : author === viewer ? "mine" : "other",
    tabName: `${repoName(slug)}#${p.number}`,
  };
}

export type PullAction = "review" | "comments" | "checks";

export function pullTask(p: PullItem, action: PullAction): string {
  const ref = `${p.slug}#${p.number}`;
  const head = `Pull request ${ref}: ${p.title}\n${p.url}`;
  const never = "Don't push, comment or post a review without asking.";
  if (p.provider === "forgejo") {
    // No gh here: the PR head is fetchable as a ref, and the API has its comments and statuses.
    const fetch = `git fetch origin pull/${p.number}/head:pr-${p.number}`;
    if (action === "review") {
      return `${head}\nReview it: \`${fetch}\` and \`git diff ${p.base}...pr-${p.number}\`, then report concrete findings. ${never}`;
    }
    if (action === "comments") {
      return `${head}\nAddress the open review comments (see the PR page) on branch ${p.head}: make the fixes and summarize what changed. ${never}`;
    }
    return `${head}\nThe checks on branch ${p.head} are failing: find the failing workflow runs in the repository's Actions page, fix them and summarize. ${never}`;
  }
  if (action === "review") {
    return `${head}\nReview it: read it with \`gh pr view ${p.number} -R ${p.slug} --comments\` and \`gh pr diff ${p.number} -R ${p.slug}\`, then report concrete findings. ${never}`;
  }
  if (action === "comments") {
    return `${head}\nAddress the open review comments: \`gh pr checkout ${p.number} -R ${p.slug}\`, read them with \`gh pr view ${p.number} -R ${p.slug} --comments\`, make the fixes and summarize what changed. ${never}`;
  }
  return `${head}\nThe checks are failing: \`gh pr checkout ${p.number} -R ${p.slug}\`, find the failures with \`gh pr checks ${p.number} -R ${p.slug}\` and \`gh run view --log-failed\`, fix them and summarize. ${never}`;
}

/** "2026-10-24" for `closed:>=` searches. */
export function sinceDate(days: number, now = Date.now()): string {
  return new Date(now - days * 86400000).toISOString().slice(0, 10);
}
