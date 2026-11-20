// An issue board: filter chips (All / To do / In progress / Done) and cards grouped into
// columns when the panel is wide, or stacked groups when it is narrow. Each card links to the
// tracker and starts an agent on the issue in the right space.

import { div, type Cx, type El } from "gpui-kit";
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
import {
  backgroundSessions,
  copyText,
  isPending,
  mainWindowAgent,
  namedTabs,
  openUrl,
  runIssueAction,
  trackPending,
} from "./launch.ts";
import { ListView } from "./list-view.ts";
import {
  agentIcon,
  badge,
  button,
  card,
  dot,
  groupLabel,
  icon,
  ICON,
  metaLine,
  MONO,
  spinner,
  tabsList,
  tabsTrigger,
  TEXT,
  type Theme,
} from "./ui.ts";
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

/** The agent's icon as a ghost icon button: resume, start or review with it. */
export function agentButton(
  id: string,
  tooltip: string,
  onClick: (e: unknown, cx: Cx) => void,
  program: Program | null,
  t: Theme,
): El {
  return button(id, {
    icon: agentIcon(program, ICON.md, t.foreground),
    tooltip,
    onClick,
    size: "icon-sm",
  });
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
    const tab = (id: Filter, label: string) =>
      tabsTrigger(`filter-${id}`, {
        label,
        count: counts[id],
        active: this.filter === id,
        onClick: (cx) => {
          this.filter = id;
          cx.notify();
        },
      });
    return h_flex()
      .flex_none()
      .px(12)
      .pt(8)
      .child(tabsList([tab("all", "All"), ...COLUMNS.map((c) => tab(c.id, c.label))]));
  }

  body(t: Theme, items: BoardItem[], cx: Cx): El {
    // Fills agentProgram: the action row's icon when no agent is open in the main window.
    useAgentProgram(cx);
    const all = this.scope() === "all";
    const shown = this.filter === "all" ? items : items.filter((i) => i.column === this.filter);
    const actions = useIssueActions(cx);
    // Read once for the whole board: per card, walking every pane and tab outran the render.
    const acts: ActionContext = {
      actions,
      main: actions.length ? mainWindowAgent() : null,
      tabs: actions.length ? namedTabs() : new Set(),
      sessions: actions.length ? backgroundSessions() : new Set(),
    };
    const card = (item: BoardItem) => this.card(t, item, all, acts);
    const wide = this.width >= COLUMNS_AT && this.filter === "all";
    if (wide) {
      return h_flex()
        .id("board")
        .flex_1()
        .min_h(0)
        .px(12)
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
              .pb(12)
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
      .pb(12)
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
    return groupLabel(`group-${label}`, label, {
      count,
      leading: dot(t[tone] ?? t.dim),
    });
  }

  card(t: Theme, item: BoardItem, all: boolean, acts: ActionContext): El {
    const labels = item.labels ?? [];
    return card()
      .id(`card-${item.id}`)
      .flex_none()
      .hover((s: El) => s.border_color(t.input))
      .child(
        h_flex()
          .gap(8)
          .items_center()
          .text_size(TEXT.xs)
          .child(
            div()
              .id(`key-${item.id}`)
              .flex_none()
              .font_family(MONO)
              .text_color(t.accent)
              .cursor_pointer()
              .hover((s: El) => s.underline())
              .tooltip(`${item.url} · right-click copies it`)
              .on_click(() => void openUrl(item.url))
              .on_mouse_down("right", (_e: unknown, cx: Cx) => {
                cx.stop_propagation();
                void copyText(item.url);
              })
              .child(item.key),
          )
          .when(all && Boolean(item.where), (el: El) =>
            el.child(div().min_w(0).truncate().text_color(t.muted).child(item.where)),
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
          .text_size(TEXT.md)
          .font_medium()
          .text_color(t.foreground)
          .cursor_pointer()
          .hover((s: El) => s.underline())
          .on_click(() => void openUrl(item.url))
          .child(item.title),
      )
      .when(labels.length > 0 || Boolean(item.milestone), (el: El) =>
        el.child(
          h_flex()
            .gap(4)
            .flex_wrap()
            .when(Boolean(item.milestone), (row: El) =>
              row.child(milestoneChip(item.id, item.milestone as string)),
            )
            .children(labels.map((l) => labelChip(l, item.labelColors?.[l]))),
        ),
      )
      .when(hasWork(item), (el: El) => el.child(workRow(t, item)))
      .when(acts.actions.length > 0, (el: El) => el.child(actionRow(t, item, acts)))
      .child(
        h_flex()
          .gap(4)
          .items_center()
          .child(
            metaLine([
              item.assignees?.length ? (item.assignees ?? []).join(", ") : null,
              ago(item.updated),
            ]),
          )
          .child(div().flex_1())
          .when((item.comments ?? 0) > 0, (el: El) =>
            el.child(
              badge(String(item.comments), {
                variant: "ghost",
                mono: true,
                icon: "message-square",
                id: `comments-${item.id}`,
                tooltip: `${item.comments} ${item.comments === 1 ? "comment" : "comments"}`,
                onClick: () => void openUrl(item.url),
              }),
            ),
          )
          .child(
            button(`open-${item.id}`, {
              icon: "external-link",
              tooltip: "Open in browser",
              size: "icon-xs",
              onClick: () => void openUrl(item.url),
            }),
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
  return badge(item.status ?? "", { tone: columnColor(t, item), dot: columnColor(t, item) });
}

/** The milestone an issue is planned for. */
function milestoneChip(id: string, name: string): El {
  return badge(name, {
    icon: "milestone",
    id: `milestone-${id}`,
    tooltip: `Milestone: ${name}`,
  });
}

/** A label, with a dot in the tracker's color when it has one. */
function labelChip(name: string, color: string | undefined): El {
  const known = Boolean(color && /^#[0-9a-f]{6}$/i.test(color));
  return badge(name, { dot: known ? color : undefined });
}

function hasWork(item: BoardItem): boolean {
  return Boolean(item.pulls?.length || item.branches?.length);
}

export const CHECKS: Record<
  string,
  { icon: "circle-check" | "circle-x" | "loader-circle"; tone: string; say: string }
> = {
  passing: { icon: "circle-check", tone: "ansi2", say: "checks passing" },
  failing: { icon: "circle-x", tone: "blocked", say: "checks failing" },
  pending: { icon: "loader-circle", tone: "working", say: "checks running" },
};

/** A pull request's checks as a tinted status icon (spinning while running), or null with none. */
export function checksIcon(
  t: Theme,
  checks: string | undefined,
  size: number = ICON.xs,
): El | null {
  const c = checks ? CHECKS[checks] : undefined;
  if (!c) return null;
  const color = t[c.tone] ?? t.muted;
  return c.icon === "loader-circle" ? spinner(size, color) : icon(c.icon, size, color);
}

/** The pull request glyph: Lucide's draft variant for drafts. */
export function prIcon(draft: boolean | undefined, size: number = ICON.xs, color?: string): El {
  return icon(draft ? "git-pull-request-draft" : "git-pull-request", size, color);
}

/** What every card's action row needs, read once per render. */
interface ActionContext {
  actions: IssueAction[];
  /** The agent open in the main window (mainWindowAgent). */
  main: Program | null;
  /** Named tabs and background sessions, so a button can show that its work is started. */
  tabs: Set<string>;
  sessions: Set<string>;
}

/** The configured actions (Review issue, Implement, Review code), led by the agent that runs them. */
function actionRow(
  t: Theme,
  item: BoardItem,
  { actions, main, tabs, sessions }: ActionContext,
): El {
  const lead = main ?? agentProgram;
  const who = lead?.name ?? "the agent";
  return h_flex()
    .gap(4)
    .flex_wrap()
    .items_center()
    .child(agentIcon(lead, ICON.sm, t.muted).mr(2))
    .children(
      actions.map((a, i) => {
        const name = actionTabName(a, item);
        const tab = tabs.has(name);
        const open = tab || sessions.has(name);
        const starting = isPending(name);
        return button(`action-${i}-${item.id}`, {
          label: a.label,
          variant: "outline",
          size: "xs",
          tone: open ? t.working : t.muted,
          icon: starting
            ? spinner(ICON.xs, t.working)
            : open
              ? dot(t.working, { size: 5 })
              : undefined,
          tooltip: starting
            ? `Starting "${name}"…`
            : tab
              ? `Show the "${name}" tab`
              : open
                ? `"${name}" is running in the background: open it from Agents`
                : `New ${a.agent ?? who} session running the ${a.skill} skill on ${item.url}`,
          onClick: (_e, cx) => trackPending(name, cx, () => runIssueAction(a, item)),
        });
      }),
    );
}

/** Open pull requests and branches: the work started on the issue. */
function workRow(t: Theme, item: BoardItem): El {
  const pulls = item.pulls ?? [];
  const branches = item.branches ?? [];
  const els: El[] = pulls.slice(0, 3).map((p) => {
    const checks = checksIcon(t, p.checks);
    const glyph = h_flex()
      .gap(4)
      .items_center()
      .child(prIcon(p.draft))
      .when(Boolean(checks), (el: El) => el.child(checks as El));
    return badge(p.draft ? `Draft #${p.number}` : `PR #${p.number}`, {
      tone: p.draft ? undefined : t.ansi2,
      variant: "outline",
      mono: true,
      icon: glyph,
      id: `pr-${item.id}-${p.number}`,
      tooltip: [
        `${p.draft ? "Draft pull request" : "Open pull request"} #${p.number}: ${p.title}`,
        p.checks && CHECKS[p.checks] ? CHECKS[p.checks].say : null,
      ]
        .filter(Boolean)
        .join(" · "),
      onClick: () => void openUrl(p.url),
    });
  });
  if (pulls.length > 3) {
    els.push(
      div()
        .flex_none()
        .text_size(TEXT.xs)
        .text_color(t.muted)
        .child(`+${pulls.length - 3}`),
    );
  }
  if (branches.length) {
    const [first] = branches;
    els.push(
      badge(branches.length === 1 ? first.name : `${branches.length} branches`, {
        tone: t.ansi5 ?? t.accent,
        variant: "outline",
        mono: true,
        icon: "git-branch",
        id: `branch-${item.id}`,
        tooltip: `Open ${branches.length === 1 ? "branch" : "branches"} on the remote: ${branches.map((b) => b.name).join(", ")}`,
        onClick: first.url ? () => void openUrl(first.url as string) : undefined,
      }),
    );
  }
  return h_flex().gap(4).flex_wrap().items_center().children(els);
}
