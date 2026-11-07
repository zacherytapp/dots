// An issue board: filter chips (All / To do / In progress / Done) and cards grouped into
// columns when the panel is wide, or stacked groups when it is narrow. Each card links to the
// tracker and starts an agent on the issue in the right space.

import { div, image, svg, type Cx, type El } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { knownAgents, type Program } from "herdr";
import {
  COLUMNS,
  countByColumn,
  filterItems,
  sortItems,
  type BoardItem,
  type Filter,
} from "./board-model.ts";
import { loadConfig, type IssueAction } from "./config.ts";
import { actionTabName } from "./issue-actions.ts";
import { copyText, findTab, mainWindowAgent, openUrl, runIssueAction } from "./launch.ts";
import { ListView } from "./list-view.ts";
import { alpha, asset, chromeIcon, countChip, iconButton, stopPress, type Theme } from "./ui.ts";
import { ago } from "./util.ts";

/** Wide enough for side-by-side columns. */
const COLUMNS_AT = 720;

let agentProgram: Program | null = null;
let agentAsked = 0;

/** The program table entry for the configured agent (its icon), asked at most once a minute. */
export function useAgentProgram(cx: Cx): Program | null {
  if (Date.now() - agentAsked > 60000) {
    agentAsked = Date.now();
    cx.spawn(async (cx) => {
      try {
        const [want] = (await loadConfig()).agent.argv;
        const list = await knownAgents();
        agentProgram =
          list.find((a) => a.run[0] === want || a.key === want) ??
          list.find((a) => a.installed) ??
          null;
        cx.notify();
      } catch {
        // keep the generic icon
      }
    });
  }
  return agentProgram;
}

let issueActions: IssueAction[] = [];
let actionsAsked = 0;

/** The issue card buttons from the settings, read again at most every 10 s. */
export function useIssueActions(cx: Cx): IssueAction[] {
  if (Date.now() - actionsAsked > 10000) {
    actionsAsked = Date.now();
    cx.spawn(async (cx) => {
      const next = (await loadConfig()).issueActions.filter((a) => a && a.label && a.skill);
      if (JSON.stringify(next) !== JSON.stringify(issueActions)) {
        issueActions = next;
        cx.notify();
      }
    });
  }
  return issueActions;
}

export function agentButton(
  id: string,
  tooltip: string,
  onClick: (e: unknown, cx: Cx) => void,
  program: Program | null,
  t: Theme,
): El {
  const icon = program?.icon
    ? program.tint
      ? svg(program.icon).size(15).text_color(t.foreground)
      : image(program.icon).size(15)
    : svg(asset("agent")).size(15).text_color(t.foreground);
  return div()
    .id(id)
    .size(26)
    .flex_none()
    .flex()
    .items_center()
    .justify_center()
    .rounded(6)
    .cursor_pointer()
    .hover((s: El) => s.bg(t.hover))
    .on_mouse_down("left", stopPress)
    .on_click(onClick)
    .tooltip(tooltip)
    .child(icon);
}

export class BoardView extends ListView<BoardItem> {
  declare filter: Filter;

  init(props: unknown, cx: Cx): void {
    this.filter = "all";
    super.init(props, cx);
  }

  noun(): string {
    return "issues";
  }

  placeholder(): string {
    return "Search issues";
  }

  visible(items: BoardItem[], query: string): BoardItem[] {
    return sortItems(filterItems(items, "all", query));
  }

  subbar(t: Theme, items: BoardItem[]): El {
    const counts = countByColumn(items);
    const chip = (id: Filter, label: string) =>
      countChip(`filter-${id}`, label, counts[id], this.filter === id, (cx) => {
        this.filter = id;
        cx.notify();
      });
    return h_flex()
      .flex_none()
      .px(14)
      .pt(10)
      .gap(4)
      .items_center()
      .child(chip("all", "All"))
      .children(COLUMNS.map((c) => chip(c.id, c.label)));
  }

