// Forgejo (Gitea API) pull requests to the same rows as GitHub's. Pure, so tests feed it fixtures.

import type { Checks, PullItem, Review } from "./github-model.ts";

export interface ForgejoPull {
  number: number;
  title: string;
  html_url: string;
  body?: string | null;
  draft?: boolean;
  updated_at: string;
  comments?: number;
  review_comments?: number;
  additions?: number;
  deletions?: number;
  user?: { login: string } | null;
  head?: { ref: string; sha: string } | null;
  base?: { ref: string; repo?: { full_name: string } | null } | null;
  requested_reviewers?: { login: string }[] | null;
}

export interface ForgejoReview {
  state: string;
  user?: { login: string } | null;
  stale?: boolean;
  dismissed?: boolean;
}

/** A combined commit status ("success", "failure", "pending", "error", "") to checks. */
export function checksOf(state: string | null | undefined): Checks {
  if (state === "success") return "passing";
  if (state === "failure" || state === "error") return "failing";
  if (state === "pending" || state === "warning") return "pending";
  return "none";
}

/** The latest review per reviewer decides: changes requested wins, then approved. */
export function reviewOf(reviews: ForgejoReview[], requested: number): Review {
  const latest = new Map<string, string>();
  for (const r of reviews) {
    if (r.dismissed || r.stale || !r.user) continue;
    if (r.state === "APPROVED" || r.state === "REQUEST_CHANGES") latest.set(r.user.login, r.state);
  }
  const states = [...latest.values()];
  if (states.includes("REQUEST_CHANGES")) return "changes";
  if (states.includes("APPROVED")) return "approved";
  return requested > 0 ? "required" : "none";
}

export function forgejoPull(
  p: ForgejoPull,
  slug: string,
  viewer: string,
  checks: Checks,
  reviews: ForgejoReview[],
): PullItem {
  const author = p.user?.login ?? "ghost";
  const requested = p.requested_reviewers ?? [];
  const asked = requested.some((r) => r.login === viewer);
  const name = slug.split("/").pop() ?? slug;
  return {
    id: `forgejo:${slug}!${p.number}`,
    provider: "forgejo",
    number: p.number,
    slug,
    title: p.title.replace(/^(WIP|Draft):\s*/i, ""),
    url: p.html_url,
    draft: Boolean(p.draft) || /^(WIP|Draft):/i.test(p.title),
    author,
    head: p.head?.ref ?? "",
    base: p.base?.ref ?? "",
    additions: p.additions ?? 0,
    deletions: p.deletions ?? 0,
    updated: Date.parse(p.updated_at),
    checks,
    review: reviewOf(reviews, requested.length),
    comments: (p.comments ?? 0) + (p.review_comments ?? 0),
    unresolved: 0,
    group: asked ? "review" : author === viewer ? "mine" : "other",
    tabName: `${name}#${p.number}`,
  };
}
