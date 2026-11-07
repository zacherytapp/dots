// Every branch of the shown space's repository (or of every space's, in All spaces), local and
// remote together: whether it is local only, remote only or on both and in step, ahead/behind
// its upstream, its last commit, and the open GitHub or Forgejo pull request whose head it is.
// Remote branches come from `git ls-remote` on the space's own machine, so they are current and
// use that machine's own git access; a remote that can't be reached falls back to what the last
// fetch saw.

import { div, svg, type Cx, type El } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { exec, spaces, type SpaceInfo } from "herdr";
import { forgejo, TokenError, type Forgejo } from "../../shared/forgejo.ts";
import type { ForgejoPull } from "../../shared/forgejo-model.ts";
import { copyText, openUrl } from "../../shared/launch.ts";
import { ListView, type Loaded, type Scope, type TokenAsk } from "../../shared/list-view.ts";
import { repoOf, type SpaceRepo } from "../../shared/repo.ts";
import { asset, chromeIcon, countChip, iconButton, type Theme } from "../../shared/ui.ts";
import { ago, matches } from "../../shared/util.ts";
import {
  kindOf,
  mergeBranches,
  parseLocal,
  parseLsRemote,
  parseRemoteRefs,
  REF_FORMAT,
  type Branch,
  type BranchPr,
  type RemoteHeads,
} from "./model.ts";

interface Item extends Branch {
  /** "owner/repo" (or the folder), for All spaces. */
  repo: string;
  machine: string | null;
}

type Filter = "all" | "local" | "remote" | "pr";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "local", label: "Local only" },
  { id: "remote", label: "Remote only" },
  { id: "pr", label: "With PR" },
];

const LS_REMOTE =
  'GIT_TERMINAL_PROMPT=0 GIT_SSH_COMMAND="ssh -o BatchMode=yes -o ConnectTimeout=8" git ls-remote --heads "$1"';

interface RepoResult {
  items: Item[];
  warnings: string[];
  token: TokenAsk | null;
}

async function githubPrs(slug: string): Promise<Map<string, BranchPr>> {
  const r = await exec("gh", [
    "pr",
    "list",
    "-R",
    slug,
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,url,headRefName,isDraft",
  ]);
  if (r.code !== 0) throw new Error(r.stderr.trim() || `gh exited ${r.code}`);
  const list = JSON.parse(r.stdout) as {
    number: number;
    title: string;
    url: string;
    headRefName: string;
    isDraft: boolean;
  }[];
  return new Map(
    list.map((p) => [
      p.headRefName,
      { number: p.number, title: p.title, url: p.url, draft: p.isDraft, provider: "github" },
    ]),
  );
}

async function forgejoPrs(fj: Forgejo, slug: string): Promise<Map<string, BranchPr>> {
  const list = await fj.get<ForgejoPull[]>(`/repos/${slug}/pulls?state=open&limit=50`);
  return new Map(
    list
      .filter((p) => p.head?.ref)
      .map((p) => [
        p.head?.ref as string,
        {
          number: p.number,
          title: p.title,
          url: p.html_url,
          draft: Boolean(p.draft),
          provider: "forgejo",
        },
      ]),
  );
}

async function loadRepo(repo: SpaceRepo, label: string, fj: Forgejo | null): Promise<RepoResult> {
  const on = repo.machine ?? undefined;
  const cwd = repo.root as string;
  const git = (...args: string[]) => exec("git", args, { cwd, on });
  const warnings: string[] = [];
  let token: TokenAsk | null = null;
  const [local, current, tracking] = await Promise.all([
    git("for-each-ref", `--format=${REF_FORMAT}`, "refs/heads"),
    git("branch", "--show-current"),
    git("for-each-ref", `--format=${REF_FORMAT}`, "refs/remotes"),
  ]);
  const trackingRefs = parseRemoteRefs(tracking.stdout);

  const remotes: RemoteHeads[] = [];
  const prs = new Map<string, BranchPr>();
  await Promise.all(
    repo.remotes.map(async (remote) => {
      const name = remote.remoteName ?? "origin";
      const onForgejo = fj?.isRemote(remote) ?? false;
      const web =
        remote.host === "github.com"
          ? `https://github.com/${remote.slug}/tree/`
          : onForgejo && fj
            ? `${fj.base}/${remote.slug}/src/branch/`
            : null;
      const ls = await exec("sh", ["-c", LS_REMOTE, "sh", name], { cwd, on }).catch(() => null);
      let heads = ls?.code === 0 ? parseLsRemote(ls.stdout) : null;
      if (!heads) {
        // Unreachable: what the last fetch saw.
        warnings.push(`${label}: couldn't reach ${name}, showing its last fetch`);
        heads = new Map(
          [...trackingRefs]
            .filter(([ref]) => ref.startsWith(`${name}/`))
            .map(([ref, b]) => [ref.slice(name.length + 1), b.sha]),
        );
      }
      remotes.push({ remote: name, heads, web });
      try {
        const found =
          remote.host === "github.com"
            ? await githubPrs(remote.slug)
            : onForgejo && fj
              ? await forgejoPrs(fj, remote.slug)
              : new Map<string, BranchPr>();
        for (const [head, pr] of found) if (!prs.has(head)) prs.set(head, pr);
      } catch (e) {
        if (e instanceof TokenError) token = e.ask;
        else warnings.push(`${label}: pull requests from ${name} unavailable`);
      }
    }),
  );
  remotes.sort((a, b) => (a.remote === "origin" ? -1 : b.remote === "origin" ? 1 : 0));

  const branches = mergeBranches({
    key: `${repo.machine ?? ""}:${cwd}`,
    current: current.stdout.trim(),
    local: parseLocal(local.stdout),
    remotes,
    tracking: trackingRefs,
    prs,
  });
  return {
    items: branches.map((b) => ({ ...b, repo: label, machine: repo.machine })),
    warnings,
    token,
  };
}

