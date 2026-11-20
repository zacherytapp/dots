// Generated from src/mods/sessionizer/main.ts and its imports by `pnpm build:herdr`. Edit the sources, not this file.
// .config/herdr-app/src/mods/sessionizer/main.ts
import { div as div2, svg as svg2, View } from "gpui-kit";
import { h_flex as h_flex2, v_flex as v_flex2 } from "gpui-base";
import {
  appHome as appHome2,
  closeOverlay,
  exec as exec2,
  home,
  notify,
  props,
  spaces,
  theme as theme2,
} from "herdr";

// .config/herdr-app/src/shared/ui.ts
import { div, image, svg } from "gpui-kit";
import { h_flex, v_flex, Input } from "gpui-base";
import { theme } from "herdr";

// .config/herdr-app/src/shared/icons.ts
import { appHome, exec, readTextFile, writeTextFile } from "herdr";

// .config/herdr-app/src/shared/ui.ts
var chromeIcon = (name) => `mods/workspace-chrome/${name}.svg`;
var stopPress = (_e, cx) => cx.stop_propagation();

// .config/herdr-app/src/mods/sessionizer/fuzzy.ts
var BOUNDARY = /* @__PURE__ */ new Set(["/", ".", "_", "-", " ", "~"]);
function matchTerm(text, term, baseStart) {
  const hay = /[A-Z]/.test(term) ? text : text.toLowerCase();
  let best = null;
  for (let start = hay.indexOf(term[0]); start !== -1; start = hay.indexOf(term[0], start + 1)) {
    const positions = [];
    let score = 0;
    let at = start;
    for (const ch of term) {
      const i = hay.indexOf(ch, at);
      if (i === -1) return best;
      const prev = positions.at(-1);
      score += 1;
      if (prev !== void 0 && i === prev + 1) score += 4;
      if (i === 0 || BOUNDARY.has(text[i - 1])) score += 3;
      if (i >= baseStart) score += 2;
      positions.push(i);
      at = i + 1;
    }
    score -= (positions.at(-1) - positions[0] + 1 - term.length) * 0.2;
    if (!best || score > best.score) best = { score, positions };
  }
  return best;
}
function fuzzyMatch(text, query) {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return { text, score: 0, positions: [] };
  const baseStart = text.lastIndexOf("/") + 1;
  const all = /* @__PURE__ */ new Set();
  let score = 0;
  for (const term of terms) {
    const m = matchTerm(text, term, baseStart);
    if (!m) return null;
    score += m.score;
    for (const p of m.positions) all.add(p);
  }
  return { text, score, positions: [...all].sort((a, b) => a - b) };
}
function fuzzyFilter(items, query) {
  const out = [];
  for (const text of items) {
    const m = fuzzyMatch(text, query);
    if (m) out.push(m);
  }
  if (!query.trim()) return out;
  return out.sort((a, b) => b.score - a.score || a.text.length - b.text.length);
}
function segments(text, positions) {
  const hits = new Set(positions);
  const out = [];
  for (let i = 0; i < text.length; i++) {
    const hit = hits.has(i);
    const last = out.at(-1);
    if (last && last.hit === hit) last.text += text[i];
    else out.push({ text: text[i], hit });
  }
  return out;
}