  body(t: Theme, items: BoardItem[], cx: Cx): El {
    // Fills agentProgram: the action row's icon when no agent is open in the main window.
    useAgentProgram(cx);
    const all = this.scope() === "all";
    const shown = this.filter === "all" ? items : items.filter((i) => i.column === this.filter);
    const actions = useIssueActions(cx);
    const card = (item: BoardItem) => this.card(t, item, all, actions);
    const wide = this.width >= COLUMNS_AT && this.filter === "all";
    if (wide) {
      return h_flex()
        .id("board")
        .flex_1()
        .min_h(0)
        .px(14)
        .gap(12)
        .items_start()
        .overflow_y_scrollbar()
        .children(
          COLUMNS.map((c) => {
            const mine = shown.filter((i) => i.column === c.id);
            return v_flex()
              .flex_1()
              .min_w(0)
              .gap(8)
              .pb(14)
              .child(this.groupHeader(t, c.label, c.tone, mine.length))
              .children(mine.map(card));
          }),
        );
    }
    const groups = COLUMNS.filter((c) => this.filter === "all" || c.id === this.filter);
    return v_flex()
      .id("board")
      .flex_1()
      .min_h(0)
      .px(12)
      .pb(14)
      .gap(8)
      .overflow_y_scrollbar()
      .children(
        groups.flatMap((c) => {
          const mine = shown.filter((i) => i.column === c.id);
          if (!mine.length && this.filter === "all") return [];
          return [this.groupHeader(t, c.label, c.tone, mine.length), ...mine.map(card)];
        }),
      );
  }

  groupHeader(t: Theme, label: string, tone: string, count: number): El {
    return h_flex()
      .flex_none()
      .h(26)
      .pt(4)
      .gap(7)
      .items_center()
      .text_size(12.5)
      .text_color(t.muted)
      .child(
        div()
          .size(6)
          .rounded(3)
          .bg(t[tone] ?? t.dim),
      )
      .child(label)
      .child(div().text_size(11).text_color(t.dim).child(String(count)));
  }

  card(t: Theme, item: BoardItem, all: boolean, actions: IssueAction[]): El {
    const labels = item.labels ?? [];
    return v_flex()
      .id(`card-${item.id}`)
      .flex_none()
      .p(12)
      .gap(8)
      .rounded(9)
      .border(1)
      .border_color(t.border)
      .bg(t.surface)
      .hover((s: El) => s.border_color(t.input))
      .child(
        h_flex()
          .gap(8)
          .items_center()
          .text_size(12)
          .child(
            div()
              .id(`key-${item.id}`)
              .flex_none()
              .text_color(t.accent)
              .cursor_pointer()
              .hover((s: El) => s.underline())
              .tooltip(item.url)
              .on_click(() => void openUrl(item.url))
              .on_mouse_down("right", (_e: unknown, cx: Cx) => {
                cx.stop_propagation();
                void copyText(item.url);
              })
              .child(item.key),
          )
          .when(all && Boolean(item.where), (el: El) =>
            el.child(div().min_w(0).truncate().text_color(t.dim).child(item.where)),
          )
          .child(div().flex_1())
          .when(Boolean(item.priority), (el: El) =>
            el.child(
              div()
                .flex_none()
                .text_color(t.muted)
                .child(item.priority as string),
            ),
          )
          .when(Boolean(item.status), (el: El) => el.child(statusPill(t, item))),
      )
      .child(
        div()
          .id(`title-${item.id}`)
          .text_size(13.5)
          .text_color(t.foreground)
          .cursor_pointer()
          .on_click(() => void openUrl(item.url))
          .child(item.title),
      )
      .when(labels.length > 0 || Boolean(item.milestone), (el: El) =>
        el.child(
          h_flex()
            .gap(4)
            .flex_wrap()
            .when(Boolean(item.milestone), (row: El) =>
              row.child(milestoneChip(t, item.milestone as string)),
            )
            .children(labels.map((l) => labelChip(t, l, item.labelColors?.[l]))),
        ),
      )
      .when(hasWork(item), (el: El) => el.child(workRow(t, item)))
      .when(actions.length > 0, (el: El) => el.child(actionRow(t, item, actions)))
      .child(
        h_flex()
          .gap(4)
          .items_center()
          .text_size(11.5)
          .text_color(t.dim)
          .when(Boolean(item.assignees?.length), (el: El) =>
            el.child(
              div()
                .min_w(0)
                .truncate()
                .child(`${(item.assignees ?? []).join(", ")} ·`),
            ),
          )
          .child(div().flex_none().child(ago(item.updated)))
          .child(div().flex_1())
          .when((item.comments ?? 0) > 0, (el: El) =>
            el.child(
              indicator(
                `comments-${item.id}`,
                asset("comment"),
                String(item.comments),
                t.muted,
                `${item.comments} ${item.comments === 1 ? "comment" : "comments"}`,
                item.url,
                t,
              ),
            ),
          )
          .child(
            iconButton(
              `open-${item.id}`,
              asset("external"),
              "Open in browser",
              () => void openUrl(item.url),
              { iconSize: 13 },
            ),
          ),
      );
  }
}

