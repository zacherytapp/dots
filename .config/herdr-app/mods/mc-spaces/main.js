// Generated from src/mods/mc-spaces/main.ts and its imports by `pnpm build:herdr`. Edit the sources, not this file.
// .config/herdr-app/src/mods/mc-spaces/main.ts
import { div as div2, svg as svg2, View } from "gpui-kit";
import { h_flex as h_flex2, v_flex as v_flex2, InputState } from "gpui-base";
import {
  hc,
  layout,
  machines,
  openOverlay,
  run,
  setShared,
  shared,
  spaces,
  theme as theme2,
} from "herdr";

// .config/herdr-app/src/shared/sources.ts
var NODES = {
  sidebar: "sidebar",
  spaces: "mc-spaces",
  agents: "mc-agents",
  panel: "panel",
  body: "panel-body",
};
var KEYS = {
  agentsHeight: "mc.agents.height",
  agentsFolded: "mc.agents.folded",
  spacesFolded: "mc.spaces.folded",
  /** Per source: "space" or "all". */
  scope: (source) => `mc.${source}.scope`,
};

// .config/herdr-app/src/shared/ui.ts
import { div, image, svg } from "gpui-kit";
import { h_flex, v_flex, Input } from "gpui-base";
import { theme } from "herdr";

// .config/herdr-app/src/shared/icons.ts
import { appHome, exec, readTextFile, writeTextFile } from "herdr";

// .config/herdr-app/src/assets/agent.svg
var agent_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="8" width="15" height="11.5" rx="3"/><path d="M12 8V4.8"/><circle cx="12" cy="3.6" r="1.1"/><circle cx="9.3" cy="13.5" r="1.1" fill="currentColor"/><circle cx="14.7" cy="13.5" r="1.1" fill="currentColor"/></svg>\n';

// .config/herdr-app/src/assets/close.svg
var close_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg>\n';

// .config/herdr-app/src/assets/comment.svg
var comment_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-7.5L7 20v-3.5H5A1.5 1.5 0 0 1 3.5 15V6A1.5 1.5 0 0 1 5 4.5z"/></svg>\n';

// .config/herdr-app/src/assets/expand.svg
var expand_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4H20v5.5M20 4l-6.5 6.5M9.5 20H4v-5.5M4 20l6.5-6.5"/></svg>\n';

// .config/herdr-app/src/assets/external.svg
var external_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-8.5 8.5"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>\n';

// .config/herdr-app/src/assets/eye.svg
var eye_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/></svg>\n';

// .config/herdr-app/src/assets/forgejo.svg
var forgejo_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="17.5" cy="5" r="2.2"/><circle cx="17.5" cy="13.5" r="2.2"/><circle cx="6.5" cy="19" r="2.2"/><path d="M6.5 16.8V11a6 6 0 0 1 6-6h2.8M6.5 16.8a3.3 3.3 0 0 1 3.3-3.3h5.5"/></svg>\n';

// .config/herdr-app/src/assets/history.svg
var history_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4.2v4.3h4.3"/><path d="M12 7.5V12l3 2"/></svg>\n';

// .config/herdr-app/src/assets/issue.svg
var issue_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>\n';

// .config/herdr-app/src/assets/jira.svg
var jira_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.8 21.2 12 12 21.2 2.8 12z"/><path d="M12 8.2 15.8 12 12 15.8 8.2 12z"/></svg>\n';

// .config/herdr-app/src/assets/more.svg
var more_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="5.5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18.5" cy="12" r="1.6"/></svg>\n';

// .config/herdr-app/src/assets/pull-request.svg
var pull_request_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="5.5" r="2.2"/><circle cx="6" cy="18.5" r="2.2"/><circle cx="18" cy="18.5" r="2.2"/><path d="M6 7.7v8.6M18 16.3V10a4 4 0 0 0-4-4h-3.5M12.5 3.5 10.5 6l2 2.5"/></svg>\n';

// .config/herdr-app/src/assets/refresh.svg
var refresh_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 10.5A7.7 7.7 0 0 0 5.6 7.4L4 9"/><path d="M4 4.5V9h4.5"/><path d="M4.5 13.5a7.7 7.7 0 0 0 13.9 3.1L20 15"/><path d="M20 19.5V15h-4.5"/></svg>\n';