// .config/herdr-app/src/mods/sessionizer/model.ts
function parseRow(line) {
  const s = line.trim();
  if (!s) return null;
  if (s.startsWith("⇄ ")) return { kind: "machine", machine: s.slice(2).trim() };
  if (s.startsWith("+ ")) return { kind: "host", host: s.slice(2).trim() };
  return { kind: "dir", path: s };
}
function rowText(row) {
  if (row.kind === "dir") return row.path;
  if (row.kind === "machine") return row.machine;
  return row.host;
}
function spaceNameFor(path, home2, dots = `${home2}/Projects/dots`) {
  const abs = path.replace(/^~(?=\/|$)/, home2).replace(/\/+$/, "");
  const name = abs.slice(abs.lastIndexOf("/") + 1).replaceAll(".", "_");
  return abs.startsWith(`${dots}/`) ? `dots_${name}` : name;
}
var MOVES = {
  down: 1,
  "ctrl-n": 1,
  "ctrl-j": 1,
  tab: 1,
  up: -1,
  "ctrl-p": -1,
  "ctrl-k": -1,
  "shift-tab": -1,
  pagedown: 10,
  pageup: -10,
};
function keyAction(query, k) {
  const stroke = k.keystroke;
  if (stroke in MOVES) return { type: "move", by: MOVES[stroke] };
  if (stroke === "enter" || stroke === "ctrl-m") return { type: "submit" };
  if (stroke === "escape" || stroke === "ctrl-c" || stroke === "ctrl-g") return { type: "close" };
  if (stroke === "backspace" || stroke === "ctrl-h") {
    return query ? { type: "edit", query: query.slice(0, -1) } : { type: "back" };
  }
  if (stroke === "ctrl-backspace" || stroke === "ctrl-w" || stroke === "alt-backspace") {
    return { type: "edit", query: query.replace(/[^\s/._-]*[\s/._-]*$/, "") };
  }
  if (stroke === "ctrl-u") return { type: "edit", query: "" };
  const m = k.modifiers ?? {};
  if (k.key_char && !m.control && !m.alt && !m.platform && k.key_char >= " ") {
    return { type: "edit", query: query + k.key_char };
  }
  return null;
}

