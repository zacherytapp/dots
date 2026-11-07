// Jira search results to board cards, plus the bits of request building that are easy to get
// wrong. Pure, so tests cover them.

import type { BoardItem, Column } from "../../shared/board-model.ts";

export interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    updated: string;
    status?: { name: string; statusCategory?: { key: string } } | null;
    priority?: { name: string } | null;
    assignee?: { displayName: string } | null;
    project?: { key: string; name: string } | null;
    labels?: string[] | null;
    comment?: { total?: number } | null;
  };
}

export const FIELDS = "summary,status,priority,assignee,project,labels,comment,updated";

export function columnOf(category: string | undefined): Column {
  if (category === "done") return "done";
  if (category === "indeterminate") return "progress";
  return "todo";
}

export function site(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/** Cloud (basic auth) uses the v3 `search/jql` endpoint; Server / Data Center uses v2 `search`. */
export function searchUrl(
  base: string,
  auth: "basic" | "bearer",
  jql: string,
  limit: number,
): string {
  const q = `jql=${encodeURIComponent(jql)}&maxResults=${limit}&fields=${FIELDS}`;
  return auth === "basic" ? `${base}/rest/api/3/search/jql?${q}` : `${base}/rest/api/2/search?${q}`;
}

/** The JQL for one project: open work plus what was resolved recently. */
export function projectJql(project: string, days = 14): string {
  return `project = "${project.replace(/"/g, "")}" AND (statusCategory != Done OR resolved >= -${days}d) ORDER BY updated DESC`;
}

/** The project key for a repo, by "owner/name" first, then by name. */
export function projectFor(projects: Record<string, string>, slug: string): string | null {
  const name = slug.split("/").pop() ?? slug;
  const lower = Object.fromEntries(Object.entries(projects).map(([k, v]) => [k.toLowerCase(), v]));
  return lower[slug.toLowerCase()] ?? lower[name.toLowerCase()] ?? null;
}

/** The repo mapped to a project, for starting work in the right space. */
export function repoFor(projects: Record<string, string>, project: string): string | null {
  const hit = Object.entries(projects).find(
    ([, key]) => key.toLowerCase() === project.toLowerCase(),
  );
  return hit && hit[0].includes("/") ? hit[0] : null;
}

export function issueItem(
  i: JiraIssue,
  base: string,
  projects: Record<string, string>,
  repo: string | null,
): BoardItem {
  const f = i.fields;
  const project = f.project?.key ?? i.key.split("-")[0];
  const url = `${base}/browse/${i.key}`;
  return {
    id: `jira:${i.key}`,
    key: i.key,
    title: f.summary,
    url,
    column: columnOf(f.status?.statusCategory?.key),
    status: f.status?.name ?? "",
    where: f.project?.name ?? project,
    priority: f.priority?.name ?? null,
    assignees: f.assignee ? [f.assignee.displayName] : [],
    labels: f.labels ?? [],
    comments: f.comment?.total,
    updated: Date.parse(f.updated),
    repo: repo ?? repoFor(projects, project),
    tabName: i.key,
    task: `Work on Jira issue ${i.key}: ${f.summary}\n${url}`,
  };
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Base64 of UTF-8 text, without btoa or Buffer (neither is promised in a mod). */
export function base64(text: string): string {
  const bytes: number[] = [];
  for (const ch of text) {
    const c = ch.codePointAt(0) as number;
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else
      bytes.push(
        0xf0 | (c >> 18),
        0x80 | ((c >> 12) & 63),
        0x80 | ((c >> 6) & 63),
        0x80 | (c & 63),
      );
  }
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b, c] = [bytes[i], bytes[i + 1], bytes[i + 2]];
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += b === undefined ? "=" : B64[(n >> 6) & 63];
    out += c === undefined ? "=" : B64[n & 63];
  }
  return out;
}
