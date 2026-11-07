// Every agent on every machine: Herdr's agents by priority (Needs you, Done, Working, Idle) or
// by space, sub-agents nested under their parent, agents started outside any space, and the
// Claude Code background jobs not yet closed out (working, waiting for you, stopped). An agent
// that starts waiting for you posts a notification. It sits under Spaces and takes the height Spaces leaves (see mc-spaces), so it reports
// its own height and fold state through shared state.

import { div, svg, View, type Cx, type El } from "gpui-kit";
import { h_flex, v_flex, InputState } from "gpui-base";
import {
  agents,
  home,
  layout,
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
import { findTab } from "../../shared/launch.ts";
import { spaceFolders } from "../../shared/repo.ts";
import {
  asset,
  chromeIcon,
  iconButton,
  programIcon,
  searchBox,
  sectionHeader,
  statusMark,
  type Theme,
} from "../../shared/ui.ts";
import { compactNumber, duration, findNode, parseJson } from "../../shared/util.ts";
import { readContexts, type Reading } from "./context.ts";
import { jobMachines, readJobsOn } from "./jobs.ts";
import { touchesState, type Job } from "./jobs-model.ts";
import {
  buildModel,
  RANK,
  titleMark,
  type Group,
  type Mode,
  type Row,
  type TerminalRecord,
} from "./model.ts";
import { shortModel } from "./usage.ts";

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
  /** The panes' state signals as last drawn (see liveKey). */
  declare drawnKey: string;
  /** Each row's last status, to notice one starting to wait for you; null until the first look. */
  declare lastStatus: Map<string, string> | null;

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
    this.lastStatus = null;
    this.drawnKey = "";
    cx.timer.every(1000, (cx) => {
      if (this.liveKey() !== this.drawnKey) cx.notify();
    });
    this.readJobs(null, cx);
    this.readRemoteJobs(cx);
    this.watchJobs(cx);
    cx.timer.every(LOCAL_JOBS_MS, (cx) => this.readJobs(null, cx));
    cx.timer.every(REMOTE_JOBS_MS, (cx) => this.readRemoteJobs(cx));
    cx.timer.every(15000, (cx) => this.readContext(cx));
    cx.timer.after(1500, (cx) => this.readContext(cx));
  }

  /**
   * What each pane's state is read from: its reported status, else its title's spinner or still
   * mark. A title change alone may not redraw a mod, so a 1 s look compares this to what was drawn
   * and redraws only when an agent would change state (and then notifies at once if it waits).
   */
  liveKey(): string {
    return panes()
      .map((p) => `${p.terminal}:${p.status ?? titleMark(p.title) ?? ""}`)
      .join("|");
  }

  mode(): Mode {
    return shared("mc.agents.mode") === "spaces" ? "spaces" : "priority";
  }

  open(): boolean {
    return shared(KEYS.agentsFolded) !== true;
  }

  readContext(cx: Cx): void {
    if (this.reading || !this.open()) return;
    this.reading = true;
    const rows = this.rows.filter((r) => r.depth === 0);
    cx.spawn(async (cx) => {
      try {
        this.readings = await readContexts(rows);
      } finally {
        this.reading = false;
        cx.notify();
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
        this.publishJobs(cx);
      }
    for (const m of live) this.readJobs(m, cx);
  }

  /** Reads one machine's jobs; a read asked for mid-read runs again right after it. */
  readJobs(machine: string | null, cx: Cx): void {
    const key = machine ?? "";
    if (this.jobsBusy.has(key)) {
      this.jobsAgain.add(key);
      return;
    }
    this.jobsBusy.add(key);
    cx.spawn(async (cx) => {
      try {
        do {
          this.jobsAgain.delete(key);
          this.jobsBy.set(key, await readJobsOn(machine));
          this.publishJobs(cx);
        } while (this.jobsAgain.has(key));
      } finally {
        this.jobsBusy.delete(key);
      }
    });
  }

  /** Redraws only when a job's state, detail or time changed. */
  publishJobs(cx: Cx): void {
    const jobs = [...this.jobsBy.values()].flat();
    const key = (j: Job) => `${j.machine}/${j.id}/${j.state}/${j.detail}/${j.updated}`;
    if (jobs.map(key).join("\n") === this.jobs.map(key).join("\n")) return;
    this.jobs = jobs;
    cx.notify();
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
    if (r.native && r.pane) run("pane.focus", { pane: r.pane });
    else if (r.job) attachJob(r.job);
    else run("terminal.peek", { terminal: r.address });
  }

  row(t: Theme, r: Row): El {
    const pic =
      programIcon(r.program, 16, t.foreground) ??
      (r.job ? svg(asset("agent")).size(16).text_color(t.muted) : null);
    if (r.depth > 0) {
      return h_flex()
        .id(`ag-${r.address}`)
        .h(26)
        .flex_none()
        .pl(14 + r.depth * 14)
        .pr(8)
        .gap(8)
        .items_center()
        .rounded(7)
        .text_size(12.5)
        .cursor_pointer()
        .hover((s: El) => s.bg(t.hover))
        .on_click(() => this.focus(r))
        .child(
          div()
            .w(8)
            .h(12)
            .flex_none()
            .border_l(1.5)
            .border_b(1.5)
            .rounded_bl(5)
            .border_color(t.input)
            .mt(-6),
        )
        .when(Boolean(pic), (el: El) => el.child(programIcon(r.program, 13, t.foreground) as El))
        .child(div().flex_1().min_w(0).truncate().text_color(t.muted).child(r.title))
        .child(statusMark(r.status, true));
    }
    const since = r.job && !r.pane ? r.job.updated : this.changed[r.address]?.at;
    const reading = this.readings.get(r.address);
    const hovered = this.hovered === r.address;
    const where =
      [r.spaceName, r.machine, r.job && !r.pane ? "background" : null]
        .filter(Boolean)
        .join(" · ") || "Outside spaces";
    const idle = r.status === "idle" && !r.focused;
    return v_flex()
      .id(`ag-${r.address}`)
      .flex_none()
      .px(8)
      .py(6)
      .gap(2)
      .rounded(8)
      .cursor_pointer()
      .when(r.focused, (el: El) => el.bg(t.selected))
      .hover((s: El) => s.bg(t.hover))
      .on_hover((over: boolean, cx: Cx) => {
        if (over) this.hovered = r.address;
        else if (this.hovered === r.address) this.hovered = null;
        cx.notify();
      })
      .on_click(() => this.focus(r))
      .child(
        h_flex()
          .gap(8)
          .items_center()
          .child(pic ? div().w(16).flex_none().child(pic) : div().w(16).flex_none())
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
              div()
                .id(`kids-${r.address}`)
                .flex_none()
                .px(4)
                .rounded(4)
                .text_size(11)
                .text_color(t.dim)
                .hover((s: El) => s.bg(t.hover).text_color(t.foreground))
                .on_click((_e: unknown, cx: Cx) => {
                  cx.stop_propagation();
                  this.fold(r.address, cx);
                })
                .tooltip(this.folded.has(r.address) ? "Show sub-agents" : "Hide sub-agents")
                .child(`${this.folded.has(r.address) ? "▸" : "▾"} ${r.kids}`),
            ),
          )
          .when(hovered && r.native, (el: El) =>
            el.child(
              iconButton(
                `pin-${r.address}`,
                chromeIcon(r.pinned ? "pin-off" : "pin"),
                r.pinned ? "Unpin" : "Pin to the top",
                (_e, cx) => {
                  cx.stop_propagation();
                  run("terminal.pin", { terminal: r.address, pinned: !r.pinned });
                  this.hovered = null;
                  cx.notify();
                },
                { size: 20, iconSize: 12 },
              ),
            ),
          )
          .child(statusMark(r.status, true)),
      )
      .child(
        h_flex()
          .pl(24)
          .gap(6)
          .items_center()
          .text_size(11.5)
          .text_color(t.dim)
          .child(div().flex_1().min_w(0).truncate().child(where))
          .when(Boolean(since), (el: El) =>
            el.child(
              div()
                .flex_none()
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
            .text_size(11.5)
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
            .text_size(11)
            .text_color(t.dim)
            .child(div().flex_none().child("Context"))
            .child(div().flex_none().text_color(t.muted).child(compactNumber(tokens)))
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
      });
  }

  groupHeader(t: Theme, g: Group): El {
    const open = !this.folded.has(g.id);
    return h_flex()
      .id(`group-${g.id}`)
      .h(26)
      .mt(4)
      .flex_none()
      .px(8)
      .gap(6)
      .items_center()
      .text_size(11.5)
      .cursor_pointer()
      .hover((s: El) => s.text_color(t.foreground))
      .on_click((_e: unknown, cx: Cx) => this.fold(g.id, cx))
      .child(
        div()
          .min_w(0)
          .truncate()
          .text_color(g.tone ? (t[g.tone] ?? t.dim) : t.dim)
          .child(g.label),
      )
      .child(div().text_color(t.dim).child(String(g.count)))
      .child(div().flex_1())
      .when(!open, (el: El) =>
        el.child(svg(chromeIcon("chevron-right")).size(11).text_color(t.dim)),
      );
  }

  compact(t: Theme, rows: Row[]): El {
    return v_flex()
      .size_full()
      .bg(t.chrome)
      .border_t(1)
      .border_color(t.border)
      .pt(6)
      .children(
        rows
          .filter((r) => r.depth === 0)
          .map((r, i) =>
            h_flex()
              .id(`ag-${r.address}`)
              .h(26)
              .flex_none()
              .px(8)
              .gap(4)
              .items_center()
              .hover((s: El) => s.bg(t.hover))
              .on_click(() => this.focus(r))
              .child(
                div()
                  .flex_1()
                  .text_right()
                  .text_size(12)
                  .text_color(t.muted)
                  .child(String(i + 1)),
              )
              .child(statusMark(r.status, true)),
          ),
      );
  }

  render(): El {
    const t = theme();
    const open = this.open();
    const mode = this.mode();
    this.drawnKey = this.liveKey();
    const model = buildModel({
      agents: agents(),
      terminals: terminals() as TerminalRecord[],
      spaces: spaces(),
      panes: panes(),
      mode,
      query: this.search.value(),
      folded: this.folded,
      jobs: this.jobs,
    });
    this.alert(model.all);
    setAgentOrder(model.order);
    const rows = model.groups.flatMap((g) => g.rows);
    this.rows = rows;
    this.track(rows.filter((r) => r.depth === 0));
    if (narrow()) return this.compact(t, rows);

    const urgent = model.needsYou;
    const needsYou = div()
      .flex_none()
      .px(6)
      .h(18)
      .flex()
      .items_center()
      .rounded(5)
      .bg(`${t.blocked}26`)
      .text_size(10.5)
      .font_semibold()
      .text_color(t.blocked)
      .child(`${urgent} need${urgent === 1 ? "s" : ""} you`);
    const toggle = (m: Mode, icon: string, label: string) =>
      iconButton(`mode-${m}`, chromeIcon(icon), label, () => setShared("mc.agents.mode", m), {
        active: mode === m,
        size: 24,
        iconSize: 13,
      });

    return v_flex()
      .id("root")
      .size_full()
      .min_h(0)
      .bg(t.chrome)
      .border_t(1)
      .border_color(t.border)
      .text_size(13)
      .on_size_change((size: { height: number }) => {
        const h = Math.round(size.height);
        if (shared(KEYS.agentsHeight) !== h) setShared(KEYS.agentsHeight, h);
      })
      .child(
        sectionHeader(
          "agents-header",
          "Agents",
          model.total,
          open,
          () => setShared(KEYS.agentsFolded, open),
          [
            ...(urgent ? [needsYou] : []),
            ...(open
              ? [
                  toggle("priority", "clock", "Sort by priority"),
                  toggle("spaces", "layers", "Group by space"),
                ]
              : []),
          ],
        ),
      )
      .when(open, (el: El) =>
        el
          .child(
            h_flex().flex_none().h(38).px(10).pb(8).child(searchBox("agent-search", this.search)),
          )
          .child(
            v_flex()
              .id("agent-list")
              .flex_1()
              .min_h(0)
              .px(6)
              .pb(10)
              .gap(1)
              .overflow_y_scrollbar()
              .when(model.total === 0, (e: El) =>
                e.child(
                  div()
                    .px(8)
                    .py(6)
                    .text_size(12)
                    .text_color(t.dim)
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
