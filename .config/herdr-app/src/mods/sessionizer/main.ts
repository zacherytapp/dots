// ctrl-space f: the project sessionizer as a command palette. A dialog with the prompt already
// focused, fuzzy-filtering every project and dotfile folder (sessionizer.sh --list-dirs) and the
// saved / reachable machines (--list-machines). Enter opens (or focuses) the folder's space; a
// machine row lists that machine's folders in the same dialog, and backspace on an empty prompt
// goes back. The folder lists and opening stay in sessionizer-lib.sh, shared with herdr's fzf
// picker.
//
// The prompt is drawn here on the dialog's own focus handle rather than with gpui-base's Input,
// so ↑/↓ (which the input keeps for itself) reach the list. Keys: ↑/↓, ctrl-n/p, ctrl-j/k, tab
// to move; enter to open; ctrl-w / ctrl-u to delete a word / everything; esc to close.

import { div, View, type Cx, type El, type FocusHandle } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { appHome, closeOverlay, exec, home, notify, props, spaces, theme } from "herdr";
import {
  badge,
  ICON,
  icon,
  kbd,
  MONO,
  RADIUS,
  spinner,
  stopPress,
  TEXT,
  type IconName,
  type Theme,
} from "../../shared/ui.ts";
import { fuzzyFilter, segments, type Match } from "./fuzzy.ts";
import { keyAction, parseRow, rowText, spaceNameFor, type Key, type Row } from "./model.ts";

const ROW_H = 32;
const ROW_GAP = 1;
const LIST_PAD = 4;
/** Most rows drawn at once; the list scrolls through the matches in a window this big. */
const MAX_ROWS = 40;

type Stage = { kind: "local" } | { kind: "remote"; machine: string };

interface Hit {
  row: Row;
  match: Match;
}

function script(args: string[], timeout = 30000) {
  return exec(`${appHome()}/scripts/sessionizer.sh`, args, { cwd: home(), timeout });
}

function lines(stdout: string): Row[] {
  return stdout
    .split("\n")
    .map(parseRow)
    .filter((r): r is Row => r !== null);
}

function closeSelf(): void {
  const overlay = (props() as { overlay?: string } | null)?.overlay;
  if (overlay) closeOverlay(overlay);
}

export default class Sessionizer extends View {
  declare focus: FocusHandle;
  declare query: string;
  declare stage: Stage;
  declare dirs: Row[];
  declare machines: Row[];
  declare remote: Row[];
  declare loadingDirs: boolean;
  declare loadingMachines: boolean;
  declare loadingRemote: boolean;
  declare busy: string | null;
  declare error: string | null;
  declare selected: number;
  declare offset: number;
  declare visible: number;
  declare hits: Hit[];
  declare hitsKey: string;

  init(_props: unknown, cx: Cx): void {
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
    // The dialog frame takes the keyboard while it mounts, so take it back once it has.
    this.focus.focus();
    cx.timer.after(0, () => this.focus.focus());
    cx.timer.after(60, () => this.focus.focus());

    cx.spawn(async (cx) => {
      try {
        const r = await script(["--list-dirs"]);
        this.dirs = lines(r.stdout);
        if (r.code !== 0 && !this.dirs.length) this.error = r.stderr.trim() || `exit ${r.code}`;
      } catch (e) {
        this.error = String((e as Error)?.message ?? e);
      }
      this.loadingDirs = false;
      this.focus.focus();
      cx.notify();
    });
    // Probing the tailnet takes a few seconds the first time (then it's cached), so machines
    // arrive after the folders and join the list.
    cx.spawn(async (cx) => {
      try {
        this.machines = lines((await script(["--list-machines"], 60000)).stdout);
      } catch {
        this.machines = [];
      }
      this.loadingMachines = false;
      cx.notify();
    });
  }

  rows(): Row[] {
    return this.stage.kind === "remote" ? this.remote : [...this.dirs, ...this.machines];
  }

  /** The matches for the prompt, recomputed only when the prompt or the candidates change. */
  currentHits(): Hit[] {
    const rows = this.rows();
    const key = `${this.stage.kind}:${this.query}:${rows.length}`;
    if (key !== this.hitsKey) {
      const byText = new Map(rows.map((r) => [rowText(r), r]));
      this.hits = fuzzyFilter([...byText.keys()], this.query).map((match) => ({
        row: byText.get(match.text) as Row,
        match,
      }));
      this.hitsKey = key;
      this.selected = 0;
      this.offset = 0;
    }
    return this.hits;
  }

  move(by: number): void {
    const n = this.currentHits().length;
    if (!n) return;
    const next = this.selected + by;
    // Single steps wrap around like fzf's; page jumps stop at the ends.
    this.selected = Math.abs(by) === 1 ? (next + n) % n : Math.max(0, Math.min(n - 1, next));
    this.reveal();
  }

