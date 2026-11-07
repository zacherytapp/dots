// Forgejo (Gitea API) issues to board cards. Pure, so tests feed it fixtures.

import { columnFor, statusFromLabels, type BoardItem } from "../../shared/board-model.ts";

export interface ForgejoIssue {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: "open" | "closed";
  updated_at: string;
  repository?: { full_name: string } | null;
  assignees?: { login: string }[] | null;
  labels?: { name: string; color?: string }[] | null;
  comments?: number;
  /** The branch or tag linked to the issue in its sidebar ("refs/heads/fix-login"), or "". */
  ref?: string | null;
  milestone?: { title: string } | null;
  pull_request?: unknown;
}

/** The branch an issue is linked to, without refs/heads/; tags and empty refs are none. */
export function linkedBranch(ref: string | null | undefined): string | null {
  const r = (ref ?? "").trim();
  if (!r || r.startsWith("refs/tags/")) return null;
  return r.replace(/^refs\/heads\//, "");
}

/** "http://git.lan:3000/" → "http://git.lan:3000". */
export function apiBase(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function issueItem(i: ForgejoIssue, base: string, fallbackSlug = ""): BoardItem {
  const slug = i.repository?.full_name ?? fallbackSlug;
  const assignees = (i.assignees ?? []).map((a) => a.login);
  const labels = (i.labels ?? []).map((l) => l.name);
  const labelColors = Object.fromEntries(
    (i.labels ?? [])
      .filter((l) => /^#?[0-9a-f]{6}$/i.test(l.color ?? ""))
      .map((l) => [l.name, `#${(l.color as string).replace(/^#/, "")}`]),
  );
  const open = i.state === "open";
  const name = slug.split("/").pop() ?? slug;
  return {
    id: `forgejo:${slug}#${i.number}`,
    key: `#${i.number}`,
    title: i.title,
    url: i.html_url,
    column: columnFor(open, assignees, labels),
    status: open ? (statusFromLabels(labels) ?? "Open") : "Closed",
    where: slug,
    assignees,
    labels,
    labelColors,
    comments: i.comments,
    milestone: i.milestone?.title ?? null,
    branches: (() => {
      const name = linkedBranch(i.ref);
      const path = name?.split("/").map(encodeURIComponent).join("/");
      return name ? [{ name, url: `${base}/${slug}/src/branch/${path}` }] : [];
    })(),
    updated: Date.parse(i.updated_at),
    repo: slug,
    tabName: `${name}#${i.number}`,
    task: [
      `Work on Forgejo issue ${slug}#${i.number}: ${i.title}`,
      i.html_url,
      `Its description and comments are at ${base}/api/v1/repos/${slug}/issues/${i.number} and .../comments.`,
    ].join("\n"),
  };
}

/** Merges result pages, one card per issue, issues only (the search can return PRs). */
export function mergeIssues(base: string, pages: ForgejoIssue[][], fallbackSlug = ""): BoardItem[] {
  const out = new Map<string, BoardItem>();
  for (const page of pages) {
    for (const i of page) {
      if (i.pull_request) continue;
      const item = issueItem(i, base, fallbackSlug);
      out.set(item.id, item);
    }
  }
  return [...out.values()];
}
