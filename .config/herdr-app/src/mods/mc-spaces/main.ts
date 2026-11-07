// Spaces, grouped by machine, with a search field. The block sizes itself to its rows
// (`layout.resize` on its own node) so the Agents list under it takes all the height left:
// adding spaces pushes Agents down, removing them lets it float back up. Past the room
// Agents needs, the list scrolls instead.

import { div, svg, View, type Cx, type El } from "gpui-kit";
import { h_flex, v_flex, InputState } from "gpui-base";
import {
  hc,
  layout,
  machines,
  openOverlay,
  run,
  setShared,
  shared,
  spaces,
  theme,
  type SpaceInfo,
} from "herdr";
import { KEYS, NODES } from "../../shared/sources.ts";
import {
  asset,
  chromeIcon,
  iconButton,
  searchBox,
  sectionHeader,
  statusMark,
  stopPress,
  type Theme,
} from "../../shared/ui.ts";
import { findNode, matches, parseJson } from "../../shared/util.ts";
import { GROUP, PAD, ROW, SEARCH, targetHeight } from "./size.ts";

interface Machine {
  name: string;
  state: string;
  temporary?: boolean;
}

// The same avatar colors Herdr's own spaces list uses, kept in the same shared key.
const MARK: Record<string, string> = {
  ansi6: "#22a99a",
  ansi3: "#e3814f",
  ansi4: "#5b8def",
  ansi5: "#8b7cf6",
  ansi2: "#3fae6a",
  ansi1: "#d9649a",
};
const PALETTE = Object.keys(MARK);

const narrow = (): boolean => (findNode(layout(), NODES.sidebar)?.size?.px ?? Infinity) < 160;

export default class Spaces extends View {
  declare search: InputState;
  declare machineList: Machine[];
  declare folded: Set<string>;
  declare hovered: string | null;
  declare pressed: string | null;
  declare over: string | null;
  declare height: number;
  declare lastResize: { px: number; at: number } | null;

  init(_props: unknown, cx: Cx): void {
    this.search = InputState.new({ placeholder: "Find a space" });
    this.search.on("change", (_e, cx) => cx.notify());
    this.machineList = [];
    this.folded = new Set(parseJson<string[]>(localStorage.getItem("machines.folded"), []));
    this.hovered = null;
    this.pressed = null;
    this.over = null;
    this.height = 0;
    this.lastResize = null;
    this.refreshMachines(cx);
    cx.timer.every(20000, (cx) => this.refreshMachines(cx));
  }

  refreshMachines(cx: Cx): void {
    cx.spawn(async (cx) => {
      try {
        const r = await hc(["machine", "ls", "--json"]);
        if (r.code === 0) {
          const list = parseJson<{ machines?: Machine[] }>(r.stdout, {}).machines ?? [];
          this.machineList = list.filter((m) => !m.temporary);
        }
      } catch {
        // keep the last list
      }
      cx.notify();
    });
  }

  spacesFolded(): boolean {
    return shared(KEYS.spacesFolded) === true;
  }

  /** Gives each space a stable avatar color, shared with Herdr's own sidebar. */
  colors(list: SpaceInfo[]): Record<string, string> {
    const stored = (shared("space.colors") ?? {}) as Record<string, string>;
    const ids = new Set(list.map((s) => s.id));
    const kept = Object.fromEntries(Object.entries(stored).filter(([id]) => ids.has(id)));
    let changed = Object.keys(kept).length !== Object.keys(stored).length;
    for (const s of list) {
      if (kept[s.id]) continue;
      const uses = (c: string) => Object.values(kept).filter((v) => v === c).length;
      kept[s.id] = PALETTE.reduce((best, c) => (uses(c) < uses(best) ? c : best));
      changed = true;
    }
    if (changed) setShared("space.colors", kept);
    return kept;
  }

  /** Machines in Herdr's order: this computer, then the others by name. */
  groups(list: SpaceInfo[]): { machine: string | null; spaces: SpaceInfo[] }[] {
    const names = new Set<string>();
    for (const s of list) if (s.machine) names.add(s.machine);
    for (const m of this.machineList) names.add(m.name);
    const remote = [...names].sort();
    if (!remote.length) return [{ machine: null, spaces: list }];
    return [null, ...remote].map((machine) => ({
      machine,
      spaces: list.filter((s) => (s.machine ?? null) === machine),
    }));
  }