// .config/herdr-app/src/assets/shrink.svg
var shrink_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 9.5H14V4M14 9.5 20 3.5M4.5 14.5H10V20M10 14.5 4 20.5"/></svg>\n';

// .config/herdr-app/src/assets/terminal.svg
var terminal_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="m7 9.5 3 2.5-3 2.5M12.5 15h4"/></svg>\n';

// .config/herdr-app/src/shared/icon-data.ts
var ICONS = {
  agent: agent_default,
  close: close_default,
  comment: comment_default,
  expand: expand_default,
  external: external_default,
  eye: eye_default,
  forgejo: forgejo_default,
  history: history_default,
  issue: issue_default,
  jira: jira_default,
  more: more_default,
  "pull-request": pull_request_default,
  refresh: refresh_default,
  shrink: shrink_default,
  terminal: terminal_default,
};

// .config/herdr-app/src/shared/icons.ts
var installing = null;
function install() {
  const dir = `${appHome()}/mods/mc-spaces/icons`;
  return (async () => {
    await exec("mkdir", ["-p", dir]);
    for (const [name, svg3] of Object.entries(ICONS)) {
      const path = `${dir}/${name}.svg`;
      const now = await readTextFile(path).catch(() => null);
      if (now !== svg3) await writeTextFile(path, svg3, now).catch(() => null);
    }
  })().catch(() => {
    installing = null;
  });
}
function asset(name) {
  installing ??= install();
  return `mods/mc-spaces/icons/${name}.svg`;
}

// .config/herdr-app/src/shared/ui.ts
var chromeIcon = (name) => `mods/workspace-chrome/${name}.svg`;
var stopPress = (_e, cx) => cx.stop_propagation();
var alpha = (color, a) =>
  color && /^#[0-9a-f]{6}$/i.test(color) ? `${color}${a}` : (color ?? "#00000000");
function iconButton(id, icon, tooltip, onClick, opts = {}) {
  const t = theme();
  const size = opts.size ?? 26;
  return div()
    .id(id)
    .size(size)
    .flex_none()
    .flex()
    .items_center()
    .justify_center()
    .rounded(6)
    .cursor_pointer()
    .text_color(opts.active ? t.foreground : t.dim)
    .when(Boolean(opts.active), (el) => el.bg(t.selected))
    .hover((s) => s.bg(t.hover).text_color(t.foreground))
    .on_mouse_down("left", stopPress)
    .on_click(onClick)
    .tooltip(tooltip)
    .child(svg(icon).size(opts.iconSize ?? 15));
}
function searchBox(id, state, opts = {}) {
  const t = theme();
  return h_flex()
    .id(id)
    .h(opts.height ?? 30)
    .px(10)
    .gap(8)
    .flex_1()
    .min_w(0)
    .items_center()
    .rounded(8)
    .border(1)
    .border_color(t.border)
    .bg(t.background)
    .cursor_text()
    .on_mouse_down("left", stopPress)
    .child(svg(chromeIcon("search")).size(13).flex_none().text_color(t.dim))
    .child(Input.new(state).flex_1().min_w(0).h_full().text_size(12.5).text_color(t.foreground));
}
function statusMark(status, compact = false) {
  const t = theme();
  if (status === "working") {
    return svg(chromeIcon("spinner")).size(12).mx(1).flex_none().text_color(t.working).spin(900);
  }
  if (status === "blocked") {
    return compact
      ? div().size(7).mx(3).flex_none().rounded(4).bg(t.blocked)
      : div()
          .flex_none()
          .px(6)
          .h(18)
          .rounded(5)
          .bg(alpha(t.blocked, "26"))
          .text_size(10.5)
          .font_semibold()
          .text_color(t.blocked)
          .flex()
          .items_center()
          .child("Needs you");
  }
  if (status === "done") return div().size(7).mx(3).flex_none().rounded(4).bg(t.done);
  if (status === "idle")
    return div()
      .size(7)
      .mx(3)
      .flex_none()
      .rounded(4)
      .border(1.5)
      .border_color(t.idle ?? t.dim);
  return div().size(7).mx(3).flex_none();
}
function sectionHeader(id, label, count, open, onToggle, trailing = []) {
  const t = theme();
  return h_flex()
    .id(id)
    .h(34)
    .flex_none()
    .pl(10)
    .pr(8)
    .gap(6)
    .items_center()
    .text_size(12.5)
    .child(
      h_flex()
        .id(`${id}-fold`)
        .flex_1()
        .min_w(0)
        .h_full()
        .gap(7)
        .items_center()
        .cursor_pointer()
        .text_color(t.muted)
        .hover((s) => s.text_color(t.foreground))
        .on_click((_e, cx) => onToggle(cx))
        .child(
          svg(chromeIcon(open ? "chevron-down" : "chevron-right"))
            .size(12)
            .flex_none(),
        )
        .child(div().font_medium().text_color(t.foreground).child(label))
        .when(count !== null, (el) =>
          el.child(div().text_size(11.5).text_color(t.dim).child(String(count))),
        ),
    )
    .children(trailing);
}

