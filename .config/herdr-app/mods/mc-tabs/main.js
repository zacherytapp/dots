// Generated from src/mods/mc-tabs/main.ts and its imports by `pnpm build:herdr`. Edit the sources, not this file.
// .config/herdr-app/src/mods/mc-tabs/main.ts
import { div as div2, image as image2, svg as svg2, View } from "gpui-kit";
import { h_flex as h_flex2 } from "gpui-base";
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
  theme as theme2,
  window,
} from "herdr";

// .config/herdr-app/src/shared/sources.ts
var SOURCES = [
  { id: "files", label: "Files", short: "Files", icon: "mods/files/file.svg", own: false },
  {
    id: "changes",
    label: "Changes",
    short: "Changes",
    icon: "mods/changes/changes.svg",
    own: false,
  },
  { id: "issues", label: "GitHub issues", short: "Issues", icon: "issue", own: true },
  { id: "pulls", label: "Pull requests", short: "PRs", icon: "pull-request", own: true },
  {
    id: "branches",
    label: "Branches",
    short: "Branches",
    icon: "mods/workspace-chrome/git-branch.svg",
    own: false,
  },
  { id: "forgejo", label: "Forgejo issues", short: "Forgejo", icon: "forgejo", own: true },
  { id: "jira", label: "Jira", short: "Jira", icon: "jira", own: true },
  { id: "sessions", label: "Previous sessions", short: "Sessions", icon: "history", own: true },
];
var NODES = {
  sidebar: "sidebar",
  spaces: "mc-spaces",
  agents: "mc-agents",
  panel: "panel",
  body: "panel-body",
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
  const dir = `${appHome()}/mods/mc-tabs/icons`;
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
  return `mods/mc-tabs/icons/${name}.svg`;
}

