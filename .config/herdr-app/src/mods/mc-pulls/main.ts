// Open pull requests on GitHub and your Forgejo server: the shown space's repo (This space) or
// every PR involving you (All spaces), grouped into Review requested / Yours / Others. Each row shows checks, review state,
// unresolved threads and size, and starts an agent to Review, Address comments or Fix checks,
// in a tab named after the PR (a second click shows that tab).

import { div, type Cx, type El } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import type { Program, SpaceInfo } from "herdr";
import { useAgentProgram } from "../../shared/board.ts";
import {
  forgejo,
  forgejoMyPulls,
  forgejoRepoPulls,
  forgejoViewer,
  TokenError,
} from "../../shared/forgejo.ts";
import { loadPulls } from "../../shared/github.ts";
import { repoOf } from "../../shared/repo.ts";
import {
  pullTask,
  type PullAction,
  type PullGroup,
  type PullItem,
} from "../../shared/github-model.ts";
import {
  backgroundSessions,
  copyText,
  isPending,
  namedTabs,
  openUrl,
  startWork,
  trackPending,
} from "../../shared/launch.ts";
import { ListView, type Loaded, type Scope } from "../../shared/list-view.ts";
import {
  agentIcon,
  badge,
  button,
  card,
  dot,
  groupLabel,
  ICON,
  icon,
  MONO,
  mono,
  spinner,
  TEXT,
  type IconName,
  type Theme,
} from "../../shared/ui.ts";
import { ago, matches } from "../../shared/util.ts";

const GROUPS: { id: PullGroup; label: string }[] = [
  { id: "review", label: "Review requested" },
  { id: "mine", label: "Yours" },
  { id: "other", label: "Others" },
];

const ACTIONS: { id: PullAction; label: string }[] = [
  { id: "review", label: "Review" },
  { id: "comments", label: "Address comments" },
  { id: "checks", label: "Fix checks" },
];

/** Forgejo's half: nothing when it isn't configured or the space isn't on it. */
async function forgejoPulls(scope: Scope, space: SpaceInfo | null): Promise<Loaded<PullItem>> {
  const fj = await forgejo();
  if (!fj) return { items: [] };
  try {
    if (scope === "space") {
      if (!space) return { items: [] };
      const remote = (await repoOf(space)).remotes.find((r) => fj.isRemote(r));
      if (!remote) return { items: [] };
      const items = await forgejoRepoPulls(fj, remote.slug, await forgejoViewer(fj));
      return { items, caption: `This space · ${remote.slug}` };
    }
    if (!fj.token) return { items: [], token: fj.ask(false) };
    return { items: await forgejoMyPulls(fj, await forgejoViewer(fj)) };
  } catch (e) {
    if (e instanceof TokenError) return { items: [], token: e.ask };
    throw e;
  }
}

export default class Pulls extends ListView<PullItem> {
  source(): string {
    return "pulls";
  }

  noun(): string {
    return "pull requests";
  }

  placeholder(): string {
    return "Search pull requests";
  }

  async fetch(scope: Scope, space: SpaceInfo | null): Promise<Loaded<PullItem>> {
    const [gh, fj] = await Promise.allSettled([
      loadPulls(scope, space),
      forgejoPulls(scope, space),
    ]);
    const ok = (r: PromiseSettledResult<Loaded<PullItem>>) =>
      r.status === "fulfilled" ? r.value : null;
    const why = (r: PromiseSettledResult<Loaded<PullItem>>, who: string) =>
      r.status === "rejected" ? `${who}: ${String((r.reason as Error)?.message ?? r.reason)}` : "";
    if (!ok(gh) && !ok(fj)) throw new Error([why(gh, "GitHub"), why(fj, "Forgejo")].join("; "));
    const items = [...(ok(gh)?.items ?? []), ...(ok(fj)?.items ?? [])];
    const caption =
      scope === "all"
        ? "All spaces · involving you"
        : ok(fj)?.caption || ok(gh)?.caption || `This space · ${space?.name ?? ""}`;
    const note =
      scope === "space" && !items.length
        ? `No open pull requests on ${space?.name ?? "this space"}'s GitHub or Forgejo remotes.`
        : "";
    return {
      items,
      caption,
      note,
      token: ok(fj)?.token,
      warning: [why(gh, "GitHub"), why(fj, "Forgejo")].filter(Boolean).join("; "),
    };
  }

