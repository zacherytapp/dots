// Every agent on every machine: Herdr's agents by priority (Needs you, Done, Working, Idle) or
// by space, sub-agents nested under their parent, agents started outside any space, and the
// Claude Code background jobs not yet closed out (working, waiting for you, stopped). An agent
// that starts waiting for you posts a notification. It sits under Spaces and takes the height Spaces leaves (see mc-spaces), so it reports
// its own height and fold state through shared state.

import { div, View, type Cx, type El } from "gpui-kit";
import { h_flex, v_flex, InputState } from "gpui-base";
import {
  agents,
  home,
  layout,
  nextCommand,
  notify,
  panes,
  playSound,
  run,
  setAgentOrder,
  setShared,
  shared,
  spaces,
  terminals,
  theme,
  watchFolder,
} from "herdr";
import { KEYS, NODES } from "../../shared/sources.ts";
import { findTab, publishSessions } from "../../shared/launch.ts";
import { spaceFolders } from "../../shared/repo.ts";
import { countBySpace, publishSpaceAgents } from "../../shared/space-agents.ts";
import {
  agentIcon,
  badge,
  button,
  groupLabel,
  ICON,
  icon,
  menuButton,
  MONO,
  programIcon,
  RADIUS,
  searchBox,
  separator,
  statusMark,
  TEXT,
  type Theme,
} from "../../shared/ui.ts";
import { compactNumber, duration, findNode, parseJson, stepIn } from "../../shared/util.ts";
import { readContexts } from "./context.ts";
import { jobMachines, readJobsOn } from "./jobs.ts";
import { jobsKey, skipAfterFailures, touchesState, type Job } from "./jobs-model.ts";
import {
  buildModel,
  RANK,
  titleMark,
  trackFinished,
  type Group,
  type Input,
  type Mode,
  type Model,
  type Row,
  type TerminalRecord,
} from "./model.ts";
import { contextKey, sameReadings, shortModel, type Reading } from "./usage.ts";

const narrow = (): boolean => (findNode(layout(), NODES.sidebar)?.size?.px ?? Infinity) < 160;

/** How often other machines' jobs are read; this computer's are watched (and read every 15 s). */
const REMOTE_JOBS_MS = 3000;
const LOCAL_JOBS_MS = 15000;

/** Groups folded until you open them: there can be dozens of these. */
const FOLDED_AT_FIRST = ["jobs-stopped", "jobs-old"];

/** Opens a background job: a tab attached to it, in the space on its machine that holds its folder. */
function attachJob(job: Job): void {
  const existing = findTab(job.name);
  if (existing) {
    run("space.select", { id: existing.space.id });
    run("tab.select", { id: existing.tab });
    return;
  }
  const argv = ["claude", "attach", job.id];
  const inside = (f: string) => job.cwd === f || job.cwd.startsWith(`${f.replace(/\/+$/, "")}/`);
  const space = spaces().find(
    (s) => (s.machine ?? null) === job.machine && spaceFolders(s).some(inside),
  );
  if (space) {
    run("space.select", { id: space.id });
    run("tab.new", { space: space.id, folder: job.cwd, name: job.name, argv });
  } else {
    run("space.new", { machine: job.machine ?? "", folder: job.cwd, argv });
  }
}

export default class Agents extends View {
  declare search: InputState;
  declare folded: Set<string>;
  declare hovered: string | null;
  declare readings: Map<string, Reading>;
  /** Address → { status, since } so rows say how long they've been in it. */
  declare changed: Record<string, { s: string; at: number }>;
  declare rows: Row[];
  declare reading: boolean;
  declare jobs: Job[];
  /** Each machine's jobs ("" is this computer), read on their own so a slow one can't hold back the rest. */
  declare jobsBy: Map<string, Job[]>;
  /** Machines being read now, and those that changed meanwhile and need another read. */
  declare jobsBusy: Set<string>;
  declare jobsAgain: Set<string>;
  /** Machines whose last read failed: consecutive failures, and polls still to skip. */
  declare jobsFails: Map<string, { fails: number; wait: number }>;
  /** What the last context read was made from (see contextKey), and when. */
  declare contextSeen: { key: string; at: number };
  /** The panes' state signals as last drawn (see liveKey). */
  declare drawnKey: string;
  /** The agent order last handed to Herdr. */
  declare orderKey: string | null;
  /** Each row's last status, to notice one starting to wait for you; null until the first look. */
  declare lastStatus: Map<string, string> | null;
  /** Agents in a pane that finished while nobody looked (see trackFinished). */
  declare finished: Set<string>;
  /** The agent the keyboard last went to, for when focus is somewhere else (a peek, a mod). */
  declare cursor: string | null;
  /** Rows waiting for you, in list order, also those folded or hidden by the search. */
  declare urgent: Row[];
  /** Rows the keys step through: as drawn, without folded groups, but not narrowed by the search. */
  declare navRows: Row[];

