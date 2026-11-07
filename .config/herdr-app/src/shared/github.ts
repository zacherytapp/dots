// GitHub through the `gh` CLI on this computer (its login, nothing stored here): one GraphQL
// request per refresh. "This space" is the repo the shown space's terminal is in.

import { exec, type SpaceInfo } from "herdr";
import type { BoardItem } from "./board-model.ts";
import { loadConfig } from "./config.ts";
import {
  issueItem,
  pullItem,
  sinceDate,
  type GhIssue,
  type GhPull,
  type PullItem,
} from "./github-model.ts";
import type { Loaded, Scope } from "./list-view.ts";
import { repoOf } from "./repo.ts";

const ISSUE = `id number title url state stateReason updatedAt repository { nameWithOwner }
  assignees(first: 5) { nodes { login } } labels(first: 10) { nodes { name color } }
  comments { totalCount } milestone { title }
  closedByPullRequestsReferences(first: 5, includeClosedPrs: false) {
    nodes { number title url isDraft commits(last: 1) { nodes { commit { statusCheckRollup { state } } } } } }`;

/** Set when the token can't read Projects (no read:project scope): not asked again for a while. */
let projectsOffUntil = 0;

/**
 * Each open issue's Status in the GitHub Projects it is on (the first that has one), by node id.
 * Needs the read:project scope (`gh auth refresh -s read:project`); without it, nothing.
 */
async function projectStatuses(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!ids.length || Date.now() < projectsOffUntil) return out;
  type Node = {
    id?: string;
    projectItems?: { nodes: { fieldValueByName: { name?: string } | null }[] };
  } | null;
  try {
    const data = await graphql<{ nodes: Node[] }>(
      `query { nodes(ids: ${JSON.stringify(ids)}) { ... on Issue { id
        projectItems(first: 5) { nodes { fieldValueByName(name: "Status") {
          ... on ProjectV2ItemFieldSingleSelectValue { name } } } } } } }`,
      {},
    );
    for (const n of data.nodes) {
      const status = n?.projectItems?.nodes.map((p) => p.fieldValueByName?.name).find(Boolean);
      if (n?.id && status) out.set(n.id, status);
    }
  } catch {
    projectsOffUntil = Date.now() + 10 * 60000;
  }
  return out;
}

const PULL = `number title url state isDraft updatedAt headRefName baseRefName additions deletions
  repository { nameWithOwner } author { login } reviewDecision comments { totalCount }
  reviewThreads(first: 50) { nodes { isResolved } }
  reviewRequests(first: 10) { nodes { requestedReviewer { ... on User { login } } } }
  commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }`;

export async function graphql<T>(query: string, vars: Record<string, string | number>): Promise<T> {
  const args = ["api", "graphql", "-f", `query=${query}`];
  for (const [k, v] of Object.entries(vars))
    args.push(typeof v === "number" ? "-F" : "-f", `${k}=${v}`);
  const r = await exec("gh", args);
  if (r.code !== 0) {
    if (/auth login|not logged/i.test(r.stderr))
      throw new Error("gh is not signed in: run `gh auth login`.");
    throw new Error(r.stderr.trim() || `gh exited ${r.code}`);
  }
  const body = JSON.parse(r.stdout) as { data?: T; errors?: { message: string }[] };
  if (!body.data)
    throw new Error(body.errors?.map((e) => e.message).join("; ") || "GitHub returned nothing.");
  return body.data;
}

/** The shown space's GitHub "owner/name", or why there is none. */
async function spaceSlug(space: SpaceInfo | null): Promise<{ slug: string | null; note: string }> {
  if (!space) return { slug: null, note: "No space is shown." };
  const repo = await repoOf(space);
  if (!repo.root) return { slug: null, note: `${space.name} isn't in a git repository.` };
  const remote = repo.remotes.find((r) => r.host === "github.com");
  return remote
    ? { slug: remote.slug, note: "" }
    : { slug: null, note: `${space.name} has no GitHub remote.` };
}

export async function loadIssues(
  scope: Scope,
  space: SpaceInfo | null,
): Promise<Loaded<BoardItem>> {
  const config = await loadConfig();
  let filter = "involves:@me archived:false";
  let caption = "All spaces · involving you";
  if (scope === "space") {
    const { slug, note } = await spaceSlug(space);
    if (!slug) return { items: [], note, caption: `This space · ${space?.name ?? ""}` };
    filter = `repo:${slug}`;
    caption = `This space · ${slug}`;
  }
  const data = await graphql<{ open: { nodes: GhIssue[] }; closed: { nodes: GhIssue[] } }>(
    `query($open: String!, $closed: String!, $n: Int!) {
      open: search(query: $open, type: ISSUE, first: $n) { nodes { ... on Issue { ${ISSUE} } } }
      closed: search(query: $closed, type: ISSUE, first: $n) { nodes { ... on Issue { ${ISSUE} } } }
    }`,
    {
      open: `${filter} is:issue is:open sort:updated-desc`,
      closed: `${filter} is:issue is:closed closed:>=${sinceDate(config.github.closedDays)} sort:updated-desc`,
      n: config.github.limit,
    },
  );
  const nodes = [...data.open.nodes, ...data.closed.nodes].filter((n) => n && "number" in n);
  const projects = await projectStatuses(
    data.open.nodes.map((n) => n?.id).filter((id): id is string => Boolean(id)),
  );
  return { items: nodes.map((n) => issueItem(n, (n.id && projects.get(n.id)) || null)), caption };
}

export async function loadPulls(scope: Scope, space: SpaceInfo | null): Promise<Loaded<PullItem>> {
  const config = await loadConfig();
  let filter = "involves:@me archived:false";
  let caption = "All spaces · involving you";
  if (scope === "space") {
    const { slug, note } = await spaceSlug(space);
    if (!slug) return { items: [], note, caption: `This space · ${space?.name ?? ""}` };
    filter = `repo:${slug}`;
    caption = `This space · ${slug}`;
  }
  const data = await graphql<{ viewer: { login: string }; open: { nodes: GhPull[] } }>(
    `query($q: String!, $n: Int!) {
      viewer { login }
      open: search(query: $q, type: ISSUE, first: $n) { nodes { ... on PullRequest { ${PULL} } } }
    }`,
    { q: `${filter} is:pr is:open sort:updated-desc`, n: config.github.limit },
  );
  const nodes = data.open.nodes.filter((n) => n && "number" in n);
  return { items: nodes.map((p) => pullItem(p, data.viewer.login)), caption };
}