  private found: { items: PullItem[]; query: string; out: PullItem[] } | null = null;
  private grouped: { items: PullItem[]; groups: { label: string; rows: PullItem[] }[] } | null =
    null;

  visible(items: PullItem[], query: string): PullItem[] {
    if (this.found?.items === items && this.found.query === query) return this.found.out;
    const out = items
      .filter((p) => matches(query, `#${p.number}`, p.title, p.slug, p.author, p.head))
      .sort((a, b) => b.updated - a.updated);
    this.found = { items, query, out };
    return out;
  }

  /** The non-empty groups, rebuilt only when the rows change. */
  groups(items: PullItem[]): { label: string; rows: PullItem[] }[] {
    if (this.grouped?.items === items) return this.grouped.groups;
    const groups = GROUPS.map((g) => ({
      label: g.label,
      rows: items.filter((p) => p.group === g.id),
    })).filter((g) => g.rows.length);
    this.grouped = { items, groups };
    return groups;
  }

  body(t: Theme, items: PullItem[], cx: Cx): El {
    const program = useAgentProgram(cx);
    const all = this.scope() === "all";
    // One look per render, not one per row.
    const tabs = namedTabs();
    const background = backgroundSessions();
    return v_flex()
      .id("pulls")
      .flex_1()
      .min_h(0)
      .px(12)
      .pb(14)
      .gap(6)
      .overflow_y_scrollbar()
      .children(
        this.groups(items).flatMap((g) => [
          groupLabel(`group-${g.label}`, g.label, { count: g.rows.length }),
          ...g.rows.map((p) => this.row(t, p, program, all, tabs, background)),
        ]),
      );
  }