// .config/herdr-app/src/shared/util.ts
function findNode(node, id) {
  const n = node;
  if (!n) return null;
  if (n.id === id) return n;
  for (const child of n.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}
function matches(query, ...hay) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = hay.filter(Boolean).join(" ").toLowerCase();
  return words.every((w) => text.includes(w));
}
function parseJson(text, fallback) {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

// .config/herdr-app/src/mods/mc-spaces/size.ts
var HEADER = 34;
var SEARCH = 38;
var ROW = 32;
var GROUP = 26;
var GAP = 2;
var PAD = 8;
var AGENTS_MIN = 220;
var FIRST_MAX = 360;
function contentHeight(rows, groups, searching) {
  const items = rows + groups;
  return (
    HEADER +
    (searching ? SEARCH : 0) +
    rows * ROW +
    groups * GROUP +
    Math.max(0, items - 1) * GAP +
    PAD
  );
}
function targetHeight(input) {
  if (input.spacesFolded) return HEADER;
  const content = contentHeight(input.rows, input.groups, input.searching);
  if (input.available === null) return Math.min(content, FIRST_MAX);
  if (input.agentsFolded) return Math.max(HEADER, input.available - HEADER);
  return Math.max(HEADER, Math.min(content, input.available - AGENTS_MIN));
}

// .config/herdr-app/src/mods/mc-spaces/main.ts
var MARK = {
  ansi6: "#22a99a",
  ansi3: "#e3814f",
  ansi4: "#5b8def",
  ansi5: "#8b7cf6",
  ansi2: "#3fae6a",
  ansi1: "#d9649a",
};
var PALETTE = Object.keys(MARK);
var narrow = () => (findNode(layout(), NODES.sidebar)?.size?.px ?? Infinity) < 160;
var Spaces = class extends View {
  init(_props, cx) {
    this.search = InputState.new({ placeholder: "Find a space" });
    this.search.on("change", (_e, cx2) => cx2.notify());
    this.machineList = [];
    this.folded = new Set(parseJson(localStorage.getItem("machines.folded"), []));
    this.hovered = null;
    this.pressed = null;
    this.over = null;
    this.height = 0;
    this.lastResize = null;
    this.refreshMachines(cx);
    cx.timer.every(2e4, (cx2) => this.refreshMachines(cx2));
  }
  refreshMachines(cx) {
    cx.spawn(async (cx2) => {
      try {
        const r = await hc(["machine", "ls", "--json"]);
        if (r.code === 0) {
          const list = parseJson(r.stdout, {}).machines ?? [];
          this.machineList = list.filter((m) => !m.temporary);
        }
      } catch {}
      cx2.notify();
    });
  }
  spacesFolded() {
    return shared(KEYS.spacesFolded) === true;
  }
  /** Gives each space a stable avatar color, shared with Herdr's own sidebar. */
  colors(list) {
    const stored = shared("space.colors") ?? {};
    const ids = new Set(list.map((s) => s.id));
    const kept = Object.fromEntries(Object.entries(stored).filter(([id]) => ids.has(id)));
    let changed = Object.keys(kept).length !== Object.keys(stored).length;
    for (const s of list) {
      if (kept[s.id]) continue;
      const uses = (c) => Object.values(kept).filter((v) => v === c).length;
      kept[s.id] = PALETTE.reduce((best, c) => (uses(c) < uses(best) ? c : best));
      changed = true;
    }
    if (changed) setShared("space.colors", kept);
    return kept;
  }
  /** Machines in Herdr's order: this computer, then the others by name. */
  groups(list) {
    const names = /* @__PURE__ */ new Set();
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
  autosize(rows, groups) {
    const node = findNode(layout(), NODES.spaces);
    const current = node?.size?.px;
    if (current === void 0) return;
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
    if (this.lastResize?.px === want && Date.now() - this.lastResize.at < 1e3) return;
    this.lastResize = { px: want, at: Date.now() };
    run("layout.resize", { id: NODES.spaces, px: want });
  }
  menu(space) {
    openOverlay({
      mod: "menu",
      kind: "popup",
      width: 200,
      height: 260,
      props: { tab: "space", target: { id: space.id } },
    });
  }
  row(t, s, color) {
    const on = s.active;
    const fill = color.startsWith("#") ? color : (MARK[color] ?? t[color] ?? t.accent);
    const sameMachine = (id) =>
      (spaces().find((x) => x.id === id)?.machine ?? null) === (s.machine ?? null);
    const dragging = this.pressed !== null && this.pressed !== s.id && this.over === s.id;
    const from = spaces().findIndex((x) => x.id === this.pressed);
    const index = spaces().findIndex((x) => x.id === s.id);
    const branch = s.branch && !["main", "master", s.name].includes(s.branch) ? s.branch : "";
    const hovered = this.hovered === s.id;
    return h_flex2()
      .id(`space-${s.id}`)
      .relative()
      .h(ROW)
      .flex_none()
      .px(8)
      .gap(9)
      .items_center()
      .rounded(8)
      .cursor_pointer()
      .when(on, (el) => el.bg(t.selected))
      .when(!on, (el) => el.hover((st) => st.bg(t.hover)))
      .when(this.pressed === s.id && this.over !== s.id, (el) => el.opacity(0.5))
      .when(dragging, (el) =>
        el.child(
          div2()
            .absolute()
            .left(0)
            .right(0)
            .h(2)
            .bg(t.accent)
            .when(from < index, (l) => l.bottom(0))
            .when(from > index, (l) => l.top(0)),
        ),
      )
      .on_hover((over, cx) => {
        if (over) this.hovered = s.id;
        else if (this.hovered === s.id) this.hovered = null;
        cx.notify();
      })
      .on_mouse_down("left", () => {
        this.pressed = s.id;
        this.over = s.id;
      })
      .on_mouse_move((_e, cx) => {
        const over = this.pressed !== null && sameMachine(this.pressed) ? s.id : null;
        if (this.pressed !== null && this.over !== over) {
          this.over = over;
          cx.notify();
        }
      })
      .on_mouse_up("left", (_e, cx) => {
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
        h_flex2()
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
        div2()
          .flex_shrink(0)
          .max_w(150)
          .truncate()
          .text_color(on ? t.foreground : t.muted)
          .child(s.name),
      )
      .child(
        div2()
          .flex_1()
          .min_w(0)
          .truncate()
          .text_size(11.5)
          .text_color(t.dim)
          .when(Boolean(branch), (el) => el.child(branch)),
      )
      .when(s.status === "working" || s.status === "blocked" || s.status === "done", (el) =>
        el.child(statusMark(s.status, true)),
      )
      .when(hovered, (el) =>
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
  machineHeader(t, machine, count) {
    const key = machine ?? "";
    const info = this.machineList.find((m) => m.name === machine);
    const layoutState = machines().find((m) => m.name === machine)?.layout;
    const connected = !machine || info?.state === "connected";
    const folded = this.folded.has(key);
    return h_flex2()
      .id(`machine-${machine ?? "local"}`)
      .h(GROUP)
      .flex_none()
      .px(8)
      .gap(7)
      .items_center()
      .text_size(11.5)
      .text_color(t.dim)
      .cursor_pointer()
      .hover((s) => s.text_color(t.muted))
      .on_click((_e, cx) => {
        if (folded) this.folded.delete(key);
        else this.folded.add(key);
        localStorage.setItem("machines.folded", JSON.stringify([...this.folded]));
        cx.notify();
      })
      .child(
        svg2(chromeIcon(folded ? "chevron-right" : "chevron-down"))
          .size(11)
          .flex_none(),
      )
      .child(
        svg2(chromeIcon(machine ? "server" : "monitor"))
          .size(12)
          .flex_none(),
      )
      .child(
        div2()
          .min_w(0)
          .truncate()
          .child(machine ?? "This computer"),
      )
      .child(div2().flex_none().child(String(count)))
      .child(div2().flex_1())
      .when(!connected, (el) =>
        el.child(
          div2()
            .flex_none()
            .child((info?.state ?? "offline").replace(/_/g, " ")),
        ),
      )
      .when(connected && layoutState === "loading", (el) =>
        el.child(div2().flex_none().child("loading…")),
      )
      .when(connected, (el) =>
        el.child(
          div2()
            .id(`machine-new-${machine ?? "local"}`)
            .flex_none()
            .px(4)
            .rounded(4)
            .hover((s) => s.bg(t.hover).text_color(t.foreground))
            .on_mouse_down("left", stopPress)
            .on_click((_e, cx) => {
              cx.stop_propagation();
              run("space.new", { machine: machine ?? "" });
            })
            .tooltip(`New space on ${machine ?? "this computer"}`)
            .child("+"),
        ),
      )
      .child(
        div2()
          .size(6)
          .rounded(3)
          .flex_none()
          .bg(connected ? t.ansi2 : t.dim),
      );
  }
  compact(t, list) {
    return v_flex2()
      .size_full()
      .bg(t.chrome)
      .pt(6)
      .text_size(12.5)
      .children(
        list.map((s, i) =>
          h_flex2()
            .id(`space-${s.id}`)
            .h(26)
            .flex_none()
            .justify_center()
            .items_center()
            .gap(4)
            .when(s.active, (el) => el.bg(t.selected))
            .hover((st) => st.bg(t.hover))
            .on_click(() => run("space.select", { id: s.id }))
            .child(
              div2()
                .text_color(s.active ? t.foreground : t.muted)
                .child(String(i + 1)),
            )
            .child(statusMark(s.status, true)),
        ),
      );
  }
  render() {
    const t = theme2();
    const all = spaces();
    const colors = this.colors(all);
    if (narrow()) return this.compact(t, all);
    const open = !this.spacesFolded();
    const query = this.search.value();
    const shown = all.filter((s) => matches(query, s.name, s.branch, s.machine ?? "this computer"));
    const groups = this.groups(shown);
    const grouped = groups.length > 1;
    const rows = [];
    let rowCount = 0;
    for (const g of groups) {
      if (grouped) rows.push(this.machineHeader(t, g.machine, g.spaces.length));
      if (grouped && this.folded.has(g.machine ?? "")) continue;
      for (const s of g.spaces) rows.push(this.row(t, s, colors[s.id] ?? "ansi6"));
      rowCount += g.spaces.length;
    }
    if (!shown.length) {
      rows.push(
        div2()
          .px(10)
          .py(6)
          .text_size(12)
          .text_color(t.dim)
          .child(query ? "No space matches." : "No spaces yet."),
      );
      rowCount += 1;
    }
    this.autosize(rowCount, grouped ? groups.length : 0);
    return v_flex2()
      .id("root")
      .size_full()
      .min_h(0)
      .bg(t.chrome)
      .text_size(13)
      .on_size_change((size, cx) => {
        if (Math.abs(size.height - this.height) >= 1) {
          this.height = size.height;
          cx.notify();
        }
      })
      .on_mouse_up("left", (_e, cx) => {
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
      .when(open, (el) =>
        el
          .child(
            h_flex2()
              .flex_none()
              .h(SEARCH)
              .px(10)
              .pb(8)
              .child(searchBox("space-search", this.search)),
          )
          .child(
            v_flex2()
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
};
export { Spaces as default };