/** The column's color: what the group headers use, a little brighter for To do. */
function columnColor(t: Theme, item: BoardItem): string {
  if (item.column === "todo") return t.muted;
  const tone = COLUMNS.find((c) => c.id === item.column)?.tone ?? "dim";
  return t[tone] ?? t.muted;
}

/** The tracker's own status word ("Open", "In Review"), tinted by its column. Never shrinks. */
function statusPill(t: Theme, item: BoardItem): El {
  const color = columnColor(t, item);
  return h_flex()
    .flex_none()
    .h(18)
    .px(7)
    .gap(5)
    .items_center()
    .rounded(9)
    .bg(alpha(color, "24"))
    .text_size(11)
    .text_color(color)
    .child(div().size(6).rounded(3).bg(color))
    .child(item.status);
}

/** The milestone an issue is planned for. */
function milestoneChip(t: Theme, name: string): El {
  return h_flex()
    .flex_none()
    .h(18)
    .px(6)
    .gap(4)
    .items_center()
    .rounded(5)
    .border(1)
    .border_color(t.border)
    .text_size(11)
    .text_color(t.muted)
    .tooltip(`Milestone: ${name}`)
    .child(svg(chromeIcon("pin")).size(11).flex_none())
    .child(name);
}

/** A label, in the tracker's color when it has one. */
function labelChip(t: Theme, name: string, color: string | undefined): El {
  const known = Boolean(color && /^#[0-9a-f]{6}$/i.test(color));
  return h_flex()
    .flex_none()
    .h(18)
    .px(6)
    .gap(5)
    .items_center()
    .rounded(5)
    .bg(alpha(known ? color : t.accent, known ? "2e" : "1f"))
    .when(known, (el: El) => el.border(1).border_color(alpha(color, "66")))
    .text_size(11)
    .text_color(t.foreground)
    .when(known, (el: El) =>
      el.child(
        div()
          .size(7)
          .rounded(4)
          .bg(color as string),
      ),
    )
    .child(name);
}

function hasWork(item: BoardItem): boolean {
  return Boolean(item.pulls?.length || item.branches?.length);
}

/** A clickable icon + text indicator. */
function indicator(
  id: string,
  icon: string,
  text: string,
  color: string,
  tooltip: string,
  url: string | null,
  t: Theme,
  trailing: El | null = null,
): El {
  return h_flex()
    .id(id)
    .flex_none()
    .min_w(0)
    .max_w(220)
    .h(20)
    .px(6)
    .gap(4)
    .items_center()
    .rounded(5)
    .text_color(color)
    .tooltip(tooltip)
    .when(Boolean(url), (el: El) =>
      el
        .cursor_pointer()
        .hover((s: El) => s.bg(t.hover))
        .on_mouse_down("left", stopPress)
        .on_click(() => void openUrl(url as string)),
    )
    .child(svg(icon).size(12).flex_none())
    .child(div().min_w(0).truncate().child(text))
    .when(Boolean(trailing), (el: El) => el.child(trailing as El));
}

const CHECKS: Record<string, { icon: string; tone: string; say: string }> = {
  passing: { icon: "check", tone: "ansi2", say: "checks passing" },
  failing: { icon: "x", tone: "blocked", say: "checks failing" },
  pending: { icon: "clock", tone: "working", say: "checks running" },
};

/** A pull request's checks as a small tinted glyph, or null when it has none. */
function checksGlyph(t: Theme, checks: string | undefined): El | null {
  const c = checks ? CHECKS[checks] : undefined;
  return c
    ? svg(chromeIcon(c.icon))
        .size(11)
        .flex_none()
        .text_color(t[c.tone] ?? t.muted)
    : null;
}

/** The configured actions (Review issue, Implement, Review code), led by the agent that runs them. */
function actionRow(t: Theme, item: BoardItem, actions: IssueAction[]): El {
  const main = mainWindowAgent();
  const fallback = agentProgram;
  const lead = main ?? fallback;
  const who = lead?.name ?? "the agent";
  return h_flex()
    .gap(4)
    .flex_wrap()
    .items_center()
    .child(
      lead?.icon
        ? (lead.tint ? svg(lead.icon).size(14).text_color(t.muted) : image(lead.icon).size(14))
            .flex_none()
            .mr(2)
        : svg(asset("agent")).size(14).flex_none().mr(2).text_color(t.muted),
    )
    .children(
      actions.map((a, i) => {
        const open = findTab(actionTabName(a, item));
        return h_flex()
          .id(`action-${i}-${item.id}`)
          .flex_none()
          .h(22)
          .px(8)
          .gap(5)
          .items_center()
          .rounded(6)
          .border(1)
          .border_color(open ? t.working : t.border)
          .text_size(11.5)
          .text_color(t.muted)
          .cursor_pointer()
          .hover((s: El) => s.bg(t.hover).text_color(t.foreground))
          .on_mouse_down("left", stopPress)
          .on_click(() => void runIssueAction(a, item))
          .tooltip(
            open
              ? `Show the "${actionTabName(a, item)}" tab`
              : `New ${a.agent ?? who} session running the ${a.skill} skill on ${item.url}`,
          )
          .child(a.label)
          .when(Boolean(open), (el: El) => el.child(div().size(5).rounded(3).bg(t.working)));
      }),
    );
}

/** Open pull requests and branches: the work started on the issue. */
function workRow(t: Theme, item: BoardItem): El {
  const pulls = item.pulls ?? [];
  const branches = item.branches ?? [];
  const els: El[] = pulls
    .slice(0, 3)
    .map((p) =>
      indicator(
        `pr-${item.id}-${p.number}`,
        asset("pull-request"),
        p.draft ? `Draft #${p.number}` : `PR #${p.number}`,
        p.draft ? t.muted : t.ansi2,
        [
          `${p.draft ? "Draft pull request" : "Open pull request"} #${p.number}: ${p.title}`,
          p.checks && CHECKS[p.checks] ? CHECKS[p.checks].say : null,
        ]
          .filter(Boolean)
          .join(" · "),
        p.url,
        t,
        checksGlyph(t, p.checks),
      ),
    );
  if (pulls.length > 3)
    els.push(
      div()
        .flex_none()
        .child(`+${pulls.length - 3}`),
    );
  if (branches.length) {
    const [first] = branches;
    els.push(
      indicator(
        `branch-${item.id}`,
        chromeIcon("git-branch"),
        branches.length === 1 ? first.name : `${branches.length} branches`,
        t.ansi5 ?? t.accent,
        `Open ${branches.length === 1 ? "branch" : "branches"} on the remote: ${branches.map((b) => b.name).join(", ")}`,
        first.url,
        t,
      ),
    );
  }
  return h_flex().gap(4).flex_wrap().items_center().text_size(11.5).ml(-6).children(els);
}
