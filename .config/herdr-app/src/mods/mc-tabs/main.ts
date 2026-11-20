// Two views from one mod (props.view):
//
//   "topbar":     the shown space, its tabs as compact pills (number, program icon and a few characters
//                 of its name; folder, branch, panes and working time in the tooltip), the + menu
//                 and one button per side panel source. Keys: `mc-tabs.panel`, `mc-tabs.expand`, `mc-tabs.source-<id>`.
//   "navigation": the panel's own strip: every source with its label, widen and close.
//
// The panel is the layout's `panel` column holding the `panel-body` stack. Which source is
// open is remembered per space, like Herdr's own tab bar does for Files and Changes.

import { div, View, type Cx, type El } from "gpui-kit";
import { h_flex } from "gpui-base";
import {
  home,
  layout,
  nextCommand,
  openOverlay,
  panes,
  props,
  run,
  setShared,
  shared,
  spaces,
  theme,
  window,
  type PaneInfo,
  type SpaceInfo,
} from "herdr";
import { NODES, SOURCES, type Source } from "../../shared/sources.ts";
import {
  avatar,
  button,
  ICON,
  icon,
  MONO,
  programIcon,
  RADIUS,
  separator,
  spaceFill,
  spinner,
  statusMark,
  stopPress,
  TEXT,
  TRANSPARENT,
  type IconName,
  type Theme,
} from "../../shared/ui.ts";
import { duration, findNode, parseJson, type LayoutNode } from "../../shared/util.ts";
import { tabLabel } from "./label.ts";

const WINDOW_WIDTH = "mc.window.width";

interface Panel {
  node: LayoutNode | null;
  open: boolean;
  active: string | null;
  available: Source[];
}

function panel(root: unknown = layout()): Panel {
  const node = findNode(root, NODES.panel);
  const body = findNode(root, NODES.body);
  const ids = new Set((body?.children ?? []).map((c) => c.id));
  return {
    node,
    open: Boolean(node && !node.hidden),
    active: body?.active ?? null,
    available: SOURCES.filter((s) => ids.has(s.id)),
  };
}

function showSource(id: string): void {
  run("layout.select", { stack: NODES.body, child: id });
  run("layout.show", { id: NODES.panel });
}

function toggleSource(id: string): void {
  const p = panel();
  if (p.open && p.active === id) run("layout.hide", { id: NODES.panel });
  else showSource(id);
}

export default class Tabs extends View {
  declare pressed: number | null;
  declare panels: Record<string, string | null>;
  declare space: string | undefined;
  declare pending: { want: string | null; until: number } | null;
  declare width: number;
  declare normalWidth: number;