// .config/herdr-app/src/mods/sessionizer/main.ts
var ROW_H = 30;
var MAX_ROWS = 40;
function script(args, timeout = 3e4) {
  return exec2(`${appHome2()}/scripts/sessionizer.sh`, args, { cwd: home(), timeout });
}
function lines(stdout) {
  return stdout
    .split("\n")
    .map(parseRow)
    .filter((r) => r !== null);
}
function closeSelf() {
  const overlay = props()?.overlay;
  if (overlay) closeOverlay(overlay);
}
var Sessionizer = class extends View {
  init(_props, cx) {
    this.query = "";
    this.stage = { kind: "local" };
    this.dirs = [];
    this.machines = [];
    this.remote = [];
    this.loadingDirs = true;
    this.loadingMachines = true;
    this.loadingRemote = false;
    this.busy = null;
    this.error = null;
    this.selected = 0;
    this.offset = 0;
    this.visible = 12;
    this.hits = [];
    this.hitsKey = "";
    this.focus = cx.focus_handle();
    this.focus.focus();
    cx.timer.after(0, () => this.focus.focus());
    cx.timer.after(60, () => this.focus.focus());
    cx.spawn(async (cx2) => {
      try {
        const r = await script(["--list-dirs"]);
        this.dirs = lines(r.stdout);
        if (r.code !== 0 && !this.dirs.length) this.error = r.stderr.trim() || `exit ${r.code}`;
      } catch (e) {
        this.error = String(e?.message ?? e);
      }
      this.loadingDirs = false;
      this.focus.focus();
      cx2.notify();
    });
    cx.spawn(async (cx2) => {
      try {
        this.machines = lines((await script(["--list-machines"], 6e4)).stdout);
      } catch {
        this.machines = [];
      }
      this.loadingMachines = false;
      cx2.notify();
    });
  }
  rows() {
    return this.stage.kind === "remote" ? this.remote : [...this.dirs, ...this.machines];
  }
  /** The matches for the prompt, recomputed only when the prompt or the candidates change. */
  currentHits() {
    const rows = this.rows();
    const key = `${this.stage.kind}:${this.query}:${rows.length}`;
    if (key !== this.hitsKey) {
      const byText = new Map(rows.map((r) => [rowText(r), r]));
      this.hits = fuzzyFilter([...byText.keys()], this.query).map((match) => ({
        row: byText.get(match.text),
        match,
      }));
      this.hitsKey = key;
      this.selected = 0;
      this.offset = 0;
    }
    return this.hits;
  }
  move(by) {
    const n = this.currentHits().length;
    if (!n) return;
    const next = this.selected + by;
    this.selected = Math.abs(by) === 1 ? (next + n) % n : Math.max(0, Math.min(n - 1, next));
    this.reveal();
  }
  /** Scrolls the window so the highlighted row is in it. */
  reveal() {
    const shown = Math.min(this.visible, MAX_ROWS);
    if (this.selected < this.offset) this.offset = this.selected;
    else if (this.selected >= this.offset + shown) this.offset = this.selected - shown + 1;
  }
  scroll(by) {
    const shown = Math.min(this.visible, MAX_ROWS);
    const max = Math.max(0, this.currentHits().length - shown);
    this.offset = Math.max(0, Math.min(max, this.offset + by));
    this.selected = Math.max(this.offset, Math.min(this.offset + shown - 1, this.selected));
  }
  onKey(e, cx) {
    if (this.busy) return;
    const action = keyAction(this.query, e);
    if (!action) return;
    cx.stop_propagation();
    if (action.type === "move") this.move(action.by);
    else if (action.type === "edit") this.query = action.query;
    else if (action.type === "close") closeSelf();
    else if (action.type === "back") this.back();
    else if (action.type === "submit") {
      const hit = this.currentHits()[this.selected];
      if (hit) this.choose(hit.row, cx);
    }
    cx.notify();
  }
  back() {
    if (this.stage.kind !== "remote") return;
    this.stage = { kind: "local" };
    this.remote = [];
    this.error = null;
  }
  /** Runs a script step with a status line, closing the dialog when it worked. */
  act(cx, label, args, after) {
    this.busy = label;
    this.error = null;
    cx.notify();
    cx.spawn(async (cx2) => {
      try {
        const r = await script(args, 6e4);
        if (r.code !== 0) throw new Error(r.stderr.trim() || r.stdout.trim() || `exit ${r.code}`);
        if (after) after(r.stdout);
        else closeSelf();
      } catch (e) {
        notify({
          title: "sessionizer",
          body: String(e?.message ?? e).slice(0, 300),
          level: "error",
        });
        this.error = String(e?.message ?? e).split("\n")[0];
      }
      this.busy = null;
      this.focus.focus();
      cx2.notify();
    });
  }
  choose(row, cx) {
    if (row.kind === "dir") {
      if (this.stage.kind === "remote") {
        this.act(cx, `Opening ${row.path} on ${this.stage.machine}…`, [
          "--open-remote",
          this.stage.machine,
          row.path,
        ]);
      } else {
        this.act(cx, `Opening ${row.path}…`, [row.path]);
      }
      return;
    }
    if (row.kind === "host") {
      this.act(cx, `Adding ${row.host}…`, ["--add-machine", row.host], () =>
        this.openMachine(row.host, cx),
      );
      return;
    }
    this.openMachine(row.machine, cx);
  }
  /** Switches the dialog to one machine's folders. */
  openMachine(machine, cx) {
    this.stage = { kind: "remote", machine };
    this.query = "";
    this.remote = [];
    this.loadingRemote = true;
    this.error = null;
    cx.notify();
    cx.spawn(async (cx2) => {
      try {
        const r = await script(["--list-remote", machine]);
        if (this.stage.kind === "remote" && this.stage.machine === machine) {
          this.remote = lines(r.stdout);
          if (!this.remote.length) this.error = `Couldn't list folders on ${machine}.`;
        }
      } catch (e) {
        this.error = String(e?.message ?? e);
      }
      this.loadingRemote = false;
      this.focus.focus();
      cx2.notify();
    });
  }
  prompt(t) {
    const remote = this.stage.kind === "remote" ? this.stage.machine : null;
    const placeholder = remote
      ? `Find a folder on ${remote}`
      : "Find a project, dotfile or machine";
    return h_flex2()
      .h(44)
      .px(14)
      .gap(10)
      .flex_none()
      .items_center()
      .border_b(1)
      .border_color(t.border)
      .child(svg2(chromeIcon("search")).size(15).flex_none().text_color(t.dim))
      .when(Boolean(remote), (el) =>
        el.child(
          h_flex2()
            .id("stage-back")
            .h(24)
            .px(8)
            .gap(5)
            .flex_none()
            .items_center()
            .rounded(6)
            .bg(t.selected)
            .text_size(12)
            .text_color(t.accent)
            .cursor_pointer()
            .tooltip("Back to this computer (backspace)")
            .on_mouse_down("left", stopPress)
            .on_click((_e, cx) => {
              this.back();
              this.focus.focus();
              cx.notify();
            })
            .child(svg2(chromeIcon("server")).size(12))
            .child(remote),
        ),
      )
      .child(
        h_flex2()
          .flex_1()
          .min_w(0)
          .items_center()
          .text_size(15)
          .when(Boolean(this.query), (el) =>
            el.child(div2().text_color(t.foreground).child(this.query)),
          )
          .child(div2().w(2).h(18).flex_none().bg(t.accent))
          .when(!this.query, (el) => el.child(div2().pl(2).text_color(t.dim).child(placeholder))),
      )
      .child(this.counter(t));
  }
  counter(t) {
    const loading =
      this.stage.kind === "remote" ? this.loadingRemote : this.loadingDirs || this.loadingMachines;
    const hits = this.currentHits().length;
    const total = this.rows().length;
    return h_flex2()
      .gap(6)
      .flex_none()
      .items_center()
      .text_size(11.5)
      .text_color(t.dim)
      .when(loading, (el) =>
        el.child(svg2(chromeIcon("spinner")).size(12).text_color(t.muted).spin(900)),
      )
      .child(`${hits}/${total}`);
  }
  row(t, hit, index, open) {
    const on = index === this.selected;
    const { row, match } = hit;
    const text = match.text;
    const base = row.kind === "dir" ? text.lastIndexOf("/") + 1 : 0;
    const runs = [];
    let at = 0;
    for (const seg of segments(text, match.positions)) {
      const parts =
        at < base && at + seg.text.length > base
          ? [seg.text.slice(0, base - at), seg.text.slice(base - at)]
          : [seg.text];
      for (const part of parts) {
        const color = seg.hit ? t.accent : at < base ? t.muted : t.foreground;
        runs.push(
          div2()
            .flex_none()
            .text_color(color)
            .when(seg.hit, (el) => el.font_weight(700))
            .child(part),
        );
        at += part.length;
      }
    }
    const tag =
      row.kind === "machine"
        ? "machine"
        : row.kind === "host"
          ? "add machine"
          : open.has(text)
            ? "open"
            : null;
    const icon =
      row.kind === "machine"
        ? chromeIcon("server")
        : row.kind === "host"
          ? chromeIcon("plus")
          : null;
    return h_flex2()
      .id(`row-${index}`)
      .h(ROW_H)
      .px(10)
      .mx(6)
      .gap(8)
      .flex_none()
      .items_center()
      .rounded(6)
      .text_size(13)
      .cursor_pointer()
      .overflow_hidden()
      .when(on, (el) => el.bg(t.selected))
      .when(!on, (el) => el.hover((s) => s.bg(t.hover)))
      .on_mouse_down("left", stopPress)
      .on_click((_e, cx) => {
        this.selected = index;
        this.choose(row, cx);
      })
      .child(
        div2()
          .w(3)
          .h(16)
          .flex_none()
          .rounded(2)
          .when(on, (el) => el.bg(t.accent)),
      )
      .when(Boolean(icon), (el) => el.child(svg2(icon).size(13).flex_none().text_color(t.muted)))
      .child(h_flex2().flex_1().min_w(0).overflow_hidden().children(runs))
      .when(Boolean(tag), (el) =>
        el.child(
          div2()
            .px(6)
            .py(1)
            .flex_none()
            .rounded(4)
            .text_size(10.5)
            .text_color(tag === "open" ? t.done : t.dim)
            .border(1)
            .border_color(t.border)
            .child(tag),
        ),
      );
  }
  /** Folders whose space is already open on this computer (so Enter will focus it). */
  openFolders() {
    if (this.stage.kind === "remote") {
      const machine = this.stage.machine;
      const names2 = new Set(
        spaces()
          .filter((s) => s.machine === machine)
          .map((s) => s.name),
      );
      return new Set(
        this.remote
          .map(rowText)
          .filter((p) => names2.has(p.slice(p.lastIndexOf("/") + 1).replaceAll(".", "_"))),
      );
    }
    const names = new Set(
      spaces()
        .filter((s) => !s.machine)
        .map((s) => s.name),
    );
    const h = home();
    return new Set(this.dirs.map(rowText).filter((p) => names.has(spaceNameFor(p, h))));
  }
  list(t) {
    const hits = this.currentHits();
    const shown = Math.min(this.visible, MAX_ROWS);
    const open = this.openFolders();
    const window = hits.slice(this.offset, this.offset + shown);
    const loading =
      this.stage.kind === "remote" ? this.loadingRemote : this.loadingDirs && !hits.length;
    return v_flex2()
      .id("sessionizer-list")
      .flex_1()
      .min_h(0)
      .py(6)
      .gap(1)
      .overflow_hidden()
      .on_size_change((size) => {
        const fits = Math.max(1, Math.floor((size.height - 12) / (ROW_H + 1)));
        if (fits !== this.visible) {
          this.visible = fits;
          this.reveal();
        }
      })
      .on_scroll_wheel((e, cx) => {
        if (Math.abs(e.delta.y) < 1) return;
        this.scroll(e.delta.y > 0 ? -3 : 3);
        cx.notify();
      })
      .children(window.map((hit, i) => this.row(t, hit, this.offset + i, open)))
      .when(!hits.length, (el) =>
        el.child(
          div2()
            .px(18)
            .py(10)
            .text_size(12.5)
            .text_color(t.dim)
            .child(loading ? "Loading…" : this.query ? "No matches" : "Nothing to show"),
        ),
      );
  }
  footer(t) {
    const hint = (keys, what) =>
      h_flex2()
        .gap(5)
        .items_center()
        .child(div2().px(5).rounded(4).bg(t.raised).text_color(t.muted).child(keys))
        .child(what);
    const status = this.busy ?? this.error;
    return h_flex2()
      .h(30)
      .px(14)
      .gap(14)
      .flex_none()
      .items_center()
      .border_t(1)
      .border_color(t.border)
      .text_size(11)
      .text_color(t.dim)
      .when(Boolean(status), (el) =>
        el.child(
          div2()
            .flex_1()
            .min_w(0)
            .overflow_hidden()
            .text_color(this.error && !this.busy ? t.blocked : t.muted)
            .child(status),
        ),
      )
      .when(!status, (el) =>
        el
          .child(hint("↑↓", "move"))
          .child(hint("enter", "open"))
          .when(this.stage.kind === "remote", (el2) => el2.child(hint("⌫", "back")))
          .child(hint("esc", "close")),
      );
  }
  render() {
    const t = theme2();
    return v_flex2()
      .id("sessionizer")
      .size_full()
      .bg(t.popover)
      .text_color(t.foreground)
      .track_focus(this.focus)
      .on_key_down((e, cx) => this.onKey(e, cx))
      .on_mouse_down("left", () => this.focus.focus())
      .child(this.prompt(t))
      .child(this.list(t))
      .child(this.footer(t));
  }
};
export { Sessionizer as default };