  row(
    t: Theme,
    p: PullItem,
    program: Program | null,
    all: boolean,
    tabs: Set<string>,
    background: Set<string>,
  ): El {
    const tab = tabs.has(p.tabName);
    const starting = isPending(p.tabName);
    const started = tab || background.has(p.tabName);
    const start = (action: PullAction, cx: Cx) =>
      trackPending(p.tabName, cx, () =>
        startWork({ name: p.tabName, task: pullTask(p, action), repo: p.slug }),
      );
    const shown = tab
      ? `Show the ${p.tabName} tab`
      : `${p.tabName} is running in the background: open it from Agents`;
    const checks = {
      passing: [icon("circle-check", ICON.xs), t.ansi2, "All checks passed"],
      failing: [icon("circle-x", ICON.xs), t.blocked, "Some checks failed"],
      pending: [spinner(ICON.xs), t.working, "Checks are running"],
      none: null,
    }[p.checks];
    const review = {
      approved: ["Approved", t.ansi2],
      changes: ["Changes requested", t.blocked],
      required: ["Review required", t.working],
      none: null,
    }[p.review];
    const agentName = program?.name ?? "agent";
    const prIcon: IconName =
      p.provider === "forgejo"
        ? "forgejo"
        : p.draft
          ? "git-pull-request-draft"
          : "git-pull-request";
    return card()
      .id(`pr-${p.id}`)
      .flex_none()
      .hover((s: El) => s.border_color(t.input))
      .child(
        h_flex()
          .gap(8)
          .items_center()
          .child(
            icon(prIcon, ICON.sm, p.draft ? t.muted : t.ansi2).tooltip(
              p.provider === "forgejo" ? "Forgejo" : "GitHub",
            ),
          )
          .child(
            mono(`#${p.number}`)
              .id(`num-${p.id}`)
              .flex_none()
              .text_size(TEXT.xs)
              .text_color(t.accent)
              .cursor_pointer()
              .hover((s: El) => s.underline())
              .tooltip(`${p.url} · right-click copies it`)
              .on_click(() => void openUrl(p.url))
              .on_mouse_down("right", (_e: unknown, cx: Cx) => {
                cx.stop_propagation();
                void copyText(p.url);
              }),
          )
          .child(
            div()
              .id(`title-${p.id}`)
              .flex_1()
              .min_w(0)
              .truncate()
              .text_size(TEXT.sm)
              .font_medium()
              .cursor_pointer()
              .hover((s: El) => s.underline())
              .on_click(() => void openUrl(p.url))
              .tooltip(p.title)
              .child(p.title),
          )
          .when(p.draft, (el: El) => el.child(badge("Draft", { variant: "outline" }))),
      )
      .child(
        h_flex()
          .gap(4)
          .items_center()
          .text_size(TEXT.xs)
          .text_color(t.muted)
          .when(all, (el: El) =>
            el.child(div().min_w(0).truncate().child(p.slug)).child(div().flex_none().child("·")),
          )
          .child(div().min_w(0).truncate().font_family(MONO).child(`${p.head} → ${p.base}`))
          .child(
            div()
              .flex_none()
              .child(`· ${[p.author, ago(p.updated)].filter(Boolean).join(" · ")}`),
          ),
      )
      .child(
        h_flex()
          .gap(6)
          .items_center()
          .when(Boolean(checks), (el: El) => {
            const [glyph, color, tip] = checks as [El, string, string];
            return el.child(
              badge("Checks", {
                id: `checks-${p.id}`,
                tone: color,
                variant: "outline",
                icon: glyph,
                tooltip: tip,
              }),
            );
          })
          .when(Boolean(review), (el: El) => {
            const [text, color] = review as string[];
            return el.child(badge(text, { tone: color, variant: "outline" }));
          })
          .when(p.comments + p.unresolved > 0, (el: El) =>
            el.child(
              badge(p.unresolved ? `${p.unresolved} open` : String(p.comments), {
                id: `comments-${p.id}`,
                variant: "outline",
                tone: p.unresolved ? t.working : undefined,
                icon: "message-square",
                tooltip: `${p.comments} comments, ${p.unresolved} unresolved threads`,
              }),
            ),
          )
          .child(
            h_flex()
              .flex_none()
              .gap(4)
              .ml_auto()
              .font_family(MONO)
              .text_size(TEXT.xs)
              .child(div().text_color(t.ansi2).child(`+${p.additions}`))
              .child(div().text_color(t.blocked).child(`−${p.deletions}`)),
          ),
      )
      .child(
        h_flex()
          .gap(4)
          .items_center()
          .child(
            button(`agent-${p.id}`, {
              variant: "outline",
              size: "icon-xs",
              icon: agentIcon(program, ICON.sm, t.foreground),
              tooltip: started ? shown : `Start ${agentName} to review #${p.number}`,
              onClick: (_e, cx) => start("review", cx),
            }),
          )
          .children(
            ACTIONS.map((a) =>
              button(`${a.id}-${p.id}`, {
                variant: "outline",
                size: "xs",
                label: a.label,
                tooltip: started ? shown : `Start ${agentName}: ${a.label.toLowerCase()}`,
                onClick: (_e, cx) => start(a.id, cx),
              }),
            ),
          )
          .child(div().flex_1())
          .when(starting, (el: El) => el.child(spinner(ICON.sm, t.working)))
          .when(started && !starting, (el: El) => el.child(dot(t.working)))
          .child(
            button(`open-${p.id}`, {
              icon: "external-link",
              size: "icon-xs",
              tooltip: "Open in browser",
              onClick: () => void openUrl(p.url),
            }),
          ),
      );
  }
}
