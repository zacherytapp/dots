// Spaces, grouped by machine, with a search field. The block sizes itself to its rows
// (`layout.resize` on its own node) so the Agents list under it takes all the height left:
// adding spaces pushes Agents down, removing them lets it float back up. Past the room
// Agents needs, the list scrolls instead.
//
// Each row shows its repo's git state (↓ commits to pull, ↑ to push, ● uncommitted changes),
// read every 15 s and fetched every 5 min in the background, and its agents' state as mc-agents
// publishes it: working (spinner), waiting for you (red), finished unseen (green), idle (ring).

import { div, svg, View, type Cx, type El } from "gpui-kit";
import { h_flex, v_flex, InputState } from "gpui-base";
import {
  exec,
  hc,
  layout,
  machines,
  nextCommand,
  openOverlay,
  panes,
  run,
  setShared,
  shared,
  spaces,
  theme,
  type PaneInfo,
  type SpaceInfo,
  type Status,
} from "herdr";
import { spaceAgents, urgent, type SpaceAgents } from "../../shared/space-agents.ts";
import { KEYS, NODES } from "../../shared/sources.ts";
import {
  asset,
  chromeIcon,
  iconButton,
  searchBox,
  sectionHeader,
  SPACE_MARKS,
  spaceFill,
  statusMark,
  type Theme,
} from "../../shared/ui.ts";
import { findNode, matches, parseJson, stepIn } from "../../shared/util.ts";
import { backoff, BATCH_SCRIPT, describe, FETCH_SCRIPT, parseBatch, type GitState } from "./git.ts";
import { GROUP, PAD, ROW, SEARCH, targetHeight } from "./size.ts";

const GIT_MS = 15000;
const FETCH_MS = 5 * 60000;

/** Where a space's repo is asked: its machine and its first terminal's folder. */
interface Checkout {
  key: string;
  machine: string | null;
  cwd: string;
  spaces: string[];
}

/** Groups spaces by (machine, folder), from one `spaces()` and one `panes()` read. */
function checkouts(all: SpaceInfo[], live: PaneInfo[]): Checkout[] {
  const cwdOfTab = new Map<string, string>();
  for (const p of live) if (p.cwd && !cwdOfTab.has(p.tab)) cwdOfTab.set(p.tab, p.cwd);
  const by = new Map<string, Checkout>();
  for (const s of all) {
    const cwd =
      s.tabs.map((t) => cwdOfTab.get(t.id)).find(Boolean) ||
      live.find((p) => s.tabs.some((t) => t.id === p.tab) && p.cwd)?.cwd ||
      s.folder ||
      "";
    if (!cwd) continue;
    const machine = s.machine ?? null;
    const key = JSON.stringify([machine, cwd]);
    const c = by.get(key) ?? { key, machine, cwd, spaces: [] };
    c.spaces.push(s.id);
    by.set(key, c);
  }
  return [...by.values()];
}

/** Every checkout of one machine's git state in a single process; rejects when unreachable. */
async function readGitBatch(
  machine: string | null,
  list: Checkout[],
): Promise<(GitState | null)[]> {
  const r = await exec("sh", ["-c", BATCH_SCRIPT, "sh", ...list.map((c) => c.cwd)], {
    on: machine ?? undefined,
  });
  if (r.code !== 0) throw new Error(`git status failed on ${machine ?? "this computer"}`);
  return parseBatch(r.stdout, list.length);
}

async function readGit(c: Checkout): Promise<GitState | null> {
  return (await readGitBatch(c.machine, [c]))[0] ?? null;
}

interface Machine {
  name: string;
  state: string;
  temporary?: boolean;
}

const PALETTE = Object.keys(SPACE_MARKS);

const narrow = (root: unknown): boolean =>
  (findNode(root, NODES.sidebar)?.size?.px ?? Infinity) < 160;