  init(_props: unknown, cx: Cx): void {
    this.search = InputState.new({ placeholder: "Find an agent" });
    this.search.on("change", (_e, cx) => cx.notify());
    this.folded = new Set(parseJson<string[]>(localStorage.getItem("folded.v2"), FOLDED_AT_FIRST));
    this.hovered = null;
    this.readings = new Map();
    this.changed = parseJson(localStorage.getItem("changed"), {});
    this.rows = [];
    this.reading = false;
    this.jobs = [];
    this.jobsBy = new Map();
    this.jobsBusy = new Set();
    this.jobsAgain = new Set();
    this.jobsFails = new Map();
    this.contextSeen = { key: "", at: 0 };
    this.lastStatus = null;
    this.finished = new Set();
    this.drawnKey = "";
    this.orderKey = null;
    this.cursor = null;
    this.urgent = [];
    this.navRows = [];
    // keys.json: mc-agents.next / mc-agents.prev / mc-agents.needs-you
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        try {
          if (c === "next") this.step(1);
          else if (c === "prev") this.step(-1);
          else if (c === "needs-you") this.nextNeedingYou();
        } catch {
          // one failed command must not stop the bindings
        }
        cx.notify();
      }
    });
    cx.timer.every(1000, (cx) => {
      if (this.liveKey() !== this.drawnKey) cx.notify();
    });
    this.readJobs(null, cx, true);
    this.readRemoteJobs(cx);
    this.watchJobs(cx);
    cx.timer.every(LOCAL_JOBS_MS, (cx) => this.readJobs(null, cx, true));
    cx.timer.every(REMOTE_JOBS_MS, (cx) => this.readRemoteJobs(cx));
    cx.timer.every(15000, (cx) => this.readContext(cx));
    cx.timer.after(1500, (cx) => this.readContext(cx));
  }

  /**
   * What each pane's state is read from: its reported status, else its title's spinner or still
   * mark. A title change alone may not redraw a mod, so a 1 s look compares this to what was drawn
   * and redraws only when an agent would change state (and then notifies at once if it waits).
   */
  liveKey(paneList = panes()): string {
    return paneList.map((p) => `${p.terminal}:${p.status ?? titleMark(p.title) ?? ""}`).join("|");
  }

  mode(): Mode {
    return shared("mc.agents.mode") === "spaces" ? "spaces" : "priority";
  }

  open(): boolean {
    return shared(KEYS.agentsFolded) !== true;
  }

  readContext(cx: Cx): void {
    if (this.reading || !this.open()) return;
    const rows = this.rows.filter((r) => r.depth === 0);
    // Nothing new in any session's job record and nobody working: the files haven't grown.
    const key = contextKey(rows);
    const now = Date.now();
    const working = rows.some((r) => r.status === "working");
    if (key === this.contextSeen.key && !working && now - this.contextSeen.at < 120000) return;
    this.contextSeen = { key, at: now };
    this.reading = true;
    cx.spawn(async (cx) => {
      try {
        const next = await readContexts(rows);
        if (!sameReadings(next, this.readings)) {
          this.readings = next;
          cx.notify();
        }
      } finally {
        this.reading = false;
      }
    });
  }

  /** Reads this computer's jobs the moment Claude Code writes one (state.json). */
  watchJobs(cx: Cx): void {
    const dir = `${home()}/.claude/jobs`;
    cx.spawn(async (cx) => {
      for (;;) {
        let paths: string[];
        try {
          paths = await watchFolder(dir);
        } catch {
          return; // no jobs folder (yet), or the watch is refused: the timer reads it
        }
        if (touchesState(paths, dir)) this.readJobs(null, cx);
      }
    });
  }

  readRemoteJobs(cx: Cx): void {
    const live = jobMachines();
    for (const key of [...this.jobsBy.keys()])
      if (key && !live.includes(key)) {
        this.jobsBy.delete(key);
        this.jobsFails.delete(key);
        this.publishJobs(cx);
      }
    for (const m of live) {
      // An unreachable machine is tried less and less often.
      const f = this.jobsFails.get(m);
      if (f && f.wait > 0) {
        f.wait--;
        continue;
      }
      this.readJobs(m, cx, true);
    }
  }

  /**
   * Reads one machine's jobs. A read asked for by a timer while one is running is dropped (a slow
   * machine never stacks requests); one asked for by a change on disk runs again right after.
   */
  readJobs(machine: string | null, cx: Cx, timer = false): void {
    const key = machine ?? "";
    if (this.jobsBusy.has(key)) {
      if (!timer) this.jobsAgain.add(key);
      return;
    }
    this.jobsBusy.add(key);
    cx.spawn(async (cx) => {
      try {
        do {
          this.jobsAgain.delete(key);
          const jobs = await readJobsOn(machine);
          const was = this.jobsFails.get(key);
          const wasLoaded = this.jobsBy.has(key);
          if (jobs) {
            this.jobsBy.set(key, jobs);
            this.jobsFails.delete(key);
          } else if (machine) {
            // Keep the jobs last seen; mark the machine so the list can say it is away.
            const fails = (was?.fails ?? 0) + 1;
            this.jobsFails.set(key, { fails, wait: skipAfterFailures(fails) });
            if (!this.jobsBy.has(key)) this.jobsBy.set(key, []);
          }
          const flipped =
            Boolean(was) !== Boolean(this.jobsFails.get(key)) || (machine !== null && !wasLoaded);
          if (!this.publishJobs(cx) && flipped) cx.notify();
        } while (this.jobsAgain.has(key));
      } finally {
        this.jobsBusy.delete(key);
      }
    });
  }

  /** Machines not read yet (loading) and those that can't be reached, for the list to show. */
  machineNotes(): { loading: string[]; away: string[] } {
    const live = jobMachines();
    return {
      loading: live.filter((m) => !this.jobsBy.has(m)),
      away: live.filter((m) => this.jobsFails.has(m)),
    };
  }

  /** Redraws only when a job's state, detail or time changed. */
  publishJobs(cx: Cx): boolean {
    const jobs = [...this.jobsBy.values()].flat();
    if (jobsKey(jobs) === jobsKey(this.jobs)) {
      // A machine just finishing its first read still changes what the list shows.
      return false;
    }
    this.jobs = jobs;
    // The issue and pull request buttons light up while their session exists.
    publishSessions(jobs.map((j) => j.name));
    cx.notify();
    return true;
  }

  /**
   * Posts a notification when an agent starts waiting for you. Herdr already does this for agents
   * that report their status, so only rows whose state comes from a job or a title do it here.
   */
  alert(rows: Row[]): void {
    const now = new Map(rows.map((r) => [r.address, r.status as string]));
    const before = this.lastStatus;
    this.lastStatus = now;
    if (!before) return;
    for (const r of rows) {
      if (r.status !== "blocked" || before.get(r.address) === "blocked" || !r.guessed) continue;
      // A job seen for the first time that has been waiting for long isn't news.
      if (!before.has(r.address) && r.job && Date.now() - r.job.updated > 120000) continue;
      const where = [r.spaceName, r.machine].filter(Boolean).join(" · ");
      notify({
        title: `${r.title} needs you`,
        body: [r.detail, where].filter(Boolean).join("\n"),
        level: "warning",
        action: r.pane ? { name: "pane.focus", args: { pane: r.pane } } : undefined,
      });
      playSound("blocked");
    }
  }

  fold(id: string, cx: Cx): void {
    if (this.folded.has(id)) this.folded.delete(id);
    else this.folded.add(id);
    localStorage.setItem("folded.v2", JSON.stringify([...this.folded]));
    cx.notify();
  }

  /** Remembers when each agent's state last changed (done and idle count as one). */
  track(rows: Row[]): void {
    const now = Date.now();
    let dirty = false;
    for (const r of rows) {
      const s = r.status === "done" ? "idle" : r.status;
      if (this.changed[r.address]?.s === s) continue;
      this.changed[r.address] = { s, at: now };
      dirty = true;
    }
    if (!dirty) return;
    const live = new Set(rows.map((r) => r.address));
    for (const [k, v] of Object.entries(this.changed))
      if (!live.has(k) && now - v.at > 7 * 86400000) delete this.changed[k];
    localStorage.setItem("changed", JSON.stringify(this.changed));
  }

  focus(r: Row): void {
    this.cursor = r.address;
    if (r.native && r.pane) run("pane.focus", { pane: r.pane });
    else if (r.job) attachJob(r.job);
    else run("terminal.peek", { terminal: r.address });
  }

  /** The agent being looked at: the focused pane in the shown tab, else where the keys last went. */
  current(): string | null {
    const tab = spaces()
      .find((s) => s.active)
      ?.tabs.find((t) => t.active)?.id;
    return panes().find((p) => p.tab === tab && p.focused)?.terminal ?? this.cursor;
  }

  /**
   * Shows the next (or previous) agent in a pane, in the order this list draws them. Background
   * jobs without a tab are skipped: stepping past one shouldn't open a tab for it.
   */
  step(step: 1 | -1): void {
    const list = this.navRows.filter((r) => r.depth === 0 && r.native && r.pane);
    const here = this.current();
    const next = stepIn(
      list,
      list.findIndex((r) => r.address === here),
      step,
    );
    if (next) this.focus(next);
  }

  /** Shows the next agent waiting for you after the current one (a background job opens in a tab). */
  nextNeedingYou(): void {
    const here = this.current();
    const next = stepIn(
      this.urgent,
      this.urgent.findIndex((r) => r.address === here),
      1,
    );
    if (next) this.focus(next);
  }

  row(t: Theme, r: Row): El {
    const pic =
      programIcon(r.program, ICON.md, t.foreground) ??
      (r.job ? icon("bot", ICON.md, t.muted) : null);
    if (r.depth > 0) {
      // SidebarMenuSub: a 1px line down the left, rows h28 beside it.
      return h_flex()
        .w_full()
        .flex_none()
        .pl(14 + (r.depth - 1) * 14)
        .child(
          h_flex()
            .flex_1()
            .min_w(0)
            .pl(10)
            .border_l(1)
            .border_color(t.border)
            .child(
              menuButton(`ag-${r.address}`, { size: "sm", onClick: () => this.focus(r) })
                .child(r.program ? agentIcon(r.program, ICON.xs, t.foreground) : div().w(ICON.xs))
                .child(div().flex_1().min_w(0).truncate().text_color(t.muted).child(r.title))
                .child(statusMark(r.status, true)),
            ),
        );
    }
    const since = r.job && !r.pane ? r.job.updated : this.changed[r.address]?.at;
    const reading = this.readings.get(r.address);
    const hovered = this.hovered === r.address;
    const where =
      [r.spaceName, r.machine, r.job && !r.pane ? "background" : null]
        .filter(Boolean)
        .join(" · ") || "Outside spaces";
    const idle = r.status === "idle" && !r.focused;
    return menuButton(`ag-${r.address}`, {
      active: r.focused,
      size: "auto",
      onClick: () => this.focus(r),
    })
      .relative()
      .flex_col()
      .items_stretch()
      .flex_none()
      .gap(2)
      .on_hover((over: boolean, cx: Cx) => {
        if (over) this.hovered = r.address;
        else if (this.hovered === r.address) this.hovered = null;
        cx.notify();
      })
      .child(
        h_flex()
          .gap(8)
          .items_center()
          .child(pic ? div().w(ICON.md).flex_none().child(pic) : div().w(ICON.md).flex_none())
          .child(
            div()
              .flex_1()
              .min_w(0)
              .truncate()
              .text_color(idle ? t.muted : t.foreground)
              .child(r.title),
          )
          .when(r.kids > 0, (el: El) =>
            el.child(
              button(`kids-${r.address}`, {
                label: String(r.kids),
                icon: this.folded.has(r.address) ? "chevron-right" : "chevron-down",
                size: "xs",
                tooltip: this.folded.has(r.address) ? "Show sub-agents" : "Hide sub-agents",
                onClick: (_e, cx) => {
                  cx.stop_propagation();
                  this.fold(r.address, cx);
                },
              }),
            ),
          )
          .child(statusMark(r.status, true)),
      )
      .child(
        h_flex()
          .pl(24)
          .gap(6)
          .items_center()
          .text_size(TEXT.xs)
          .text_color(t.muted)
          .child(div().flex_1().min_w(0).truncate().child(where))
          .when(Boolean(since), (el: El) =>
            el.child(
              div()
                .flex_none()
                .font_family(MONO)
                .child(duration(Date.now() - (since as number))),
            ),
          ),
      )
      .when(Boolean(r.detail), (el: El) =>
        el.child(
          div()
            .pl(24)
            .min_w(0)
            .truncate()
            .text_size(TEXT.xs)
            .text_color(r.status === "blocked" ? t.blocked : t.muted)
            .tooltip(r.detail)
            .child(r.detail as string),
        ),
      )
      .when(Boolean(reading), (el: El) => {
        const { tokens, model, effort } = reading as Reading;
        const runsOn = [shortModel(model), effort ? `${effort} effort` : ""].filter(Boolean);
        return el.child(
          h_flex()
            .pl(24)
            .gap(5)
            .min_w(0)
            .text_size(TEXT.xs)
            .text_color(t.muted)
            .child(div().flex_none().child("Context"))
            .child(
              div()
                .flex_none()
                .font_family(MONO)
                .text_color(t.foreground)
                .child(compactNumber(tokens)),
            )
            .when(runsOn.length > 0, (e: El) =>
              e.child(
                div()
                  .flex_1()
                  .min_w(0)
                  .truncate()
                  .tooltip(runsOn.join(" · "))
                  .child(`· ${runsOn.join(" · ")}`),
              ),
            ),
        );
      })
      .when(hovered && r.native, (el: El) =>
        el.child(
          // Over the title line's right edge (left of the status mark), so nothing shifts on hover.
          h_flex()
            .absolute()
            .right(28)
            .top(4)
            .rounded(RADIUS.md)
            .bg(r.focused ? t.selected : t.hover)
            .child(
              button(`pin-${r.address}`, {
                icon: r.pinned ? "pin-off" : "pin",
                tooltip: r.pinned ? "Unpin" : "Pin to the top",
                size: "icon-xs",
                onClick: (_e, cx) => {
                  cx.stop_propagation();
                  run("terminal.pin", { terminal: r.address, pinned: !r.pinned });
                  this.hovered = null;
                  cx.notify();
                },
              }),
            ),
        ),
      );
  }

  groupHeader(t: Theme, g: Group): El {
    return groupLabel(`group-${g.id}`, g.label, {
      count: g.count,
      open: !this.folded.has(g.id),
      tone: g.tone ? t[g.tone] : undefined,
      onToggle: (cx) => this.fold(g.id, cx),
    }).mt(4);
  }

  /** A line per machine still being read (spinner) or unreachable, so it isn't silently empty. */
  machineNotes_(t: Theme): El[] {
    const { loading, away } = this.machineNotes();
    const line = (key: string, mark: El | null, text: string) =>
      h_flex()
        .id(`note-${key}`)
        .flex_none()
        .px(8)
        .py(4)
        .gap(8)
        .items_center()
        .text_size(TEXT.xs)
        .text_color(t.muted)
        .child(mark ?? div().w(ICON.sm).flex_none())
        .child(div().flex_1().min_w(0).truncate().child(text));
    return [
      ...loading.map((m) => line(`l-${m}`, statusMark("working"), `Reading ${m}…`)),
      ...away.map((m) => line(`a-${m}`, null, `${m} is unreachable; showing what was last seen`)),
    ];
  }

  compact(t: Theme, rows: Row[]): El {
    return v_flex()
      .size_full()
      .bg(t.chrome)
      .child(div().px(4).child(separator()))
      .child(
        v_flex()
          .p(4)
          .gap(2)
          .children(
            rows
              .filter((r) => r.depth === 0)
              .map((r) =>
                h_flex()
                  .id(`ag-${r.address}`)
                  .h(32)
                  .flex_none()
                  .justify_center()
                  .items_center()
                  .gap(4)
                  .rounded(RADIUS.md)
                  .cursor_pointer()
                  .when(r.focused, (el: El) => el.bg(t.selected))
                  .when(!r.focused, (el: El) => el.hover((s: El) => s.bg(t.hover)))
                  .on_click(() => this.focus(r))
                  .tooltip(`${r.title} · ${r.status}`)
                  .child(agentIcon(r.program, ICON.md, t.foreground))
                  .child(statusMark(r.status, true)),
              ),
          ),
      );
  }

  /** An agent you can see: focused, or in the shown tab. */
  seen(
    spaceList: ReturnType<typeof spaces>,
    paneList: ReturnType<typeof panes>,
  ): (r: Row) => boolean {
    const tab = spaceList.find((s) => s.active)?.tabs.find((t) => t.active)?.id;
    const shown = new Set(paneList.filter((p) => p.tab === tab).map((p) => p.pane));
    return (r) => r.focused || (r.pane !== null && shown.has(r.pane));
  }

  /**
   * The agents list as drawn, and every agent regardless of the search (what the Spaces rows,
   * the finished marks and the notifications go by). Agents that just finished unseen show as done.
   */
  models(input: Omit<Input, "finished">): { model: Model; full: Model } {
    const seen = this.seen(input.spaces, input.panes);
    const build = (finished: Set<string>) => {
      const model = buildModel({ ...input, finished });
      const full = input.query ? buildModel({ ...input, finished, query: "" }) : model;
      return { model, full };
    };
    let built = build(this.finished);
    const next = trackFinished(built.full.all, this.lastStatus, this.finished, seen);
    if (next.size !== this.finished.size || [...next].some((a) => !this.finished.has(a))) {
      this.finished = next;
      built = build(next);
    }
    return built;
  }

  /** Tells mc-spaces how many agents in each space work, wait for you or finished. */
  publishSpaces(rows: Row[], spaceList: ReturnType<typeof spaces>): void {
    const places = spaceList.map((s) => ({
      id: s.id,
      machine: s.machine ?? null,
      folders: spaceFolders(s),
    }));
    publishSpaceAgents(countBySpace(rows, places));
  }

  render(): El {
    const t = theme();
    const open = this.open();
    const mode = this.mode();
    const spaceList = spaces();
    const paneList = panes();
    this.drawnKey = this.liveKey(paneList);
    const { model, full } = this.models({
      agents: agents(),
      terminals: terminals() as TerminalRecord[],
      spaces: spaceList,
      panes: paneList,
      mode,
      query: this.search.value(),
      folded: this.folded,
      jobs: this.jobs,
    });
    this.alert(full.all);
    this.publishSpaces(full.all, spaceList);
    const order = model.order.join("\n");
    if (order !== this.orderKey) {
      this.orderKey = order;
      setAgentOrder(model.order);
    }
    const rows = model.groups.flatMap((g) => g.rows);
    this.rows = rows;
    this.track(rows.filter((r) => r.depth === 0));
    if (narrow()) return this.compact(t, rows);

    this.urgent = full.needsYou;
    this.navRows = full.groups.flatMap((g) => g.rows);
    const urgent = full.needsYou.length;
    const needsYou = badge(`${urgent} need${urgent === 1 ? "s" : ""} you`, {
      id: "needs-you",
      variant: "destructive",
      tooltip:
        urgent === 1 ? "Show the agent waiting for you" : "Show the next agent waiting for you",
      onClick: (_e, cx) => {
        cx.stop_propagation();
        this.nextNeedingYou();
      },
    });
    const toggle = (m: Mode, iconName: "clock" | "layers", label: string) =>
      button(`mode-${m}`, {
        icon: iconName,
        tooltip: label,
        size: "icon-xs",
        active: mode === m,
        onClick: () => setShared("mc.agents.mode", m),
      });

    return v_flex()
      .id("root")
      .size_full()
      .min_h(0)
      .bg(t.chrome)
      .text_size(TEXT.sm)
      .on_size_change((size: { height: number }) => {
        const h = Math.round(size.height);
        if (shared(KEYS.agentsHeight) !== h) setShared(KEYS.agentsHeight, h);
      })
      .child(div().px(8).child(separator()))
      .child(
        div()
          .flex_none()
          .px(8)
          .child(
            groupLabel("agents-header", "Agents", {
              count: model.total,
              open,
              onToggle: () => setShared(KEYS.agentsFolded, open),
              trailing: [
                ...(urgent ? [needsYou] : []),
                ...(open
                  ? [
                      toggle("priority", "clock", "Sort by priority"),
                      toggle("spaces", "layers", "Group by space"),
                    ]
                  : []),
              ],
            }),
          ),
      )
      .when(open, (el: El) =>
        el
          .child(
            h_flex().flex_none().h(40).px(8).pb(8).child(searchBox("agent-search", this.search)),
          )
          .child(
            v_flex()
              .id("agent-list")
              .flex_1()
              .min_h(0)
              .px(8)
              .pb(8)
              .gap(2)
              .overflow_y_scrollbar()
              .children(this.machineNotes_(t))
              .when(model.total === 0, (e: El) =>
                e.child(
                  div()
                    .px(8)
                    .py(6)
                    .text_size(TEXT.xs)
                    .text_color(t.muted)
                    .child(
                      "No agents running. Agents show up here, from every machine, once they report their status.",
                    ),
                ),
              )
              .children(
                model.groups.flatMap((g) => [
                  this.groupHeader(t, g),
                  ...g.rows.map((r) => this.row(t, r)),
                ]),
              ),
          ),
      );
  }
}