export default class Branches extends ListView<Item> {
  declare filter: Filter;

  init(props: unknown, cx: Cx): void {
    this.filter = "all";
    super.init(props, cx);
  }

  source(): string {
    return "branches";
  }

  noun(): string {
    return "branches";
  }

  placeholder(): string {
    return "Search branches";
  }

  interval(): number {
    return 3 * 60000;
  }

  async fetch(scope: Scope, space: SpaceInfo | null): Promise<Loaded<Item>> {
    const fj = await forgejo();
    const targets = scope === "space" ? (space ? [space] : []) : spaces();
    if (!targets.length) return { items: [], note: "No space is shown." };
    // One look per repository, however many spaces are in it.
    const repos = new Map<string, { repo: SpaceRepo; label: string }>();
    for (const s of targets) {
      const repo = await repoOf(s).catch(() => null);
      if (!repo?.root) continue;
      const key = `${repo.machine ?? ""}:${repo.root}`;
      const label = repo.remotes[0]?.slug ?? repo.root.split("/").pop() ?? s.name;
      if (!repos.has(key))
        repos.set(key, { repo, label: repo.machine ? `${label} · ${repo.machine}` : label });
    }
    if (!repos.size) {
      return {
        items: [],
        note:
          scope === "space"
            ? `${space?.name ?? "This space"} isn't in a git repository.`
            : "No space is in a git repository.",
      };
    }
    const results = await Promise.all(
      [...repos.values()].map(({ repo, label }) =>
        loadRepo(repo, label, fj).catch((e: unknown): RepoResult => ({
          items: [],
          warnings: [`${label}: ${String((e as Error)?.message ?? e)}`],
          token: null,
        })),
      ),
    );
    const only = [...repos.values()][0];
    return {
      items: results.flatMap((r) => r.items),
      caption:
        scope === "space"
          ? `This space · ${only.label}`
          : `All spaces · ${repos.size} repositories`,
      warning: results.flatMap((r) => r.warnings).join("; "),
      token: results.find((r) => r.token)?.token ?? undefined,
    };
  }

  visible(items: Item[], query: string): Item[] {
    return items.filter((b) =>
      matches(query, b.name, b.subject, b.repo, b.pr ? `#${b.pr.number} ${b.pr.title}` : ""),
    );
  }

  shown(items: Item[]): Item[] {
    if (this.filter === "local") return items.filter((b) => kindOf(b) === "local");
    if (this.filter === "remote") return items.filter((b) => kindOf(b) === "remote");
    if (this.filter === "pr") return items.filter((b) => b.pr);
    return items;
  }

  subbar(_t: Theme, items: Item[]): El {
    const count = (f: Filter) => {
      const keep = this.filter;
      this.filter = f;
      const n = this.shown(items).length;
      this.filter = keep;
      return n;
    };
    return h_flex()
      .flex_none()
      .px(14)
      .pt(10)
      .gap(4)
      .items_center()
      .children(
        FILTERS.map((f) =>
          countChip(`filter-${f.id}`, f.label, count(f.id), this.filter === f.id, (cx) => {
            this.filter = f.id;
            cx.notify();
          }),
        ),
      );
  }

  body(t: Theme, items: Item[], _cx: Cx): El {
    const shown = this.shown(items);
    const all = this.scope() === "all";
    const repos = [...new Set(shown.map((b) => b.repo))];
    return v_flex()
      .id("branches")
      .flex_1()
      .min_h(0)
      .px(8)
      .pb(14)
      .gap(1)
      .overflow_y_scrollbar()
      .children(
        repos.flatMap((repo) => [
          ...(all
            ? [
                h_flex()
                  .h(26)
                  .pt(6)
                  .px(6)
                  .gap(7)
                  .items_center()
                  .text_size(12)
                  .text_color(t.muted)
                  .child(repo)
                  .child(
                    div()
                      .text_size(11)
                      .text_color(t.dim)
                      .child(String(shown.filter((b) => b.repo === repo).length)),
                  ),
              ]
            : []),
          ...shown.filter((b) => b.repo === repo).map((b) => this.row(t, b)),
        ]),
      );
  }

