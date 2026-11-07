// Jira issues as a board, grouped by status category (To do / In progress / Done). This
// space: the project `jira.projects` maps the shown space's repo to. All spaces: `jira.jql`
// (yours, open or resolved in the last two weeks). Needs `jira.site` and a token in
// mission-control.json: Cloud uses email + API token, Server / Data Center a bearer token.

import type { SpaceInfo } from "herdr";
import { BoardView } from "../../shared/board.ts";
import type { BoardItem } from "../../shared/board-model.ts";
import { loadConfig, readSecret } from "../../shared/config.ts";
import type { Loaded, Scope, TokenAsk } from "../../shared/list-view.ts";
import { forgejo, type Forgejo } from "../../shared/forgejo.ts";
import { repoOf, spacesForSlug } from "../../shared/repo.ts";
import type { Remote } from "../../shared/remote.ts";
import { targetOf, withWork, type WorkTarget } from "../../shared/work.ts";
import {
  base64,
  issueItem,
  projectFor,
  projectJql,
  searchUrl,
  site,
  type JiraIssue,
} from "./model.ts";

const SETUP = {
  title: "Connect Jira",
  body: 'Set "jira": { "site": "https://you.atlassian.net", "email": "you@example.com" } in ~/.config/herdr-app/mission-control.json (for Server / Data Center: "auth": "bearer" with a personal access token). Map repos to projects with "projects": { "owner/repo": "KEY" }.',
};

export default class JiraIssues extends BoardView {
  source(): string {
    return "jira";
  }

  placeholder(): string {
    return "Search Jira issues";
  }

  async fetch(scope: Scope, space: SpaceInfo | null): Promise<Loaded<BoardItem>> {
    const config = (await loadConfig()).jira;
    if (!config.site) return { setup: SETUP };
    if (config.auth === "basic" && !config.email)
      throw new Error("Jira Cloud needs jira.email with the API token.");
    const base = site(config.site);
    const ask = (refused: boolean): TokenAsk => ({
      service: "jira",
      title: refused ? "Jira refused the token" : "Add a Jira token",
      body:
        config.auth === "bearer"
          ? "Paste a personal access token (Profile → Personal Access Tokens)."
          : `Paste an API token for ${config.email}.`,
      createUrl:
        config.auth === "bearer"
          ? `${base}/secure/ViewProfile.jspa`
          : "https://id.atlassian.com/manage-profile/security/api-tokens",
    });
    const token = await readSecret(config, "jira");
    if (!token) return { token: ask(false) };

    let jql = config.jql;
    let repo: string | null = null;
    let remote: Remote | null = null;
    let caption = "All spaces · your issues";
    if (scope === "space") {
      if (!space) return { items: [], note: "No space is shown." };
      const remotes = (await repoOf(space)).remotes;
      const hit = remotes
        .map((r) => ({ r, key: projectFor(config.projects, r.slug) }))
        .find((x) => x.key);
      if (!hit?.key) {
        return {
          items: [],
          note: `${space.name} isn't mapped to a Jira project. Add "${remotes[0]?.slug ?? space.name}": "KEY" to jira.projects.`,
          caption: `This space · ${space.name}`,
        };
      }
      jql = projectJql(hit.key);
      repo = hit.r.slug;
      remote = hit.r;
      caption = `This space · ${hit.key}`;
    }

    const auth =
      config.auth === "bearer" ? `Bearer ${token}` : `Basic ${base64(`${config.email}:${token}`)}`;
    const r = await fetch(searchUrl(base, config.auth, jql, config.limit), {
      headers: { Accept: "application/json", Authorization: auth },
    });
    if (r.status === 401 || r.status === 403) return { token: ask(true), caption };
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      const why = /"errorMessages":\["([^"]+)/.exec(text)?.[1];
      throw new Error(why ? `Jira: ${why}` : `Jira answered ${r.status}.`);
    }
    const body = (await r.json()) as { issues?: JiraIssue[] };
    const items = (body.issues ?? []).map((i) => issueItem(i, base, config.projects, repo));
    const fj = await forgejo().catch(() => null);
    const found = await withWork(items, await jiraTargets(items, remote, fj), fj);
    return { ...found, caption };
  }
}

/**
 * Where each card's repo keeps its branches: the shown space's remote, else (All spaces) the
 * remote of a space that has the repo `jira.projects` maps the card to.
 */
async function jiraTargets(
  items: BoardItem[],
  remote: Remote | null,
  fj: Forgejo | null,
): Promise<WorkTarget[]> {
  if (remote) {
    const t = targetOf(remote, fj);
    return t ? [t] : [];
  }
  const slugs = [...new Set(items.map((i) => i.repo).filter((s): s is string => Boolean(s)))];
  const targets = await Promise.all(
    slugs.map(async (slug) => {
      for (const space of await spacesForSlug(slug)) {
        const repo = await repoOf(space).catch(() => null);
        const hit = repo?.remotes.find((r) => r.slug.toLowerCase() === slug.toLowerCase());
        const t = hit ? targetOf(hit, fj) : null;
        if (t) return t;
      }
      return null;
    }),
  );
  return targets.filter((t): t is WorkTarget => t !== null);
}