// .config/herdr-app/src/shared/ui.ts
var chromeIcon = (name) => `mods/workspace-chrome/${name}.svg`;
var sourceIcon = (s) => (s.own ? asset(s.icon) : s.icon);
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
function cleanTitle(s) {
  return (s ?? "")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim();
}
function baseName(path) {
  const trimmed = (path ?? "").replace(/\/+$/, "");
  return trimmed.split("/").pop() || trimmed || "/";
}
function duration(ms) {
  const m = Math.floor(Math.max(0, ms) / 6e4);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 60 ? `${d}d` : `${Math.floor(d / 30)}mo`;
}
function parseJson(text, fallback) {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

// .config/herdr-app/src/mods/mc-tabs/label.ts
function leadPane(tab, all) {
  const mine = all.filter((p) => p.tab === tab.id);
  return mine.find((p) => p.program?.agent) ?? mine.find((p) => p.focused) ?? mine[0] ?? null;
}
var SHELL_TITLE = /^[\w.-]+@[\w.-]+[:\s]|^[~/]|^[A-Za-z]:\\/;
function tabLabel(tab, all, home2) {
  const lead = leadPane(tab, all);
  const program = lead?.program;
  const title = cleanTitle(lead?.title);
  const telling =
    title &&
    !SHELL_TITLE.test(title) &&
    ![program?.name, program?.key].some((v) => v && v.toLowerCase() === title.toLowerCase()) &&
    !/^(claude(?: code)?|zsh|bash|fish|sh)$/i.test(title);
  const name = tab.named ? tab.name : telling ? title : (program?.name ?? `Tab ${tab.index}`);
  const folder = lead?.cwd ? (lead.cwd === home2 ? "~" : baseName(lead.cwd)) : "";
  const branch = lead?.branch && !["main", "master"].includes(lead.branch) ? lead.branch : "";
  const detail = [folder, branch].filter(Boolean).join(" · ");
  const tooltip = [
    name,
    lead?.cwd ? lead.cwd.replace(home2, "~") : null,
    lead?.branch ? `branch ${lead.branch}` : null,
    program?.name && program.name !== name ? program.name : null,
    tab.panes > 1 ? `${tab.panes} panes` : null,
  ]
    .filter(Boolean)
    .join("\n");
  return { name, detail: detail === name ? "" : detail, tooltip, lead };
}

// .config/herdr-app/src/mods/mc-tabs/main.ts
var MARK = {
  ansi6: "#22a99a",
  ansi3: "#e3814f",
  ansi4: "#5b8def",
  ansi5: "#8b7cf6",
  ansi2: "#3fae6a",
  ansi1: "#d9649a",
};
var WINDOW_WIDTH = "mc.window.width";
function panel() {
  const root = layout();
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
function showSource(id) {
  run("layout.select", { stack: NODES.body, child: id });
  run("layout.show", { id: NODES.panel });
}
function toggleSource(id) {
  const p = panel();
  if (p.open && p.active === id) run("layout.hide", { id: NODES.panel });
  else showSource(id);
}
var Tabs = class extends View {
  init(_props, cx) {
    this.pressed = null;
    this.panels = parseJson(localStorage.getItem("panels"), {});
    this.space = void 0;
    this.pending = null;
    this.width = 0;
    this.normalWidth = Number(localStorage.getItem("normalWidth")) || 440;
    if (this.view() !== "topbar") return;
    cx.timer.every(6e4, (cx2) => cx2.notify());
    cx.spawn(async (cx2) => {
      for (;;) {
        const c = await nextCommand();
        const p = panel();
        if (c === "panel") {
          if (p.open) run("layout.hide", { id: NODES.panel });
          else showSource(p.active ?? p.available[0]?.id ?? "files");
        } else if (c === "expand") this.expand();
        else if (c.startsWith("source-")) toggleSource(c.slice(7));
        cx2.notify();
      }
    });
  }
  view() {
    return props()?.view === "navigation" ? "navigation" : "topbar";
  }
  /** Widens the panel to most of the window, or back to the width it had. */
  expand() {
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
  syncPanel(p) {
    const space = spaces().find((s) => s.active);
    if (!space || !p.node) return;
    const now = p.open ? p.active : null;
    if (space.id !== this.space) {
      const first = this.space === void 0;
      this.space = space.id;
      this.pending = null;
      if (!(first && !(space.id in this.panels))) {
        const stored = this.panels[space.id] ?? null;
        const want = p.available.some((s) => s.id === stored) ? stored : null;
        if (want !== now) {
          this.pending = { want, until: Date.now() + 1e3 };
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
  render() {
    return this.view() === "navigation" ? this.navigation(theme2()) : this.topbar(theme2());
  }
  // ---- topbar ---------------------------------------------------------------------------
  spaceChip(t, sidebarWidth) {
    const space = spaces().find((s) => s.active);
    const colors = shared("space.colors") ?? {};
    const color = space ? (colors[space.id] ?? "ansi6") : "ansi6";
    const fill = color.startsWith("#") ? color : (MARK[color] ?? t.accent);
    return h_flex2()
      .id("space-chip")
      .flex_none()
      .when(sidebarWidth > 0, (el) => el.w(sidebarWidth - 10))
      .h(30)
      .pr(10)
      .gap(8)
      .items_center()
      .on_mouse_down("left", stopPress)
      .on_click(() => run("mod.open", { name: "picker" }))
      .tooltip("Switch space")
      .when(Boolean(space), (el) =>
        el
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
              .child([...(space?.name ?? "?")][0]?.toUpperCase() ?? "?"),
          )
          .child(
            div2()
              .min_w(0)
              .truncate()
              .text_size(13)
              .font_semibold()
              .text_color(t.foreground)
              .child(space?.name ?? ""),
          )
          .when(Boolean(space?.machine), (e) =>
            e.child(
              h_flex2()
                .flex_none()
                .gap(4)
                .items_center()
                .text_size(11.5)
                .text_color(t.dim)
                .child(svg2(chromeIcon("server")).size(11))
                .child(space?.machine ?? ""),
            ),
          ),
      );
  }
  pill(t, tabIndex) {
    const space = spaces().find((s) => s.active);
    const tabs = space?.tabs ?? [];
    const tab = tabs[tabIndex];
    const label = tabLabel(tab, panes(), home());
    const program = label.lead?.program;
    const active = tab.active;
    const working = tab.status === "working" && tab.working_since;
    return h_flex2()
      .id(`tab-${tab.id}`)
      .h(30)
      .pl(8)
      .pr(active ? 6 : 10)
      .gap(7)
      .items_center()
      .flex_none()
      .rounded(7)
      .text_size(12.8)
      .border(1)
      .border_color(active ? t.border : alpha(t.chrome, "00"))
      .bg(active ? t.raised : t.chrome)
      .text_color(active ? t.foreground : t.muted)
      .hover((s) => s.bg(active ? t.raised : t.hover))
      .tooltip(label.tooltip)
      .on_mouse_down("left", (e, cx) => {
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
      .on_mouse_down("right", (_e, cx) => {
        cx.stop_propagation();
        openOverlay({
          mod: "menu",
          kind: "popup",
          width: 200,
          props: { tab: "tab", target: { id: tab.id, space: space?.id } },
        });
      })
      .child(div2().flex_none().text_size(10.5).text_color(t.dim).child(String(tab.index)))
      .when(Boolean(program?.icon), (el) =>
        el.child(
          program?.tint
            ? svg2(program.icon)
                .size(14)
                .flex_none()
                .text_color(active ? t.foreground : t.muted)
            : image2(program?.icon).size(14).flex_none(),
        ),
      )
      .child(div2().max_w(220).truncate().child(label.name))
      .when(Boolean(label.detail), (el) =>
        el.child(
          div2().max_w(140).truncate().text_size(11.5).text_color(t.dim).child(label.detail),
        ),
      )
      .when(tab.panes > 1, (el) =>
        el.child(
          div2()
            .flex_none()
            .px(4)
            .h(16)
            .flex()
            .items_center()
            .rounded(4)
            .border(1)
            .border_color(t.border)
            .text_size(10.5)
            .text_color(t.dim)
            .child(String(tab.panes)),
        ),
      )
      .when(tab.zoomed, (el) =>
        el.child(div2().flex_none().text_size(10.5).font_bold().text_color(t.accent).child("Z")),
      )
      .when(Boolean(working), (el) =>
        el.child(statusMark("working")).child(
          div2()
            .flex_none()
            .text_size(11)
            .text_color(t.dim)
            .child(duration(Date.now() - tab.working_since)),
        ),
      )
      .when(tab.status === "blocked" || tab.status === "done", (el) =>
        el.child(statusMark(tab.status, true)),
      )
      .when(active, (el) =>
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
  sourceButtons(t, p) {
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
  topbar(t) {
    const space = spaces().find((s) => s.active);
    const tabs = space?.tabs ?? [];
    const p = panel();
    this.syncPanel(p);
    const sidebar = findNode(layout(), NODES.sidebar);
    const sidebarWidth = sidebar && !sidebar.hidden ? (sidebar.size?.px ?? 0) : 0;
    const w = window();
    const button = (id, label, action) =>
      div2()
        .id(id)
        .size(26)
        .flex_none()
        .flex()
        .items_center()
        .justify_center()
        .rounded(6)
        .text_color(t.dim)
        .hover((s) => s.bg(t.hover).text_color(t.foreground))
        .on_mouse_down("left", stopPress)
        .on_click(action)
        .child(label);
    return h_flex2()
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
      .on_size_change((size) => {
        const width = Math.round(size.width);
        if (shared(WINDOW_WIDTH) !== width) setShared(WINDOW_WIDTH, width);
      })
      .on_mouse_up("left", () => {
        this.pressed = null;
      })
      .on_scroll_wheel((e) => {
        if (Math.abs(e.delta.y) >= 1) run(e.delta.y > 0 ? "tab.prev" : "tab.next");
      })
      .child(this.spaceChip(t, sidebarWidth))
      .child(
        h_flex2()
          .id("tab-scroll")
          .flex_1()
          .min_w(0)
          .h_full()
          .items_center()
          .gap(3)
          .overflow_x_scrollbar()
          .children(tabs.map((_tab, i) => this.pill(t, i))),
      )
      .child(
        iconButton("tab-new", chromeIcon("plus"), "New tab", () =>
          openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 }),
        ),
      )
      .child(div2().w(1).h(18).mx(4).bg(t.border))
      .children(this.sourceButtons(t, p))
      .when(Boolean(w?.buttons), (el) =>
        el
          .child(div2().w(1).h(18).mx(4).bg(t.border))
          .child(button("minimize", "−", () => run("window.minimize")))
          .child(button("maximize", "□", () => run("window.maximize")))
          .child(button("close-window", svg2(asset("close")).size(13), () => run("window.close"))),
      );
  }
  // ---- navigation strip -----------------------------------------------------------------
  navigation(t) {
    const p = panel();
    const windowWidth = Number(shared(WINDOW_WIDTH)) || 1600;
    const wide = (p.node?.size?.px ?? 0) >= Math.round(windowWidth * 0.62) - 4;
    const need = (labels) => labels.reduce((n, l) => n + l.length * 7 + 34, 0) + 80;
    const mode =
      this.width >= need(p.available.map((s) => s.label))
        ? "label"
        : this.width >= need(p.available.map((s) => s.short))
          ? "short"
          : "icon";
    return h_flex2()
      .id("root")
      .size_full()
      .min_w(0)
      .px(8)
      .gap(2)
      .items_center()
      .bg(t.chrome)
      .border_b(1)
      .border_color(t.border)
      .on_size_change((size, cx) => {
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
          return h_flex2()
            .id(`nav-${s.id}`)
            .h(26)
            .px(8)
            .gap(6)
            .flex_none()
            .items_center()
            .rounded(6)
            .text_size(12.5)
            .cursor_pointer()
            .when(on, (el) => el.bg(t.selected).text_color(t.foreground))
            .when(!on, (el) =>
              el.text_color(t.muted).hover((st) => st.bg(t.hover).text_color(t.foreground)),
            )
            .on_click(() => showSource(s.id))
            .tooltip(s.label)
            .child(svg2(sourceIcon(s)).size(14).flex_none())
            .when(Boolean(text), (el) => el.child(text));
        }),
      )
      .child(div2().flex_1())
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
};
export { Tabs as default };