  /** Sizes this block to its rows, leaving Agents the rest (see size.ts). */
  autosize(rows: number, groups: number): void {
    const node = findNode(layout(), NODES.spaces);
    const current = node?.size?.px;
    if (current === undefined) return;
    const agentsHeight = shared(KEYS.agentsHeight);
    const want = targetHeight({
      rows,
      groups,
      searching: !this.spacesFolded(),
      spacesFolded: this.spacesFolded(),
      agentsFolded: shared(KEYS.agentsFolded) === true,
      available:
        typeof agentsHeight === "number" && this.height > 0 ? this.height + agentsHeight : null,
    });
    if (Math.abs(want - current) < 2) return;
    if (this.lastResize?.px === want && Date.now() - this.lastResize.at < 1000) return;
    this.lastResize = { px: want, at: Date.now() };
    run("layout.resize", { id: NODES.spaces, px: want });
  }

  menu(space: SpaceInfo): void {
    openOverlay({
      mod: "menu",
      kind: "popup",
      width: 200,
      height: 260,
      props: { tab: "space", target: { id: space.id } },
    });
  }

  row(t: Theme, s: SpaceInfo, color: string): El {
    const on = s.active;
    const fill = color.startsWith("#") ? color : (MARK[color] ?? t[color] ?? t.accent);
    const sameMachine = (id: string | null) =>
      (spaces().find((x) => x.id === id)?.machine ?? null) === (s.machine ?? null);
    const dragging = this.pressed !== null && this.pressed !== s.id && this.over === s.id;
    const from = spaces().findIndex((x) => x.id === this.pressed);
    const index = spaces().findIndex((x) => x.id === s.id);
    const branch = s.branch && !["main", "master", s.name].includes(s.branch) ? s.branch : "";
    const hovered = this.hovered === s.id;
    return h_flex()
      .id(`space-${s.id}`)
      .relative()
      .h(ROW)
      .flex_none()
      .px(8)
      .gap(9)
      .items_center()
      .rounded(8)
      .cursor_pointer()
      .when(on, (el: El) => el.bg(t.selected))
      .when(!on, (el: El) => el.hover((st: El) => st.bg(t.hover)))
      .when(this.pressed === s.id && this.over !== s.id, (el: El) => el.opacity(0.5))
      .when(dragging, (el: El) =>
        el.child(
          div()
            .absolute()
            .left(0)
            .right(0)
            .h(2)
            .bg(t.accent)
            .when(from < index, (l: El) => l.bottom(0))
            .when(from > index, (l: El) => l.top(0)),
        ),
      )
      .on_hover((over: boolean, cx: Cx) => {
        if (over) this.hovered = s.id;
        else if (this.hovered === s.id) this.hovered = null;
        cx.notify();
      })
      .on_mouse_down("left", () => {
        this.pressed = s.id;
        this.over = s.id;
      })
      .on_mouse_move((_e: unknown, cx: Cx) => {
        const over = this.pressed !== null && sameMachine(this.pressed) ? s.id : null;
        if (this.pressed !== null && this.over !== over) {
          this.over = over;
          cx.notify();
        }
      })
      .on_mouse_up("left", (_e: unknown, cx: Cx) => {
        const pressed = this.pressed;
        const over = this.over;
        this.pressed = null;
        this.over = null;
        if (pressed !== null && over === s.id && pressed !== s.id)
          run("space.move", { id: pressed, index: index + 1 });
        else if (pressed === s.id) run("space.select", { id: s.id });
        cx.notify();
      })
      .on_mouse_down("right", () => this.menu(s))
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
          .child([...s.name][0]?.toUpperCase() ?? "?"),
      )
      .child(
        div()
          .flex_shrink(0)
          .max_w(150)
          .truncate()
          .text_color(on ? t.foreground : t.muted)
          .child(s.name),
      )
      .child(
        div()
          .flex_1()
          .min_w(0)
          .truncate()
          .text_size(11.5)
          .text_color(t.dim)
          .when(Boolean(branch), (el: El) => el.child(branch)),
      )
      .when(s.status === "working" || s.status === "blocked" || s.status === "done", (el: El) =>
        el.child(statusMark(s.status, true)),
      )
      .when(hovered, (el: El) =>
        el.child(
          iconButton(
            `space-more-${s.id}`,
            asset("more"),
            "Space menu",
            (_e, cx) => {
              cx.stop_propagation();
              this.menu(s);
            },
            { size: 22, iconSize: 14 },
          ),
        ),
      );
  }

  machineHeader(t: Theme, machine: string | null, count: number): El {
    const key = machine ?? "";
    const info = this.machineList.find((m) => m.name === machine);
    const layoutState = machines().find((m) => m.name === machine)?.layout;
    const connected = !machine || info?.state === "connected";
    const folded = this.folded.has(key);
    return h_flex()
      .id(`machine-${machine ?? "local"}`)
      .h(GROUP)
      .flex_none()
      .px(8)
      .gap(7)
      .items_center()
      .text_size(11.5)
      .text_color(t.dim)
      .cursor_pointer()
      .hover((s: El) => s.text_color(t.muted))
      .on_click((_e: unknown, cx: Cx) => {
        if (folded) this.folded.delete(key);
        else this.folded.add(key);
        localStorage.setItem("machines.folded", JSON.stringify([...this.folded]));
        cx.notify();
      })
      .child(
        svg(chromeIcon(folded ? "chevron-right" : "chevron-down"))
          .size(11)
          .flex_none(),
      )
      .child(
        svg(chromeIcon(machine ? "server" : "monitor"))
          .size(12)
          .flex_none(),
      )
      .child(
        div()
          .min_w(0)
          .truncate()
          .child(machine ?? "This computer"),
      )
      .child(div().flex_none().child(String(count)))
      .child(div().flex_1())
      .when(!connected, (el: El) =>
        el.child(
          div()
            .flex_none()
            .child((info?.state ?? "offline").replace(/_/g, " ")),
        ),
      )
      .when(connected && layoutState === "loading", (el: El) =>
        el.child(div().flex_none().child("loading…")),
      )
      .when(connected, (el: El) =>
        el.child(
          div()
            .id(`machine-new-${machine ?? "local"}`)
            .flex_none()
            .px(4)
            .rounded(4)
            .hover((s: El) => s.bg(t.hover).text_color(t.foreground))
            .on_mouse_down("left", stopPress)
            .on_click((_e: unknown, cx: Cx) => {
              cx.stop_propagation();
              run("space.new", { machine: machine ?? "" });
            })
            .tooltip(`New space on ${machine ?? "this computer"}`)
            .child("+"),
        ),
      )
      .child(
        div()
          .size(6)
          .rounded(3)
          .flex_none()
          .bg(connected ? t.ansi2 : t.dim),
      );
  }

  compact(t: Theme, list: SpaceInfo[]): El {
    return v_flex()
      .size_full()
      .bg(t.chrome)
      .pt(6)
      .text_size(12.5)
      .children(
        list.map((s, i) =>
          h_flex()
            .id(`space-${s.id}`)
            .h(26)
            .flex_none()
            .justify_center()
            .items_center()
            .gap(4)
            .when(s.active, (el: El) => el.bg(t.selected))
            .hover((st: El) => st.bg(t.hover))
            .on_click(() => run("space.select", { id: s.id }))
            .child(
              div()
                .text_color(s.active ? t.foreground : t.muted)
                .child(String(i + 1)),
            )
            .child(statusMark(s.status, true)),
        ),
      );
  }

  render(): El {
    const t = theme();
    const all = spaces();
    const colors = this.colors(all);
    if (narrow()) return this.compact(t, all);

    const open = !this.spacesFolded();
    const query = this.search.value();
    const shown = all.filter((s) => matches(query, s.name, s.branch, s.machine ?? "this computer"));
    const groups = this.groups(shown);
    const grouped = groups.length > 1;
    const rows: El[] = [];
    let rowCount = 0;
    for (const g of groups) {
      if (grouped) rows.push(this.machineHeader(t, g.machine, g.spaces.length));
      if (grouped && this.folded.has(g.machine ?? "")) continue;
      for (const s of g.spaces) rows.push(this.row(t, s, colors[s.id] ?? "ansi6"));
      rowCount += g.spaces.length;
    }
    if (!shown.length) {
      rows.push(
        div()
          .px(10)
          .py(6)
          .text_size(12)
          .text_color(t.dim)
          .child(query ? "No space matches." : "No spaces yet."),
      );
      rowCount += 1;
    }
    this.autosize(rowCount, grouped ? groups.length : 0);

    return v_flex()
      .id("root")
      .size_full()
      .min_h(0)
      .bg(t.chrome)
      .text_size(13)
      .on_size_change((size: { height: number }, cx: Cx) => {
        if (Math.abs(size.height - this.height) >= 1) {
          this.height = size.height;
          cx.notify();
        }
      })
      .on_mouse_up("left", (_e: unknown, cx: Cx) => {
        this.pressed = null;
        this.over = null;
        cx.notify();
      })
      .child(
        sectionHeader(
          "spaces-header",
          "Spaces",
          all.length,
          open,
          () => setShared(KEYS.spacesFolded, open),
          [
            iconButton("space-new", chromeIcon("plus"), "New space", () => run("space.new"), {
              size: 24,
              iconSize: 14,
            }),
          ],
        ),
      )
      .when(open, (el: El) =>
        el
          .child(
            h_flex()
              .flex_none()
              .h(SEARCH)
              .px(10)
              .pb(8)
              .child(searchBox("space-search", this.search)),
          )
          .child(
            v_flex()
              .id("space-list")
              .flex_1()
              .min_h(0)
              .px(6)
              .pb(PAD)
              .gap(2)
              .overflow_y_scrollbar()
              .children(rows),
          ),
      );
  }
}
