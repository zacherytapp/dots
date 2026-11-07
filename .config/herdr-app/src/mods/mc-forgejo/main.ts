// Issues on your Forgejo server as a board. This space: the shown space's repo when one of its
// remotes is on the server (its web host or an ssh alias in `sshHosts`). All spaces: issues
// assigned to you, created by you or mentioning you. Needs `forgejo.url` in
// mission-control.json; the token is asked for in the panel when there is none.

import type { SpaceInfo } from "herdr";
import { BoardView } from "../../shared/board.ts";
import type { BoardItem } from "../../shared/board-model.ts";
import { loadConfig } from "../../shared/config.ts";
import { forgejo, TokenError } from "../../shared/forgejo.ts";
import type { Loaded, Scope } from "../../shared/list-view.ts";
import { repoOf } from "../../shared/repo.ts";
import { targetsFor, withWork } from "../../shared/work.ts";
import { mergeIssues, type ForgejoIssue } from "./model.ts";

const SETUP = {
  title: "Connect your Forgejo server",
  body: 'Set "forgejo": { "url": "https://your-forgejo" } in ~/.config/herdr-app/mission-control.json.',
};

export default class ForgejoIssues extends BoardView {
  source(): string {
    return "forgejo";
  }

  placeholder(): string {
    return "Search Forgejo issues";
  }

  async fetch(scope: Scope, space: SpaceInfo | null): Promise<Loaded<BoardItem>> {
    const fj = await forgejo();
    if (!fj) return { setup: SETUP };
    const config = (await loadConfig()).forgejo;
    const since = encodeURIComponent(
      new Date(Date.now() - config.closedDays * 86400000).toISOString(),
    );
    const limit = `limit=${config.limit}`;
    try {
      if (scope === "space") {
        if (!space) return { items: [], note: "No space is shown." };
        const repo = await repoOf(space);
        const remote = repo.remotes.find((r) => fj.isRemote(r));
        if (!remote) {
          return {
            items: [],
            note: `${space.name} has no remote on ${fj.host}.`,
            caption: `This space · ${space.name}`,
          };
        }
        const path = `/repos/${remote.slug}/issues?type=issues&${limit}`;
        const pages = await Promise.all([
          fj.get<ForgejoIssue[]>(`${path}&state=open`),
          fj.get<ForgejoIssue[]>(`${path}&state=closed&since=${since}`),
        ]);
        const found = await withWork(
          mergeIssues(fj.base, pages, remote.slug),
          [{ provider: "forgejo", slug: remote.slug }],
          fj,
        );
        return { ...found, caption: `This space · ${remote.slug}` };
      }
      if (!fj.token) return { token: fj.ask(false), caption: `All spaces · ${fj.host}` };
      const search = `/repos/issues/search?type=issues&${limit}`;
      const pages = await Promise.all([
        fj.get<ForgejoIssue[]>(`${search}&state=open&assigned=true`),
        fj.get<ForgejoIssue[]>(`${search}&state=open&created=true`),
        fj.get<ForgejoIssue[]>(`${search}&state=open&mentioned=true`),
        fj.get<ForgejoIssue[]>(`${search}&state=closed&assigned=true&since=${since}`),
        fj.get<ForgejoIssue[]>(`${search}&state=closed&created=true&since=${since}`),
      ]);
      const merged = mergeIssues(fj.base, pages);
      const found = await withWork(merged, targetsFor(merged, "forgejo"), fj);
      return { ...found, caption: `All spaces · ${fj.host}` };
    } catch (e) {
      if (e instanceof TokenError) return { token: e.ask, caption: fj.host };
      throw e;
    }
  }
}