export default class Spaces extends View {
  declare search: InputState;
  declare machineList: Machine[];
  declare folded: Set<string>;
  declare hovered: string | null;
  declare pressed: string | null;
  declare over: string | null;
  declare height: number;
  declare lastResize: { px: number; at: number } | null;
  /** Each space's git state, by space id. */
  declare git: Map<string, GitState>;
  /** When each checkout (Checkout.key) was last fetched. */
  declare fetched: Map<string, number>;
  declare reading: boolean;
  declare fetching: boolean;
  declare listing: boolean;
  /** Unreachable machines (key "" never): consecutive failures and when to try again. */
  declare down: Map<string, { failures: number; until: number }>;
  /** Machines whose git state is being read for the first time (a spinner in their header). */
  declare loadingGit: Set<string>;

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
    this.git = new Map();
    this.fetched = new Map();
    this.reading = false;
    this.fetching = false;
    this.listing = false;
    this.down = new Map();
    this.loadingGit = new Set();
    this.refreshMachines(cx);
    cx.timer.every(30000, (cx) => this.refreshMachines(cx));
    cx.timer.after(800, (cx) => this.refreshGit(cx));
    cx.timer.every(GIT_MS, (cx) => this.refreshGit(cx));
    // keys.json: mc-spaces.next / .prev (show) and mc-spaces.move-up / .move-down (reorder)
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        try {
          if (c === "next") this.step(1);
          else if (c === "prev") this.step(-1);
          else if (c === "move-up") this.move(-1);
          else if (c === "move-down") this.move(1);
        } catch {
          // one failed command must not stop the bindings
        }
        cx.notify();
      }
    });
  }

  /**
   * Spaces in the order this list draws them, so the keys walk what you see: grouped by machine,
   * without folded machines (unless that leaves none). The search box doesn't narrow it.
   */
  ordered(): SpaceInfo[] {
    const all = spaces();
    if (narrow(layout())) return all;
    const groups = this.groups(all);
    const grouped = groups.length > 1;
    const shown = groups
      .filter((g) => !(grouped && this.folded.has(g.machine ?? "")))
      .flatMap((g) => g.spaces);
    return shown.length ? shown : all;
  }

  /** Shows the next (or previous) space in list order, wrapping at the ends. */
  step(step: 1 | -1): void {
    const list = this.ordered();
    const next = stepIn(
      list,
      list.findIndex((s) => s.active),
      step,
    );
    if (next && !next.active) run("space.select", { id: next.id });
  }

  /** Moves the shown space one place up or down among its machine's spaces, as dragging it would. */
  move(step: 1 | -1): void {
    const all = spaces();
    const space = all.find((s) => s.active);
    if (!space) return;
    const same = all.filter((s) => (s.machine ?? null) === (space.machine ?? null));
    const target = same[same.indexOf(space) + step];
    if (target) run("space.move", { id: space.id, index: all.indexOf(target) + 1 });
  }

  /** Whether this checkout is worth reading now: shown, and its machine isn't known to be away. */
  worthReading(c: Checkout, now: number): boolean {
    if (!c.machine) return true;
    if (this.folded.has(c.machine)) return false;
    const state = this.machineList.find((m) => m.name === c.machine)?.state;
    if (state && state !== "connected") return false;
    return now >= (this.down.get(c.machine)?.until ?? 0);
  }

  /**
   * Reads the git state of every shown space, one process per machine (all machines at once, never
   * overlapping a run still in flight); redraws only when one changed. Then fetches stale ones.
   * Nothing runs while the Spaces section is folded, and folded or unreachable machines are
   * skipped (an unreachable one is retried with a growing delay).
   */
  refreshGit(cx: Cx): void {
    if (this.reading || this.spacesFolded()) return;
    this.reading = true;
    cx.spawn(async (cx) => {
      const list = checkouts(spaces(), panes());
      const now = Date.now();
      const active = list.filter((c) => this.worthReading(c, now));
      const next = new Map<string, GitState>();
      for (const c of list) {
        const old = c.spaces.map((id) => this.git.get(id)).find(Boolean);
        if (old) for (const id of c.spaces) next.set(id, old);
      }
      const byMachine = new Map<string, Checkout[]>();
      for (const c of active) {
        const k = c.machine ?? "";
        byMachine.set(k, [...(byMachine.get(k) ?? []), c]);
      }
      const first = [...byMachine]
        .filter(([k, cs]) => k && cs.some((c) => c.spaces.some((id) => !this.git.has(id))))
        .map(([k]) => k);
      if (first.length) {
        for (const k of first) this.loadingGit.add(k);
        cx.notify();
      }
      try {
        await Promise.all(
          [...byMachine].map(async ([k, cs]) => {
            try {
              const states = await readGitBatch(k || null, cs);
              this.down.delete(k);
              cs.forEach((c, i) => {
                for (const id of c.spaces) {
                  const st = states[i];
                  if (st) next.set(id, st);
                  else next.delete(id);
                }
              });
            } catch {
              // Machine away: keep what was last read, and leave it alone for a while.
              const failures = (this.down.get(k)?.failures ?? 0) + 1;
              this.down.set(k, { failures, until: Date.now() + backoff(failures) });
            }
          }),
        );
      } finally {
        this.reading = false;
      }
      const hadLoading = this.loadingGit.size > 0;
      this.loadingGit.clear();
      const flat = (m: Map<string, GitState>) => JSON.stringify([...m].sort());
      if (flat(next) !== flat(this.git)) {
        this.git = next;
        cx.notify();
      } else if (hadLoading) cx.notify();
      const at = Date.now();
      this.fetchGit(
        active.filter(
          (c) =>
            c.spaces.some((id) => next.get(id)?.upstream) &&
            at - (this.fetched.get(c.key) ?? 0) > FETCH_MS,
        ),
        cx,
      );
    });
  }

  /** Fetches each checkout's remote, one at a time, and reads it again: so "behind" is current. */
  fetchGit(list: Checkout[], cx: Cx): void {
    if (this.fetching || !list.length) return;
    this.fetching = true;
    cx.spawn(async (cx) => {
      try {
        for (const c of list) {
          this.fetched.set(c.key, Date.now());
          try {
            const on = c.machine ?? undefined;
            const r = await exec("sh", ["-c", FETCH_SCRIPT], { cwd: c.cwd, on });
            if (r.code !== 0) continue;
            const state = await readGit(c);
            if (!state) continue;
            const before = JSON.stringify(this.git.get(c.spaces[0]));
            for (const id of c.spaces) this.git.set(id, state);
            if (JSON.stringify(state) !== before) cx.notify();
          } catch {
            // Unreachable now: tried again in FETCH_MS.
          }
        }
      } finally {
        this.fetching = false;
      }
    });
  }

  /** The git chips on a row: ↓ to pull, ↑ to push, ● uncommitted changes. */
  gitChips(t: Theme, s: SpaceInfo): El | null {
    const g = this.git.get(s.id);
    if (!g) return null;
    const dirty = g.changed + g.untracked;
    if (!g.ahead && !g.behind && !dirty) return null;
    const chip = (text: string, color: string) =>
      div().flex_none().text_size(11).font_semibold().text_color(color).child(text);
    return h_flex()
      .id(`space-git-${s.id}`)
      .flex_none()
      .gap(5)
      .items_center()
      .tooltip(describe(g))
      .when(g.behind > 0, (el: El) => el.child(chip(`↓${g.behind}`, t.ansi4 ?? t.accent)))
      .when(g.ahead > 0, (el: El) => el.child(chip(`↑${g.ahead}`, t.ansi2 ?? t.done)))
      .when(dirty > 0, (el: El) =>
        el.child(
          div()
            .size(6)
            .flex_none()
            .rounded(3)
            .bg(t.ansi3 ?? t.working),
        ),
      );
  }

  /**
   * The row's agent marks: working, waiting for you and finished, each with a count past one;
   * a ring when its agents are all idle. Herdr's own space status when mc-agents publishes none.
   */
  agentMarks(t: Theme, s: SpaceInfo, counts: SpaceAgents | null): El | null {
    if (!counts) {
      const st = s.status;
      return st === "working" || st === "blocked" || st === "done" ? statusMark(st, true) : null;
    }
    const marks: [Status, number, string][] = [
      ["blocked", counts.blocked, "needs you"],
      ["done", counts.done, "finished"],
      ["working", counts.working, "working"],
    ];
    const shown = marks.filter(([, n]) => n > 0);
    if (!shown.length && !counts.idle) return null;
    const tip = [...marks, ["idle", counts.idle, "idle"] as [Status, number, string]]
      .filter(([, n]) => n > 0)
      .map(([, n, label]) => `${n} ${label}`)
      .join(" · ");
    return h_flex()
      .id(`space-agents-${s.id}`)
      .flex_none()
      .gap(3)
      .items_center()
      .tooltip(`Agents: ${tip}`)
      .when(!shown.length, (el: El) => el.child(statusMark("idle", true)))
      .children(
        shown.map(([status, n]) =>
          h_flex()
            .flex_none()
            .items_center()
            .child(statusMark(status, true))
            .when(n > 1, (el: El) =>
              el.child(
                div()
                  .text_size(10.5)
                  .text_color(t[status] ?? t.dim)
                  .child(String(n)),
              ),
            ),
        ),
      );
  }

  refreshMachines(cx: Cx): void {
    if (this.listing) return;
    this.listing = true;
    cx.spawn(async (cx) => {
      try {
        const r = await hc(["machine", "ls", "--json"]);
        if (r.code === 0) {
          const list = parseJson<{ machines?: Machine[] }>(r.stdout, {}).machines ?? [];
          const next = list.filter((m) => !m.temporary);
          if (JSON.stringify(next) !== JSON.stringify(this.machineList)) {
            this.machineList = next;
            cx.notify();
          }
        }
      } catch {
        // keep the last list
      } finally {
        this.listing = false;
      }
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
  autosize(root: unknown, rows: number, groups: number): void {
    const node = findNode(root, NODES.spaces);
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

  row(t: Theme, s: SpaceInfo, color: string, counts: SpaceAgents | null, all: SpaceInfo[]): El {
    const on = s.active;
    const fill = spaceFill(t, color);
    const sameMachine = (id: string | null) =>
      (all.find((x) => x.id === id)?.machine ?? null) === (s.machine ?? null);
    const dragging = this.pressed !== null && this.pressed !== s.id && this.over === s.id;
    const from = dragging ? all.findIndex((x) => x.id === this.pressed) : -1;
    const index = all.findIndex((x) => x.id === s.id);
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
          .min_w(0)
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
      .children(
        [this.gitChips(t, s), this.agentMarks(t, s, counts)].filter((e): e is El => e !== null),
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

  machineHeader(
    t: Theme,
    machine: string | null,
    count: number,
    layoutState: string | undefined,
  ): El {
    const key = machine ?? "";
    const info = this.machineList.find((m) => m.name === machine);
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
        if (folded) {
          this.folded.delete(key);
          this.refreshGit(cx);
        } else this.folded.add(key);
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
      .when(connected && this.loadingGit.has(key), (el: El) =>
        el.child(svg(chromeIcon("spinner")).size(10).flex_none().text_color(t.dim).spin(900)),
      )
      .when(connected, (el: El) =>
        el.child(
          iconButton(
            `machine-new-${machine ?? "local"}`,
            chromeIcon("plus"),
            `New space on ${machine ?? "this computer"}`,
            (_e, cx) => {
              cx.stop_propagation();
              run("space.new", { machine: machine ?? "" });
            },
            { size: 20, iconSize: 12 },
          ),
        ),
      )
      .child(
        div()
          .id(`machine-state-${machine ?? "local"}`)
          .size(6)
          .rounded(3)
          .flex_none()
          .bg(connected ? t.ansi2 : t.dim)
          .tooltip(
            connected
              ? machine
                ? "Connected"
                : "This computer"
              : `${(info?.state ?? "offline").replace(/_/g, " ")}`,
          ),
      );
  }

  compact(t: Theme, list: SpaceInfo[], counts: Record<string, SpaceAgents> | null): El {
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
            .cursor_pointer()
            .when(s.active, (el: El) => el.bg(t.selected))
            .hover((st: El) => st.bg(t.hover))
            .on_click(() => run("space.select", { id: s.id }))
            .tooltip(s.machine ? `${s.name} · ${s.machine}` : s.name)
            .child(
              div()
                .text_color(s.active ? t.foreground : t.muted)
                .child(String(i + 1)),
            )
            .child(statusMark(counts ? urgent(counts[s.id]) : s.status, true)),
        ),
      );
  }

  render(): El {
    const t = theme();
    const all = spaces();
    const root = layout();
    const colors = this.colors(all);
    const agentCounts = spaceAgents();
    const countsOf = (id: string): SpaceAgents | null =>
      agentCounts ? (agentCounts[id] ?? { working: 0, blocked: 0, done: 0, idle: 0 }) : null;
    if (narrow(root)) return this.compact(t, all, agentCounts);

    const open = !this.spacesFolded();
    const query = this.search.value();
    const shown = all.filter((s) => matches(query, s.name, s.branch, s.machine ?? "this computer"));
    const groups = this.groups(shown);
    const grouped = groups.length > 1;
    const layoutOf = new Map(machines().map((m) => [m.name, m.layout]));
    const rows: El[] = [];
    let rowCount = 0;
    for (const g of groups) {
      if (grouped)
        rows.push(this.machineHeader(t, g.machine, g.spaces.length, layoutOf.get(g.machine)));
      if (grouped && this.folded.has(g.machine ?? "")) continue;
      for (const s of g.spaces)
        rows.push(this.row(t, s, colors[s.id] ?? "ansi6", countsOf(s.id), all));
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
    this.autosize(root, rowCount, grouped ? groups.length : 0);

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
          (cx) => {
            setShared(KEYS.spacesFolded, open);
            // Unfolded: read git now rather than at the next tick (folded skips it).
            if (!open) cx.timer.after(50, (cx) => this.refreshGit(cx));
          },
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