  init(_props: unknown, cx: Cx): void {
    this.pressed = null;
    this.panels = parseJson(localStorage.getItem("panels"), {});
    this.space = undefined;
    this.pending = null;
    this.width = 0;
    this.normalWidth = Number(localStorage.getItem("normalWidth")) || 440;
    if (this.view() !== "topbar") return;
    // The pills' tooltips' "working for 3m" only changes by the minute.
    // Only while the shown space has a working tab, and only then does a redraw show anything.
    cx.timer.every(60000, (cx) => {
      if (spaces().some((s) => s.active && s.tabs.some((t) => t.status === "working"))) cx.notify();
    });
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        const p = panel();
        if (c === "panel") {
          if (p.open) run("layout.hide", { id: NODES.panel });
          else showSource(p.active ?? p.available[0]?.id ?? "files");
        } else if (c === "expand") this.expand();
        else if (c.startsWith("source-")) toggleSource(c.slice(7));
        cx.notify();
      }
    });
  }

  view(): "topbar" | "navigation" {
    return (props() as { view?: string } | null)?.view === "navigation" ? "navigation" : "topbar";
  }

  /** Widens the panel to most of the window, or back to the width it had. */
  expand(): void {
    const p = panel();
    const windowWidth = Number(shared(WINDOW_WIDTH)) || 1600;
    const wide = Math.round(windowWidth * 0.62);
    const now = p.node?.size?.px ?? this.normalWidth;
    if (!p.open) showSource(p.active ?? "files");
    if (now >= wide - 4) {
      run("layout.resize", { id: NODES.panel, px: this.normalWidth });
    } else {
      this.normalWidth = now;
      localStorage.setItem("normalWidth", String(now));
      run("layout.resize", { id: NODES.panel, px: wide });
    }
  }

  /** Each space remembers its open source; switching space restores it. */
  syncPanel(p: Panel, space: SpaceInfo | undefined): void {
    if (!space || !p.node) return;
    const now = p.open ? p.active : null;
    if (space.id !== this.space) {
      const first = this.space === undefined;
      this.space = space.id;
      this.pending = null;
      if (!(first && !(space.id in this.panels))) {
        const stored = this.panels[space.id] ?? null;
        const want = p.available.some((s) => s.id === stored) ? stored : null;
        if (want !== now) {
          this.pending = { want, until: Date.now() + 1000 };
          if (want) showSource(want);
          else run("layout.hide", { id: NODES.panel });
          return;
        }
      }
    }
    if (this.pending) {
      if (this.pending.want !== now && Date.now() < this.pending.until) return;
      this.pending = null;
    }
    if (this.panels[space.id] === now) return;
    this.panels[space.id] = now;
    localStorage.setItem("panels", JSON.stringify(this.panels));
  }

  render(): El {
    const t = theme();
    return this.view() === "navigation" ? this.navigation(t) : this.topbar(t);
  }

  // ---- topbar ---------------------------------------------------------------------------

  spaceChip(t: Theme, space: SpaceInfo | undefined, sidebarWidth: number): El {
    const colors = (shared("space.colors") ?? {}) as Record<string, string>;
    const color = space ? (colors[space.id] ?? "ansi6") : "ansi6";
    const fill = spaceFill(t, color);
    return h_flex()
      .id("space-chip")
      .flex_none()
      .when(sidebarWidth > 0, (el: El) => el.w(sidebarWidth - 10))
      .h(32)
      .ml(-5)
      .px(8)
      .gap(8)
      .items_center()
      .rounded(RADIUS.md)
      .cursor_pointer()
      .hover((s: El) => s.bg(t.hover))
      .on_mouse_down("left", stopPress)
      .on_click(() => run("mod.open", { name: "picker" }))
      .tooltip("Switch space")
      .when(Boolean(space), (el: El) =>
        el
          .child(avatar(space?.name ?? "?", fill, 20))
          .child(
            div()
              .min_w(0)
              .truncate()
              .text_size(TEXT.sm)
              .font_medium()
              .text_color(t.foreground)
              .child(space?.name ?? ""),
          )
          .when(Boolean(space?.machine), (e: El) =>
            e.child(
              h_flex()
                .flex_none()
                .gap(4)
                .items_center()
                .text_size(TEXT.xs)
                .text_color(t.muted)
                .child(icon("server", ICON.xs))
                .child(space?.machine ?? ""),
            ),
          ),
      );
  }

  /** A compact pill: its number, the program's icon and a few characters; the rest is in its tooltip. */
  pill(
    t: Theme,
    space: SpaceInfo | undefined,
    tabIndex: number,
    live: PaneInfo[],
    homeDir: string,
  ): El {
    const tabs = space?.tabs ?? [];
    const tab = tabs[tabIndex];
    const label = tabLabel(tab, live, homeDir);
    const program = label.lead?.program;
    const active = tab.active;
    const working = tab.status === "working" && tab.working_since;
    const tooltip = [
      label.tooltip,
      working ? `working for ${duration(Date.now() - (tab.working_since as number))}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    return h_flex()
      .id(`tab-${tab.id}`)
      .h(32)
      .pl(8)
      .pr(active ? 3 : 8)
      .gap(6)
      .items_center()
      .flex_none()
      .rounded(RADIUS.md)
      .text_size(TEXT.sm)
      .font_medium()
      .border(1)
      .cursor_pointer()
      .when(active, (el: El) =>
        el.bg(t.selected).border_color(t.input).text_color(t.foreground).shadow_sm(),
      )
      .when(!active, (el: El) =>
        el
          .border_color(TRANSPARENT)
          .text_color(t.muted)
          .hover((s: El) => s.text_color(t.foreground)),
      )
      .tooltip(tooltip)
      .on_mouse_down("left", (e: { click_count?: number }, cx: Cx) => {
        cx.stop_propagation();
        this.pressed = tabIndex;
        if (e.click_count === 2) run("tab.rename", { id: tab.id });
      })
      .on_mouse_up("left", () => {
        const from = this.pressed;
        this.pressed = null;
        if (from !== null && from !== tabIndex)
          run("tab.move", { id: tabs[from].id, index: tabIndex + 1 });
        else run("tab.select", { id: tab.id });
      })
      .on_mouse_down("right", (_e: unknown, cx: Cx) => {
        cx.stop_propagation();
        openOverlay({
          mod: "menu",
          kind: "popup",
          width: 200,
          props: { tab: "tab", target: { id: tab.id, space: space?.id } },
        });
      })
      .child(
        div()
          .flex_none()
          .font_family(MONO)
          .text_size(TEXT.xs)
          .text_color(t.muted)
          .child(String(tab.index)),
      )
      .when(Boolean(program?.icon), (el: El) =>
        el.child(programIcon(program, ICON.sm, active ? t.foreground : t.muted) as El),
      )
      .child(div().flex_none().child(label.short))
      .when(tab.zoomed, (el: El) => el.child(icon("zoom-in", ICON.xs, t.accent)))
      .when(Boolean(working), (el: El) => el.child(spinner(ICON.sm, t.working)))
      .when(tab.status === "blocked" || tab.status === "done", (el: El) =>
        el.child(statusMark(tab.status, true)),
      )
      .when(active, (el: El) =>
        el.child(
          button(`close-${tab.id}`, {
            icon: "x",
            size: "icon-xs",
            iconSize: ICON.xs,
            tooltip: "Close tab",
            onClick: (_e, cx) => {
              cx.stop_propagation();
              run("tab.close", { id: tab.id });
            },
          }),
        ),
      );
  }

  sourceButtons(_t: Theme, p: Panel): El[] {
    return p.available.map((s) => {
      const on = p.open && p.active === s.id;
      return button(`src-${s.id}`, {
        icon: s.icon as IconName,
        size: "icon-sm",
        iconSize: ICON.sm,
        active: on,
        tooltip: on ? `Hide ${s.label}` : s.label,
        onClick: () => toggleSource(s.id),
      });
    });
  }

  topbar(t: Theme): El {
    // Each host call once per render, passed down.
    const space = spaces().find((s) => s.active);
    const tabs = space?.tabs ?? [];
    const root = layout();
    const live = panes();
    const homeDir = home();
    const p = panel(root);
    this.syncPanel(p, space);
    const sidebar = findNode(root, NODES.sidebar);
    const sidebarWidth = sidebar && !sidebar.hidden ? (sidebar.size?.px ?? 0) : 0;
    const w = window();
    return h_flex()
      .id("root")
      .size_full()
      .min_w(0)
      .pl(10)
      .pr(6)
      .gap(4)
      .items_center()
      .bg(t.chrome)
      .border_b(1)
      .border_color(t.border)
      .on_size_change((size: { width: number }) => {
        // In 16 px steps: every change re-renders every mod, and a drag fires one per pixel.
        const width = Math.round(size.width / 16) * 16;
        if (shared(WINDOW_WIDTH) !== width) setShared(WINDOW_WIDTH, width);
      })
      .on_mouse_up("left", () => {
        this.pressed = null;
      })
      .on_scroll_wheel((e: { delta: { y: number } }) => {
        if (Math.abs(e.delta.y) >= 1) run(e.delta.y > 0 ? "tab.prev" : "tab.next");
      })
      .child(this.spaceChip(t, space, sidebarWidth))
      .child(
        h_flex()
          .id("tab-scroll")
          .flex_1()
          .min_w(0)
          .h_full()
          .items_center()
          .gap(4)
          .overflow_x_scrollbar()
          .children(tabs.map((_tab, i) => this.pill(t, space, i, live, homeDir))),
      )
      .child(
        button("tab-new", {
          icon: "plus",
          size: "icon-sm",
          tooltip: "New tab",
          onClick: () => openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 }),
        }),
      )
      .child(separator(true, 16))
      .children(this.sourceButtons(t, p))
      .when(Boolean(w?.buttons), (el: El) =>
        el
          .child(separator(true, 16))
          .child(
            button("minimize", {
              icon: "minus",
              size: "icon-sm",
              tooltip: "Minimize",
              onClick: () => run("window.minimize"),
            }),
          )
          .child(
            button("maximize", {
              icon: "square",
              size: "icon-sm",
              iconSize: ICON.sm,
              tooltip: w?.maximized ? "Restore" : "Maximize",
              onClick: () => run("window.maximize"),
            }),
          )
          .child(
            button("close-window", {
              icon: "x",
              size: "icon-sm",
              tooltip: "Close window",
              onClick: () => run("window.close"),
            }),
          ),
      );
  }

  // ---- navigation strip -----------------------------------------------------------------

  navigation(t: Theme): El {
    const p = panel();
    const windowWidth = Number(shared(WINDOW_WIDTH)) || 1600;
    const wide = (p.node?.size?.px ?? 0) >= Math.round(windowWidth * 0.62) - 4;
    // Full labels, short labels, or icons, whichever fits; the shown source always has its label.
    const need = (labels: string[]) => labels.reduce((n, l) => n + l.length * 7 + 34, 0) + 80;
    const mode =
      this.width >= need(p.available.map((s) => s.label))
        ? "label"
        : this.width >= need(p.available.map((s) => s.short))
          ? "short"
          : "icon";
    return h_flex()
      .id("root")
      .size_full()
      .min_w(0)
      .px(8)
      .gap(4)
      .items_center()
      .bg(t.chrome)
      .border_b(1)
      .border_color(t.border)
      .on_size_change((size: { width: number }, cx: Cx) => {
        if (Math.abs(size.width - this.width) >= 1) {
          this.width = size.width;
          cx.notify();
        }
      })
      .children(
        p.available.map((s) => {
          const on = p.active === s.id;
          const text =
            on || mode === "label"
              ? mode === "label"
                ? s.label
                : s.short
              : mode === "short"
                ? s.short
                : "";
          return h_flex()
            .id(`nav-${s.id}`)
            .h(28)
            .px(8)
            .gap(6)
            .flex_none()
            .items_center()
            .rounded(RADIUS.md)
            .text_size(TEXT.sm)
            .font_medium()
            .cursor_pointer()
            .when(on, (el: El) => el.bg(t.selected).text_color(t.foreground))
            .when(!on, (el: El) =>
              el.text_color(t.muted).hover((st: El) => st.bg(t.hover).text_color(t.foreground)),
            )
            .on_click(() => showSource(s.id))
            .tooltip(s.label)
            .child(icon(s.icon as IconName, ICON.sm))
            .when(Boolean(text), (el: El) => el.child(text));
        }),
      )
      .child(div().flex_1())
      .child(
        button("nav-expand", {
          icon: wide ? "minimize-2" : "maximize-2",
          size: "icon-sm",
          iconSize: ICON.sm,
          tooltip: wide ? "Narrow the panel" : "Widen the panel",
          onClick: () => this.expand(),
        }),
      )
      .child(
        button("nav-close", {
          icon: "x",
          size: "icon-sm",
          tooltip: "Hide the panel",
          onClick: () => run("layout.hide", { id: NODES.panel }),
        }),
      );
  }
}