  /** Scrolls the window so the highlighted row is in it. */
  reveal(): void {
    const shown = Math.min(this.visible, MAX_ROWS);
    if (this.selected < this.offset) this.offset = this.selected;
    else if (this.selected >= this.offset + shown) this.offset = this.selected - shown + 1;
  }

  scroll(by: number): void {
    const shown = Math.min(this.visible, MAX_ROWS);
    const max = Math.max(0, this.currentHits().length - shown);
    this.offset = Math.max(0, Math.min(max, this.offset + by));
    this.selected = Math.max(this.offset, Math.min(this.offset + shown - 1, this.selected));
  }

  onKey(e: Key, cx: Cx): void {
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

  back(): void {
    if (this.stage.kind !== "remote") return;
    this.stage = { kind: "local" };
    this.remote = [];
    this.error = null;
  }

  /** Runs a script step with a status line, closing the dialog when it worked. */
  act(cx: Cx, label: string, args: string[], after?: (stdout: string) => void): void {
    this.busy = label;
    this.error = null;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        const r = await script(args, 60000);
        if (r.code !== 0) throw new Error(r.stderr.trim() || r.stdout.trim() || `exit ${r.code}`);
        if (after) after(r.stdout);
        else closeSelf();
      } catch (e) {
        notify({
          title: "sessionizer",
          body: String((e as Error)?.message ?? e).slice(0, 300),
          level: "error",
        });
        this.error = String((e as Error)?.message ?? e).split("\n")[0];
      }
      this.busy = null;
      this.focus.focus();
      cx.notify();
    });
  }

  choose(row: Row, cx: Cx): void {
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
  openMachine(machine: string, cx: Cx): void {
    this.stage = { kind: "remote", machine };
    this.query = "";
    this.remote = [];
    this.loadingRemote = true;
    this.error = null;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        const r = await script(["--list-remote", machine]);
        if (this.stage.kind === "remote" && this.stage.machine === machine) {
          this.remote = lines(r.stdout);
          if (!this.remote.length) this.error = `Couldn't list folders on ${machine}.`;
        }
      } catch (e) {
        this.error = String((e as Error)?.message ?? e);
      }
      this.loadingRemote = false;
      this.focus.focus();
      cx.notify();
    });
  }

  prompt(t: Theme): El {
    const remote = this.stage.kind === "remote" ? this.stage.machine : null;
    const placeholder = remote
      ? `Find a folder on ${remote}`
      : "Find a project, dotfile or machine";
    return h_flex()
      .h(48)
      .px(12)
      .gap(8)
      .flex_none()
      .items_center()
      .border_b(1)
      .border_color(t.border)
      .child(icon("search", ICON.md, t.muted))
      .when(Boolean(remote), (el: El) =>
        el.child(
          badge(remote as string, {
            id: "stage-back",
            variant: "secondary",
            icon: "server",
            tooltip: "Back to this computer (backspace)",
            onClick: (_e: unknown, cx: Cx) => {
              this.back();
              this.focus.focus();
              cx.notify();
            },
          }),
        ),
      )
      .child(
        h_flex()
          .flex_1()
          .min_w(0)
          .items_center()
          .text_size(TEXT.md)
          .when(Boolean(this.query), (el: El) =>
            el.child(div().text_color(t.foreground).child(this.query)),
          )
          // The caret, then the placeholder after it while the prompt is empty.
          .child(div().w(1.5).h(18).flex_none().bg(t.foreground))
          .when(!this.query, (el: El) =>
            el.child(div().pl(2).text_color(t.muted).child(placeholder)),
          ),
      )
      .child(this.counter(t));
  }

  counter(t: Theme): El {
    const loading =
      this.stage.kind === "remote" ? this.loadingRemote : this.loadingDirs || this.loadingMachines;
    const hits = this.currentHits().length;
    const total = this.rows().length;
    return h_flex()
      .gap(6)
      .flex_none()
      .items_center()
      .text_size(TEXT.xs)
      .text_color(t.muted)
      .when(loading, (el: El) => el.child(spinner(ICON.xs, t.muted)))
      .child(div().font_family(MONO).child(`${hits}/${total}`));
  }

  row(t: Theme, hit: Hit, index: number, open: Set<string>): El {
    const on = index === this.selected;
    const { row, match } = hit;
    const text = match.text;
    // Dim the parent folders so the folder's own name stands out; matched letters in medium weight.
    const base = row.kind === "dir" ? text.lastIndexOf("/") + 1 : 0;
    const runs: El[] = [];
    let at = 0;
    for (const seg of segments(text, match.positions)) {
      const parts =
        at < base && at + seg.text.length > base
          ? [seg.text.slice(0, base - at), seg.text.slice(base - at)]
          : [seg.text];
      for (const part of parts) {
        const color = seg.hit || at >= base ? t.foreground : t.muted;
        runs.push(
          div()
            .flex_none()
            .text_color(color)
            .when(seg.hit, (el: El) => el.font_medium())
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
    const glyph: IconName =
      row.kind === "machine" ? "server" : row.kind === "host" ? "plus" : "folder";
    return h_flex()
      .id(`row-${index}`)
      .h(ROW_H)
      .px(8)
      .gap(8)
      .flex_none()
      .items_center()
      .rounded(RADIUS.sm)
      .text_size(TEXT.sm)
      .cursor_pointer()
      .overflow_hidden()
      .when(on, (el: El) => el.bg(t.selected))
      .when(!on, (el: El) => el.hover((s: El) => s.bg(t.hover)))
      .on_mouse_down("left", stopPress)
      .on_click((_e: unknown, cx: Cx) => {
        this.selected = index;
        this.choose(row, cx);
      })
      .child(icon(glyph, ICON.md, t.muted))
      .child(h_flex().flex_1().min_w(0).overflow_hidden().children(runs))
      .when(Boolean(tag), (el: El) =>
        el.child(
          badge(tag as string, {
            variant: tag === "open" ? "secondary" : "outline",
            tone: tag === "open" ? t.done : undefined,
          }),
        ),
      );
  }

  /** Folders whose space is already open on this computer (so Enter will focus it). */
  openFolders(): Set<string> {
    if (this.stage.kind === "remote") {
      const machine = this.stage.machine;
      const names = new Set(
        spaces()
          .filter((s) => s.machine === machine)
          .map((s) => s.name),
      );
      return new Set(
        this.remote
          .map(rowText)
          .filter((p) => names.has(p.slice(p.lastIndexOf("/") + 1).replaceAll(".", "_"))),
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

  list(t: Theme): El {
    const hits = this.currentHits();
    const shown = Math.min(this.visible, MAX_ROWS);
    const open = this.openFolders();
    const window = hits.slice(this.offset, this.offset + shown);
    const loading =
      this.stage.kind === "remote" ? this.loadingRemote : this.loadingDirs && !hits.length;
    return v_flex()
      .id("sessionizer-list")
      .flex_1()
      .min_h(0)
      .p(LIST_PAD)
      .gap(ROW_GAP)
      .overflow_hidden()
      .on_size_change((size: { height: number }) => {
        const fits = Math.max(1, Math.floor((size.height - LIST_PAD * 2) / (ROW_H + ROW_GAP)));
        if (fits !== this.visible) {
          this.visible = fits;
          this.reveal();
        }
      })
      .on_scroll_wheel((e: { delta: { y: number } }, cx: Cx) => {
        if (Math.abs(e.delta.y) < 1) return;
        this.scroll(e.delta.y > 0 ? -3 : 3);
        cx.notify();
      })
      .children(window.map((hit, i) => this.row(t, hit, this.offset + i, open)))
      .when(!hits.length, (el: El) =>
        el.child(
          div()
            .py(24)
            .text_center()
            .text_size(TEXT.sm)
            .text_color(t.muted)
            .child(loading ? "Loading…" : this.query ? "No matches" : "Nothing to show"),
        ),
      );
  }

  footer(t: Theme): El {
    const hint = (key: El, what: string): El =>
      h_flex().gap(6).items_center().child(key).child(what);
    const status = this.busy ?? this.error;
    return h_flex()
      .h(32)
      .px(12)
      .gap(12)
      .flex_none()
      .items_center()
      .border_t(1)
      .border_color(t.border)
      .text_size(TEXT.xs)
      .text_color(t.muted)
      .when(Boolean(status), (el: El) =>
        el.child(
          div()
            .flex_1()
            .min_w(0)
            .overflow_hidden()
            .text_color(this.error && !this.busy ? t.blocked : t.muted)
            .child(status as string),
        ),
      )
      .when(!status, (el: El) =>
        el
          .child(
            hint(h_flex().gap(2).child(kbd("", "arrow-up")).child(kbd("", "arrow-down")), "move"),
          )
          .child(hint(kbd("", "corner-down-left"), "open"))
          .when(this.stage.kind === "remote", (el: El) => el.child(hint(kbd("", "delete"), "back")))
          .child(hint(kbd("Esc"), "close")),
      );
  }

  render(): El {
    const t = theme();
    return v_flex()
      .id("sessionizer")
      .size_full()
      .bg(t.popover)
      .text_color(t.foreground)
      .track_focus(this.focus)
      .on_key_down((e: Key, cx: Cx) => this.onKey(e, cx))
      .on_mouse_down("left", () => this.focus.focus())
      .child(this.prompt(t))
      .child(this.list(t))
      .child(this.footer(t));
  }
}
