// Two views from one mod (props.view):
//
//   "topbar":     the shown space, its tabs as compact pills (number, program icon and a few characters
//                 of its name; folder, branch, panes and working time in the tooltip), the + menu
//                 and one button per side panel source. Keys: `mc-tabs.panel`, `mc-tabs.expand`, `mc-tabs.source-<id>`.
//   "navigation": the panel's own strip: every source with its label, widen and close.
//
// The panel is the layout's `panel` column holding the `panel-body` stack. Which source is
// open is remembered per space, like Herdr's own tab bar does for Files and Changes.

import { div, image, svg, View, type Cx, type El } from "gpui-kit";
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
  alpha,
  asset,
  chromeIcon,
  iconButton,
  sourceIcon,
  spaceFill,
  statusMark,
  stopPress,
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
      .h(30)
      .ml(-5)
      .pl(5)
      .pr(10)
      .gap(8)
      .items_center()
      .rounded(7)
      .cursor_pointer()
      .hover((s: El) => s.bg(t.hover))
      .on_mouse_down("left", stopPress)
      .on_click(() => run("mod.open", { name: "picker" }))
      .tooltip("Switch space")
      .when(Boolean(space), (el: El) =>
        el
          .child(
            h_flex()
              .size(20)
              .flex_none()
              .rounded(5)
              .bg(fill)
              .items_center()
              .justify_center()
              .text_size(11)
              .font_bold()
              .text_color("#ffffff")
              .child([...(space?.name ?? "?")][0]?.toUpperCase() ?? "?"),
          )
          .child(
            div()
              .min_w(0)
              .truncate()
              .text_size(13)
              .font_semibold()
              .text_color(t.foreground)
              .child(space?.name ?? ""),
          )
          .when(Boolean(space?.machine), (e: El) =>
            e.child(
              h_flex()
                .flex_none()
                .gap(4)
                .items_center()
                .text_size(11.5)
                .text_color(t.dim)
                .child(svg(chromeIcon("server")).size(11))
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
      .h(30)
      .pl(8)
      .pr(active ? 4 : 8)
      .gap(6)
      .items_center()
      .flex_none()
      .rounded(7)
      .text_size(12.5)
      .border(1)
      .border_color(active ? t.border : alpha(t.chrome, "00"))
      .bg(active ? t.raised : t.chrome)
      .text_color(active ? t.foreground : t.muted)
      .cursor_pointer()
      .hover((s: El) => s.bg(active ? t.raised : t.hover))
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
      .child(div().flex_none().text_size(10.5).text_color(t.dim).child(String(tab.index)))
      .when(Boolean(program?.icon), (el: El) =>
        el.child(
          program?.tint
            ? svg(program.icon as string)
                .size(14)
                .flex_none()
                .text_color(active ? t.foreground : t.muted)
            : image(program?.icon as string)
                .size(14)
                .flex_none(),
        ),
      )
      .child(div().flex_none().child(label.short))
      .when(tab.zoomed, (el: El) =>
        el.child(div().flex_none().text_size(10.5).font_bold().text_color(t.accent).child("Z")),
      )
      .when(Boolean(working), (el: El) => el.child(statusMark("working")))
      .when(tab.status === "blocked" || tab.status === "done", (el: El) =>
        el.child(statusMark(tab.status, true)),
      )
      .when(active, (el: El) =>
        el.child(
          iconButton(
            `close-${tab.id}`,
            asset("close"),
            "Close tab",
            (_e, cx) => {
              cx.stop_propagation();
              run("tab.close", { id: tab.id });
            },
            { size: 18, iconSize: 11 },
          ),
        ),
      );
  }

  sourceButtons(t: Theme, p: Panel): El[] {
    return p.available.map((s) =>
      iconButton(
        `src-${s.id}`,
        sourceIcon(s),
        p.open && p.active === s.id ? `Hide ${s.label}` : s.label,
        () => toggleSource(s.id),
        {
          active: p.open && p.active === s.id,
          iconSize: 14,
        },
      ),
    );
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
    const button = (id: string, label: El | string, tip: string, action: () => void) =>
      div()
        .id(id)
        .size(26)
        .flex_none()
        .flex()
        .items_center()
        .justify_center()
        .rounded(6)
        .cursor_pointer()
        .text_color(t.dim)
        .hover((s: El) => s.bg(t.hover).text_color(t.foreground))
        .on_mouse_down("left", stopPress)
        .on_click(action)
        .tooltip(tip)
        .child(label);
    return h_flex()
      .id("root")
      .size_full()
      .min_w(0)
      .pl(10)
      .pr(6)
      .gap(3)
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
          .gap(3)
          .overflow_x_scrollbar()
          .children(tabs.map((_tab, i) => this.pill(t, space, i, live, homeDir))),
      )
      .child(
        iconButton("tab-new", chromeIcon("plus"), "New tab", () =>
          openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 }),
        ),
      )
      .child(div().w(1).h(18).mx(4).bg(t.border))
      .children(this.sourceButtons(t, p))
      .when(Boolean(w?.buttons), (el: El) =>
        el
          .child(div().w(1).h(18).mx(4).bg(t.border))
          .child(button("minimize", "−", "Minimize", () => run("window.minimize")))
          .child(
            button("maximize", "□", w?.maximized ? "Restore" : "Maximize", () =>
              run("window.maximize"),
            ),
          )
          .child(
            button("close-window", svg(asset("close")).size(13), "Close window", () =>
              run("window.close"),
            ),
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
      .gap(2)
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
            .h(26)
            .px(8)
            .gap(6)
            .flex_none()
            .items_center()
            .rounded(6)
            .text_size(12.5)
            .cursor_pointer()
            .when(on, (el: El) => el.bg(t.selected).text_color(t.foreground))
            .when(!on, (el: El) =>
              el.text_color(t.muted).hover((st: El) => st.bg(t.hover).text_color(t.foreground)),
            )
            .on_click(() => showSource(s.id))
            .tooltip(s.label)
            .child(svg(sourceIcon(s)).size(14).flex_none())
            .when(Boolean(text), (el: El) => el.child(text));
        }),
      )
      .child(div().flex_1())
      .child(
        iconButton(
          "nav-expand",
          asset(wide ? "shrink" : "expand"),
          wide ? "Narrow the panel" : "Widen the panel",
          () => this.expand(),
          { iconSize: 13 },
        ),
      )
      .child(
        iconButton(
          "nav-close",
          asset("close"),
          "Hide the panel",
          () => run("layout.hide", { id: NODES.panel }),
          { iconSize: 13 },
        ),
      );
  }
}