  pill(t: Theme, text: string, color: string, tooltip: string): El {
    return div()
      .flex_none()
      .px(5)
      .h(17)
      .flex()
      .items_center()
      .rounded(4)
      .border(1)
      .border_color(t.border)
      .text_size(10.5)
      .text_color(color)
      .tooltip(tooltip)
      .child(text);
  }

  row(t: Theme, b: Item): El {
    const kind = kindOf(b);
    const remoteNames = b.remotes.map((r) => r.remote).join(", ");
    const inStep = kind === "both" && b.remotes.every((r) => r.same);
    const where =
      kind === "local"
        ? this.pill(t, "local only", t.working, "Not on any remote")
        : kind === "remote"
          ? this.pill(t, "remote only", t.ansi4, `Only on ${remoteNames}`)
          : this.pill(
              t,
              inStep ? "synced" : "local + remote",
              inStep ? t.ansi2 : t.muted,
              inStep ? `Same commit on ${remoteNames}` : `On ${remoteNames}, at a different commit`,
            );
    const link = b.pr?.url ?? b.web;
    return v_flex()
      .id(`branch-${b.id}`)
      .flex_none()
      .px(8)
      .py(6)
      .gap(3)
      .rounded(8)
      .cursor_pointer()
      .when(b.current, (el: El) => el.bg(t.selected))
      .hover((s: El) => s.bg(t.hover))
      .when(Boolean(link), (el: El) => el.on_click(() => void openUrl(link as string)))
      .on_mouse_down("right", (_e: unknown, cx: Cx) => {
        cx.stop_propagation();
        void copyText(b.name);
      })
      .tooltip(
        link
          ? `Open ${b.pr ? `#${b.pr.number}` : "on the web"} · right-click copies the name`
          : "Right-click copies the name",
      )
      .child(
        h_flex()
          .gap(7)
          .items_center()
          .child(
            svg(chromeIcon("git-branch"))
              .size(13)
              .flex_none()
              .text_color(b.current ? t.accent : t.dim),
          )
          .child(
            div()
              .min_w(0)
              .truncate()
              .text_size(13)
              .text_color(b.current ? t.foreground : t.muted)
              .when(b.current, (el: El) => el.font_medium())
              .child(b.name),
          )
          .child(where)
          .when(Boolean(b.local?.gone), (el: El) =>
            el.child(this.pill(t, "upstream gone", t.blocked, "Its upstream branch was deleted")),
          )
          .child(div().flex_1())
          .when((b.local?.ahead ?? 0) > 0, (el: El) =>
            el.child(
              div().flex_none().text_size(11.5).text_color(t.ansi2).child(`↑${b.local?.ahead}`),
            ),
          )
          .when((b.local?.behind ?? 0) > 0, (el: El) =>
            el.child(
              div().flex_none().text_size(11.5).text_color(t.ansi1).child(`↓${b.local?.behind}`),
            ),
          )
          .when(Boolean(b.pr), (el: El) => {
            const pr = b.pr as BranchPr;
            return el.child(
              h_flex()
                .id(`pr-${b.id}`)
                .flex_none()
                .gap(4)
                .px(6)
                .h(20)
                .items_center()
                .rounded(5)
                .bg(t.surface)
                .text_size(11.5)
                .text_color(pr.draft ? t.dim : t.accent)
                .tooltip(`${pr.draft ? "Draft: " : ""}${pr.title}`)
                .on_click((_e: unknown, cx: Cx) => {
                  cx.stop_propagation();
                  void openUrl(pr.url);
                })
                .child(svg(asset(pr.provider === "forgejo" ? "forgejo" : "pull-request")).size(11))
                .child(`#${pr.number}`),
            );
          })
          .when(Boolean(b.web), (el: El) =>
            el.child(
              iconButton(
                `web-${b.id}`,
                asset("external"),
                "Open the branch on the web",
                (_e, cx) => {
                  cx.stop_propagation();
                  void openUrl(b.web as string);
                },
                { size: 22, iconSize: 12 },
              ),
            ),
          ),
      )
      .when(Boolean(b.subject), (el: El) =>
        el.child(
          div()
            .pl(20)
            .min_w(0)
            .truncate()
            .text_size(11.5)
            .text_color(t.dim)
            .child([b.subject, b.date ? ago(b.date) : ""].filter(Boolean).join(" · ")),
        ),
      );
  }
}
