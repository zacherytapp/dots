// Open pull requests on GitHub and your Forgejo server: the shown space's repo (This space) or
// every PR involving you (All spaces), grouped into Review requested / Yours / Others. Each row shows checks, review state,
// unresolved threads and size, and starts an agent to Review, Address comments or Fix checks,
// in a tab named after the PR (a second click shows that tab).

import { div, svg, type Cx, type El } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import type { Program, SpaceInfo } from "herdr";
import { agentButton, useAgentProgram } from "../../shared/board.ts";
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
import { findTab, openUrl, copyText, startWork } from "../../shared/launch.ts";
import { ListView, type Loaded, type Scope } from "../../shared/list-view.ts";
import { asset, chromeIcon, iconButton, type Theme } from "../../shared/ui.ts";
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

  visible(items: PullItem[], query: string): PullItem[] {
    return items
      .filter((p) => matches(query, `#${p.number}`, p.title, p.slug, p.author, p.head))
      .sort((a, b) => b.updated - a.updated);
  }

  body(t: Theme, items: PullItem[], cx: Cx): El {
    const program = useAgentProgram(cx);
    const all = this.scope() === "all";
    return v_flex()
      .id("pulls")
      .flex_1()
      .min_h(0)
      .px(12)
      .pb(14)
      .gap(6)
      .overflow_y_scrollbar()
      .children(
        GROUPS.flatMap((g) => {
          const mine = items.filter((p) => p.group === g.id);
          if (!mine.length) return [];
          return [
            h_flex()
              .h(26)
              .pt(4)
              .gap(7)
              .items_center()
              .text_size(12.5)
              .text_color(t.muted)
              .child(g.label)
              .child(div().text_size(11).text_color(t.dim).child(String(mine.length))),
            ...mine.map((p) => this.row(t, p, program, all)),
          ];
        }),
      );
  }

  badge(t: Theme, icon: string, text: string, color: string, tooltip: string): El {
    return h_flex()
      .flex_none()
      .gap(4)
      .items_center()
      .text_color(color)
      .tooltip(tooltip)
      .child(svg(icon).size(12))
      .child(text);
  }

  row(t: Theme, p: PullItem, program: Program | null, all: boolean): El {
    const started = findTab(p.tabName);
    const checks = {
      passing: [chromeIcon("check"), "Checks", t.ansi2, "All checks passed"],
      failing: [chromeIcon("x"), "Checks", t.blocked, "Some checks failed"],
      pending: [chromeIcon("clock"), "Checks", t.working, "Checks are running"],
      none: null,
    }[p.checks];
    const review = {
      approved: ["Approved", t.ansi2],
      changes: ["Changes requested", t.blocked],
      required: ["Review required", t.working],
      none: null,
    }[p.review];
    const agentName = program?.name ?? "agent";
    return v_flex()
      .id(`pr-${p.id}`)
      .flex_none()
      .p(12)
      .gap(7)
      .rounded(9)
      .border(1)
      .border_color(t.border)
      .bg(t.surface)
      .hover((s: El) => s.border_color(t.input))
      .child(
        h_flex()
          .gap(8)
          .items_center()
          .child(
            svg(asset(p.provider === "forgejo" ? "forgejo" : "pull-request"))
              .size(14)
              .flex_none()
              .text_color(p.draft ? t.dim : t.ansi2)
              .tooltip(p.provider === "forgejo" ? "Forgejo" : "GitHub"),
          )
          .child(
            div()
              .id(`num-${p.id}`)
              .flex_none()
              .text_size(12)
              .text_color(t.accent)
              .cursor_pointer()
              .tooltip(p.url)
              .on_click(() => void openUrl(p.url))
              .on_mouse_down("right", (_e: unknown, cx: Cx) => {
                cx.stop_propagation();
                void copyText(p.url);
              })
              .child(`#${p.number}`),
          )
          .child(
            div()
              .id(`title-${p.id}`)
              .flex_1()
              .min_w(0)
              .truncate()
              .text_size(13.5)
              .cursor_pointer()
              .on_click(() => void openUrl(p.url))
              .tooltip(p.title)
              .child(p.title),
          )
          .when(p.draft, (el: El) =>
            el.child(div().flex_none().text_size(11).text_color(t.dim).child("Draft")),
          ),
      )
      .child(
        h_flex()
          .gap(6)
          .text_size(11.5)
          .text_color(t.dim)
          .child(
            div()
              .min_w(0)
              .truncate()
              .child(
                [all ? p.slug : null, `${p.head} → ${p.base}`, p.author, ago(p.updated)]
                  .filter(Boolean)
                  .join(" · "),
              ),
          ),
      )
      .child(
        h_flex()
          .gap(12)
          .items_center()
          .text_size(11.5)
          .when(Boolean(checks), (el: El) => {
            const [icon, text, color, tip] = checks as string[];
            return el.child(this.badge(t, icon, text, color, tip));
          })
          .when(Boolean(review), (el: El) => {
            const [text, color] = review as string[];
            return el.child(div().flex_none().text_color(color).child(text));
          })
          .when(p.comments + p.unresolved > 0, (el: El) =>
            el.child(
              this.badge(
                t,
                asset("comment"),
                p.unresolved ? `${p.unresolved} open` : String(p.comments),
                p.unresolved ? t.working : t.dim,
                `${p.comments} comments, ${p.unresolved} unresolved threads`,
              ),
            ),
          )
          .child(
            h_flex()
              .flex_none()
              .gap(4)
              .child(div().text_color(t.ansi2).child(`+${p.additions}`))
              .child(div().text_color(t.ansi1).child(`−${p.deletions}`)),
          ),
      )
      .child(
        h_flex()
          .gap(4)
          .items_center()
          .child(
            agentButton(
              `agent-${p.id}`,
              started ? `Show the ${p.tabName} tab` : `Start ${agentName} to review #${p.number}`,
              () => void startWork({ name: p.tabName, task: pullTask(p, "review"), repo: p.slug }),
              program,
              t,
            ),
          )
          .children(
            ACTIONS.map((a) =>
              div()
                .id(`${a.id}-${p.id}`)
                .h(24)
                .px(8)
                .flex()
                .items_center()
                .rounded(6)
                .text_size(12)
                .cursor_pointer()
                .text_color(t.muted)
                .border(1)
                .border_color(t.border)
                .hover((s: El) => s.bg(t.hover).text_color(t.foreground))
                .tooltip(
                  started
                    ? `Show the ${p.tabName} tab`
                    : `Start ${agentName}: ${a.label.toLowerCase()}`,
                )
                .on_click(
                  () => void startWork({ name: p.tabName, task: pullTask(p, a.id), repo: p.slug }),
                )
                .child(a.label),
            ),
          )
          .child(div().flex_1())
          .when(Boolean(started), (el: El) => el.child(div().size(6).rounded(3).bg(t.working)))
          .child(
            iconButton(
              `open-${p.id}`,
              asset("external"),
              "Open in browser",
              () => void openUrl(p.url),
              { iconSize: 13 },
            ),
          ),
      );
  }
}
