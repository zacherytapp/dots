// Every branch of the shown space's repository (or of every space's, in All spaces), local and
// remote together: whether it is local only, remote only or on both and in step, ahead/behind
// its upstream, its last commit, and the open GitHub or Forgejo pull request whose head it is.
// Remote branches come from `git ls-remote` on the space's own machine, so they are current and
// use that machine's own git access; a remote that can't be reached falls back to what the last
// fetch saw.

import { div, type Cx, type El } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { exec, spaces, type SpaceInfo } from "herdr";
import { forgejo, TokenError, type Forgejo } from "../../shared/forgejo.ts";
import type { ForgejoPull } from "../../shared/forgejo-model.ts";
import { copyText, openUrl } from "../../shared/launch.ts";
import { ListView, type Loaded, type Scope, type TokenAsk } from "../../shared/list-view.ts";
import { repoOf, type SpaceRepo } from "../../shared/repo.ts";
import {
  badge,
  button,
  groupLabel,
  ICON,
  icon,
  menuButton,
  MONO,
  mono,
  tabsList,
  tabsTrigger,
  TEXT,
  type IconName,
  type Theme,
} from "../../shared/ui.ts";
import { ago, matches } from "../../shared/util.ts";
import {
  kindOf,
  mergeBranches,
  parseLocal,
  parseRemoteRefs,
  REF_FORMAT,
  splitLsRemotes,
  splitSections,
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

/** The local half in one process: heads, the current branch, remote-tracking refs. */
const LOCAL_INFO =
  'git for-each-ref --format="$1" refs/heads; printf "\\036\\n"; git branch --show-current; printf "\\036\\n"; git for-each-ref --format="$1" refs/remotes';

/** `git ls-remote` of every remote at once, in one process (one ssh hop on a remote machine). */
const LS_REMOTES = [
  'export GIT_TERMINAL_PROMPT=0 GIT_SSH_COMMAND="ssh -o BatchMode=yes -o ConnectTimeout=8"',
  "d=$(mktemp -d) || exit 1",
  'i=0; for r in "$@"; do i=$((i+1)); ( git ls-remote --heads "$r" >"$d/$i.out" 2>/dev/null; echo $? >"$d/$i.rc" ) & done; wait',
  'i=0; for r in "$@"; do i=$((i+1)); printf "\\036%s\\t%s\\n" "$r" "$(cat "$d/$i.rc")"; cat "$d/$i.out"; done',
  'rm -rf "$d"',
].join("\n");

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
  const warnings: string[] = [];
  let token: TokenAsk | null = null;
  const names = repo.remotes.map((r) => r.remoteName ?? "origin");

  // Three processes at most per repository, however many remotes: the local look, one batched
  // ls-remote, and the pull request lists, all at once.
  const info = exec("sh", ["-c", LOCAL_INFO, "sh", REF_FORMAT], { cwd, on });
  const ls = names.length
    ? exec("sh", ["-c", LS_REMOTES, "sh", ...names], { cwd, on })
        .then((r) => splitLsRemotes(r.stdout, names))
        .catch(() => new Map<string, Map<string, string> | null>())
    : Promise.resolve(new Map<string, Map<string, string> | null>());
  const found = await Promise.all(
    repo.remotes.map(async (remote, i) => {
      const onForgejo = fj?.isRemote(remote) ?? false;
      try {
        const prs =
          remote.host === "github.com"
            ? await githubPrs(remote.slug)
            : onForgejo && fj
              ? await forgejoPrs(fj, remote.slug)
              : new Map<string, BranchPr>();
        return { i, prs };
      } catch (e) {
        if (e instanceof TokenError) token = e.ask;
        else warnings.push(`${label}: pull requests from ${names[i]} unavailable`);
        return { i, prs: new Map<string, BranchPr>() };
      }
    }),
  );
  const [infoOut, heads] = await Promise.all([info, ls]);
  const [local, current, tracking] = splitSections(infoOut.stdout);
  const trackingRefs = parseRemoteRefs(tracking);

  const remotes: RemoteHeads[] = repo.remotes.map((remote, i) => {
    const name = names[i];
    const onForgejo = fj?.isRemote(remote) ?? false;
    const web =
      remote.host === "github.com"
        ? `https://github.com/${remote.slug}/tree/`
        : onForgejo && fj
          ? `${fj.base}/${remote.slug}/src/branch/`
          : null;
    let seen = heads.get(name) ?? null;
    if (!seen) {
      // Unreachable: what the last fetch saw.
      warnings.push(`${label}: couldn't reach ${name}, showing its last fetch`);
      seen = new Map(
        [...trackingRefs]
          .filter(([ref]) => ref.startsWith(`${name}/`))
          .map(([ref, b]) => [ref.slice(name.length + 1), b.sha]),
      );
    }
    return { remote: name, heads: seen, web };
  });
  const prs = new Map<string, BranchPr>();
  for (const { prs: list } of found.sort((a, b) => a.i - b.i))
    for (const [head, pr] of list) if (!prs.has(head)) prs.set(head, pr);
  remotes.sort((a, b) => (a.remote === "origin" ? -1 : b.remote === "origin" ? 1 : 0));

  const branches = mergeBranches({
    key: `${repo.machine ?? ""}:${cwd}`,
    current: current.trim(),
    local: parseLocal(local),
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
    const targets = scope === "space" ? (space ? [space] : []) : spaces();
    if (!targets.length) return { items: [], note: "No space is shown." };
    const fjLoad = forgejo();
    fjLoad.catch(() => undefined); // surfaced where it is awaited
    // One look per repository, however many spaces are in it.
    const repos = new Map<string, { repo: SpaceRepo; label: string }>();
    const looked = await Promise.all(targets.map((s) => repoOf(s).catch(() => null)));
    targets.forEach((s, i) => {
      const repo = looked[i];
      if (!repo?.root) return;
      const key = `${repo.machine ?? ""}:${repo.root}`;
      const label = repo.remotes[0]?.slug ?? repo.root.split("/").pop() ?? s.name;
      if (!repos.has(key))
        repos.set(key, { repo, label: repo.machine ? `${label} · ${repo.machine}` : label });
    });
    if (!repos.size) {
      return {
        items: [],
        note:
          scope === "space"
            ? `${space?.name ?? "This space"} isn't in a git repository.`
            : "No space is in a git repository.",
      };
    }
    const fj = await fjLoad;
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

  /** Search result, kept while the items and the query stay the same (render runs often). */
  private found: { items: Item[]; query: string; out: Item[] } | null = null;
  /** Counts, the filtered rows and their groups, kept while items, filter and scope stay. */
  private derived: {
    items: Item[];
    filter: Filter;
    all: boolean;
    counts: Record<Filter, number>;
    groups: { repo: string; rows: Item[] }[];
  } | null = null;

  visible(items: Item[], query: string): Item[] {
    if (this.found?.items === items && this.found.query === query) return this.found.out;
    const out = items.filter((b) =>
      matches(query, b.name, b.subject, b.repo, b.pr ? `#${b.pr.number} ${b.pr.title}` : ""),
    );
    this.found = { items, query, out };
    return out;
  }

  derive(items: Item[]): NonNullable<Branches["derived"]> {
    const all = this.scope() === "all";
    const d = this.derived;
    if (d && d.items === items && d.filter === this.filter && d.all === all) return d;
    const counts: Record<Filter, number> = { all: 0, local: 0, remote: 0, pr: 0 };
    const rows: Item[] = [];
    for (const b of items) {
      const kind = kindOf(b);
      counts.all++;
      if (kind === "local") counts.local++;
      if (kind === "remote") counts.remote++;
      if (b.pr) counts.pr++;
      if (
        this.filter === "all" ||
        (this.filter === "local" && kind === "local") ||
        (this.filter === "remote" && kind === "remote") ||
        (this.filter === "pr" && b.pr)
      )
        rows.push(b);
    }
    const byRepo = new Map<string, Item[]>();
    for (const b of rows) {
      const list = byRepo.get(b.repo);
      if (list) list.push(b);
      else byRepo.set(b.repo, [b]);
    }
    const next = {
      items,
      filter: this.filter,
      all,
      counts,
      groups: [...byRepo].map(([repo, list]) => ({ repo, rows: list })),
    };
    this.derived = next;
    return next;
  }

  subbar(_t: Theme, items: Item[]): El {
    const { counts } = this.derive(items);
    return h_flex()
      .flex_none()
      .px(12)
      .pt(10)
      .child(
        tabsList(
          FILTERS.map((f) =>
            tabsTrigger(`filter-${f.id}`, {
              label: f.label,
              count: counts[f.id],
              active: this.filter === f.id,
              onClick: (cx) => {
                this.filter = f.id;
                cx.notify();
              },
            }),
          ),
        ),
      );
  }

  body(t: Theme, items: Item[], _cx: Cx): El {
    const { groups, all } = this.derive(items);
    return v_flex()
      .id("branches")
      .flex_1()
      .min_h(0)
      .px(12)
      .pb(14)
      .gap(1)
      .overflow_y_scrollbar()
      .children(
        groups.flatMap(({ repo, rows }) => [
          ...(all ? [groupLabel(`group-${repo}`, repo, { count: rows.length })] : []),
          ...rows.map((b) => this.row(t, b)),
        ]),
      );
  }

  /** A "where it lives" badge: outline in a status tone. */
  where(id: string, text: string, tone: string, tooltip: string, iconName?: IconName): El {
    return badge(text, { id, variant: "outline", tone, icon: iconName, tooltip });
  }

  /** ↑ahead / ↓behind: a Lucide arrow and a mono number. */
  delta(name: IconName, n: number, color: string): El {
    return h_flex()
      .flex_none()
      .gap(2)
      .items_center()
      .text_color(color)
      .text_size(TEXT.xs)
      .child(icon(name, ICON.xs))
      .child(mono(String(n)));
  }

  row(t: Theme, b: Item): El {
    const kind = kindOf(b);
    const remoteNames = b.remotes.map((r) => r.remote).join(", ");
    const inStep = kind === "both" && b.remotes.every((r) => r.same);
    const where =
      kind === "local"
        ? this.where(`where-${b.id}`, "local only", t.working, "Not on any remote", "laptop")
        : kind === "remote"
          ? this.where(`where-${b.id}`, "remote only", t.ansi4, `Only on ${remoteNames}`, "cloud")
          : this.where(
              `where-${b.id}`,
              inStep ? "synced" : "local + remote",
              inStep ? t.ansi2 : t.muted,
              inStep ? `Same commit on ${remoteNames}` : `On ${remoteNames}, at a different commit`,
            );
    const link = b.pr?.url ?? b.web;
    return menuButton(`branch-${b.id}`, {
      active: b.current,
      size: "auto",
      // No PR and no web page (a local-only branch): a click copies its name instead.
      onClick: () => void (link ? openUrl(link) : copyText(b.name)),
    })
      .flex_none()
      .on_mouse_down("right", (_e: unknown, cx: Cx) => {
        cx.stop_propagation();
        void copyText(b.name);
      })
      .tooltip(
        link
          ? `Open ${b.pr ? `#${b.pr.number}` : "on the web"} · right-click copies the name`
          : "Click copies the name",
      )
      .child(icon("git-branch", ICON.md, b.current ? t.foreground : t.muted))
      .child(
        v_flex()
          .flex_1()
          .min_w(0)
          .gap(2)
          .child(
            h_flex()
              .gap(8)
              .items_center()
              .child(div().min_w(0).truncate().font_family(MONO).child(b.name))
              .child(where)
              .when(Boolean(b.local?.gone), (el: El) =>
                el.child(
                  this.where(
                    `gone-${b.id}`,
                    "upstream gone",
                    t.blocked,
                    "Its upstream branch was deleted",
                  ),
                ),
              ),
          )
          .when(Boolean(b.subject), (el: El) =>
            el.child(
              div()
                .min_w(0)
                .truncate()
                .text_size(TEXT.xs)
                .text_color(t.muted)
                .child([b.subject, b.date ? ago(b.date) : ""].filter(Boolean).join(" · ")),
            ),
          ),
      )
      .when((b.local?.ahead ?? 0) > 0, (el: El) =>
        el.child(this.delta("arrow-up", b.local?.ahead as number, t.ansi2)),
      )
      .when((b.local?.behind ?? 0) > 0, (el: El) =>
        el.child(this.delta("arrow-down", b.local?.behind as number, t.blocked)),
      )
      .when(Boolean(b.pr), (el: El) => {
        const pr = b.pr as BranchPr;
        return el.child(
          badge(`#${pr.number}`, {
            id: `pr-${b.id}`,
            variant: "secondary",
            tone: pr.draft ? t.muted : undefined,
            mono: true,
            icon:
              pr.provider === "forgejo"
                ? "forgejo"
                : pr.draft
                  ? "git-pull-request-draft"
                  : "git-pull-request",
            tooltip: `${pr.draft ? "Draft: " : ""}${pr.title}`,
            onClick: (_e: unknown, cx: Cx) => {
              cx.stop_propagation();
              void openUrl(pr.url);
            },
          }),
        );
      })
      .when(Boolean(b.web), (el: El) =>
        el.child(
          button(`web-${b.id}`, {
            icon: "external-link",
            size: "icon-xs",
            tooltip: "Open the branch on the web",
            onClick: (_e, cx) => {
              cx.stop_propagation();
              void openUrl(b.web as string);
            },
          }),
        ),
      );
  }
}
