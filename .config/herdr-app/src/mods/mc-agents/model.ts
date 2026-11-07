// The agents list as data: every agent on every machine. Herdr's `agents()` covers agents in a
// space's tabs; `terminals()` (herdr-core's `hc ls` across connected machines) adds agents
// started outside any space (`hc run --on incubus claude`) and sub-agents. Pure: tests feed it
// plain objects.

import type { AgentInfo, PaneInfo, Program, SpaceInfo, Status } from "herdr";
import { cleanTitle, matches } from "../../shared/util.ts";
import { CLOSED, jobStatus, matchJob, type Job } from "./jobs-model.ts";

/** What `terminals()` gives per core terminal (the fields used here). */
export interface TerminalRecord {
  address: string;
  state?: string;
  status?: string | null;
  cwd?: string | null;
  name?: string | null;
  title?: string | null;
  where?: string | null;
  parent?: string | null;
  agent?: string | null;
  program?: Program | null;
}

export interface Row {
  address: string;
  /** Herdr's pane for it; null outside a space. */
  pane: string | null;
  /** In a Herdr space (agents()), else only a core terminal. */
  native: boolean;
  machine: string | null;
  space: string | null;
  spaceName: string;
  tabName: string;
  title: string;
  status: Status;
  program: Program | null;
  pinned: boolean;
  focused: boolean;
  cwd: string | null;
  depth: number;
  /** Sub-agents under it (all depths). */
  kids: number;
  /** The agent reports no status; it was read from its terminal title or its job. */
  guessed: boolean;
  /** What Claude Code says it is doing now (its job record). */
  detail: string | null;
  /** The Claude Code job behind the row: a pane's session, or a background job without one. */
  job: Job | null;
}

export interface Group {
  id: string;
  label: string;
  /** Colors the label (a theme name). */
  tone: string | null;
  rows: Row[];
  /** Rows in it, also when folded. */
  count: number;
}

export type Mode = "priority" | "spaces";

export const RANK: Record<Status, number> = { blocked: 4, done: 3, working: 2, idle: 1 };
const SECTIONS: { rank: number; label: string; tone: string | null }[] = [
  { rank: 4, label: "Needs you", tone: "blocked" },
  { rank: 3, label: "Done", tone: "done" },
  { rank: 2, label: "Working", tone: "working" },
  { rank: 1, label: "Idle", tone: null },
];

export function machineOf(address: string): string | null {
  const slash = address.indexOf("/");
  return slash > 0 ? address.slice(0, slash) : null;
}

export function normalStatus(s: string | null | undefined): Status {
  if (s === "error") return "blocked";
  return s === "blocked" || s === "done" || s === "working" ? s : "idle";
}

/**
 * The state of an agent that reports none, from its terminal title: Claude Code puts a spinner
 * in front of its title while it works (◐◓◑◒ in current versions, braille in older ones) and a
 * still mark (✳) or nothing when it waits.
 */
export function titleStatus(title: string | null | undefined): Status {
  return titleMark(title) ?? "idle";
}

/** What the title's leading mark says: a spinner (working), a still mark (idle), or nothing. */
export function titleMark(title: string | null | undefined): Status | null {
  const t = title ?? "";
  if (/^\s*[\u25d0-\u25d3\u2800-\u28ff]/.test(t)) return "working";
  return /^\s*\u2733/.test(t) ? "idle" : null;
}

/**
 * The state of a Claude Code pane that reports none to Herdr, from its two live sources. The
 * title changes the instant Claude Code starts or stops, so it decides working vs idle; the job
 * record alone knows Claude Code is waiting for you (a permission prompt or a question keeps the
 * spinner going), so its `blocked` wins. Without a title mark, the job decides.
 */
export function liveStatus(title: string | null | undefined, job: Job | null): Status {
  if (job?.state === "blocked") return "blocked";
  return titleMark(title) ?? (job ? jobStatus(job.state) : "idle");
}

/** A title worth showing: not the program's own name, a path, a prompt or a bare number. */
export function meaningful(
  title: string | null | undefined,
  program: Program | null | undefined,
): string | null {
  const t = cleanTitle(title);
  if (!t || /^\d+$/.test(t) || /^[~/]/.test(t) || t.includes("@")) return null;
  const lower = t.toLowerCase();
  if (
    [program?.name, program?.key, "terminal", "agent", "claude code", "claude"].some(
      (v) => v && lower === v.toLowerCase(),
    )
  )
    return null;
  return t;
}

export interface Input {
  agents: AgentInfo[];
  terminals: TerminalRecord[];
  spaces: SpaceInfo[];
  /** Every pane in every space (panes()): agents that report no status are found here. */
  panes: PaneInfo[];
  mode: Mode;
  query: string;
  /** Folded group ids and parent addresses. */
  folded: Set<string>;
  /** Claude Code job records from every machine (see jobs.ts). */
  jobs?: Job[];
  now?: number;
}

export interface Model {
  groups: Group[];
  /** Herdr agents in display order (for agent.next / agent.prev). */
  order: string[];
  /** Every top-level row, also those in folded groups. */
  all: Row[];
  /** Agents and recent jobs waiting for you (not stopped or week-old jobs). */
  needsYou: number;
  total: number;
}

export function buildModel(input: Input): Model {
  const byAddress = new Map(input.terminals.map((t) => [t.address, t]));
  const spaceById = new Map(input.spaces.map((s) => [s.id, s]));
  const listed = new Set(input.agents.map((a) => a.address));
  /** Each row's terminal title as the program set it: Claude Code's session name and spinner. */
  const rawTitle = new Map<string, string>(input.agents.map((a) => [a.address, a.title]));

  const nativeRows: Row[] = input.agents.map((a) => {
    const space = spaceById.get(a.space);
    const tab = space?.tabs.find((t) => t.id === a.tab);
    const title =
      (tab?.named ? tab.name : null) ??
      meaningful(a.title, a.program) ??
      meaningful(a.tab_name, a.program) ??
      a.program?.name ??
      "Agent";
    return {
      address: a.address,
      pane: a.pane,
      native: true,
      machine: space?.machine ?? machineOf(a.address),
      space: a.space,
      spaceName: a.space_name || space?.name || "",
      tabName: tab?.name ?? a.tab_name,
      title,
      status: normalStatus(a.status),
      program: a.program ?? null,
      pinned: a.pinned,
      focused: a.focused,
      cwd: byAddress.get(a.address)?.cwd ?? null,
      depth: 0,
      kids: 0,
      guessed: false,
      detail: null,
      job: null,
    };
  });

  // Agents that report no status (Claude Code started from a shell, on any machine): Herdr
  // still knows their program, so they are listed with a status read from their title.
  const spaceOfTab = new Map(input.spaces.flatMap((s) => s.tabs.map((t) => [t.id, s] as const)));
  for (const p of input.panes) {
    if (!p.terminal || listed.has(p.terminal) || !(p.program?.agent || p.app)) continue;
    const space = spaceOfTab.get(p.tab);
    const tab = space?.tabs.find((t) => t.id === p.tab);
    listed.add(p.terminal);
    rawTitle.set(p.terminal, p.title);
    nativeRows.push({
      address: p.terminal,
      pane: p.pane,
      native: true,
      machine: space?.machine ?? machineOf(p.terminal),
      space: space?.id ?? null,
      spaceName: space?.name ?? "",
      tabName: tab?.name ?? "",
      title:
        (tab?.named ? tab.name : null) ??
        meaningful(p.title, p.program) ??
        p.program?.name ??
        "Agent",
      status: p.status ? normalStatus(p.status) : titleStatus(p.title),
      program: p.program ?? null,
      pinned: false,
      focused: p.focused,
      cwd: p.cwd ?? byAddress.get(p.terminal)?.cwd ?? null,
      depth: 0,
      kids: 0,
      guessed: !p.status,
      detail: null,
      job: null,
    });
  }

  // Each agent pane's Claude Code job gives its real state and what it is doing.
  const jobs = input.jobs ?? [];
  const now = input.now ?? Date.now();
  const taken = new Set<string>();
  const attach = (r: Row, job: Job | null) => {
    if (!job) return;
    taken.add(job.id);
    r.job = job;
    r.detail = job.detail || null;
    if (r.guessed) r.status = liveStatus(rawTitle.get(r.address), job);
  };
  const titles = (r: Row) => [rawTitle.get(r.address), r.title];
  // By name first, for every pane; then the only open job in a folder, for the only pane left there.
  for (const r of nativeRows) attach(r, matchJob(jobs, r.machine, r.cwd, titles(r), taken));
  const left = nativeRows.filter((r) => !r.job && r.cwd);
  for (const r of left) {
    const alone = left.filter((o) => o.machine === r.machine && o.cwd === r.cwd).length === 1;
    if (alone) attach(r, matchJob(jobs, r.machine, r.cwd, titles(r), taken, true));
  }

  const isAgent = (t: TerminalRecord) =>
    t.state === "live" && (t.program?.agent === true || (t.status != null && t.status !== ""));
  const extraRow = (t: TerminalRecord, depth: number): Row => {
    const [spaceName = "", tabName = ""] = (t.where ?? "").split(" / ");
    return {
      address: t.address,
      pane: null,
      native: false,
      machine: machineOf(t.address),
      space: null,
      spaceName: spaceName.trim(),
      tabName: tabName.trim(),
      title:
        meaningful(t.name, t.program) ??
        meaningful(t.title, t.program) ??
        t.program?.name ??
        t.agent ??
        t.address,
      status: depth > 0 && t.status === "done" ? "idle" : normalStatus(t.status),
      program: t.program ?? null,
      pinned: false,
      focused: false,
      cwd: t.cwd ?? null,
      depth,
      kids: 0,
      guessed: !t.status,
      detail: null,
      job: null,
    };
  };

  // Sub-agents: live terminals whose parent is listed (or itself a sub-agent).
  const children = new Map<string, TerminalRecord[]>();
  for (const t of input.terminals) {
    if (t.parent && t.state === "live" && !listed.has(t.address)) {
      const list = children.get(t.parent) ?? [];
      list.push(t);
      children.set(t.parent, list);
    }
  }
  const tree = (address: string, depth: number, seen: Set<string>): Row[] =>
    (children.get(address) ?? []).flatMap((k) => {
      if (seen.has(k.address)) return [];
      seen.add(k.address);
      return [extraRow(k, depth), ...tree(k.address, depth + 1, seen)];
    });

  const seen = new Set<string>(listed);
  const withKids = (row: Row): Row[] => {
    const kids = tree(row.address, 1, seen);
    row.kids = kids.length;
    // A parent is as urgent as its most urgent sub-agent.
    for (const k of kids) if (RANK[k.status] > RANK[row.status]) row.status = k.status;
    return input.folded.has(row.address) ? [row] : [row, ...kids];
  };

  // Agents outside any space: not listed, not in a pane, not someone's sub-agent.
  const inPane = new Set(input.panes.map((p) => p.terminal).filter(Boolean));
  const outside = input.terminals.filter(
    (t) =>
      isAgent(t) &&
      !listed.has(t.address) &&
      !inPane.has(t.address) &&
      !(t.parent && byAddress.has(t.parent)),
  );

  // Background jobs Claude Code hasn't closed out, not shown by a pane above.
  const claude = nativeRows.find((r) => r.program?.key === "claude")?.program ?? null;
  const shown = new Set(nativeRows.map((r) => r.job).filter(Boolean));
  const jobRow = (j: Job): Row => ({
    address: `job:${j.machine ?? ""}/${j.id}`,
    pane: null,
    native: false,
    machine: j.machine,
    space: null,
    spaceName: j.cwd.split("/").filter(Boolean).pop() ?? "",
    tabName: "",
    title: j.name,
    status: jobStatus(j.state),
    program: claude,
    pinned: false,
    focused: false,
    cwd: j.cwd,
    depth: 0,
    kids: 0,
    guessed: true,
    detail: j.detail || (j.state === "stopped" ? "Stopped" : null),
    job: j,
  });
  const WEEK = 7 * 86400000;
  const openJobs = jobs.filter((j) => !CLOSED.has(j.state) && !shown.has(j));
  const recent = (j: Job) => now - j.updated < WEEK;
  const activeJobs = openJobs.filter((j) => recent(j) && j.state !== "stopped").map(jobRow);
  const stoppedJobs = openJobs.filter((j) => recent(j) && j.state === "stopped").map(jobRow);
  const oldJobs = openJobs.filter((j) => !recent(j)).map(jobRow);

  const keep = (r: Row) =>
    matches(
      input.query,
      r.title,
      r.detail,
      r.spaceName,
      r.tabName,
      r.machine ?? "this computer",
      r.program?.name,
    );
  const native = [
    ...nativeRows.filter(keep),
    ...(input.mode === "priority" ? activeJobs.filter(keep) : []),
  ];
  const extras = outside.map((t) => extraRow(t, 0)).filter(keep);
  const groups: Group[] = [];
  const byUrgency = (a: Row, b: Row) =>
    RANK[b.status] - RANK[a.status] || (b.job?.updated ?? 0) - (a.job?.updated ?? 0);

  const pinned = native.filter((r) => r.pinned);
  if (pinned.length)
    groups.push({ id: "pinned", label: "Pinned", tone: null, rows: pinned, count: 0 });
  const rest = native.filter((r) => !r.pinned);

  if (input.mode === "priority") {
    // Sub-agents decide a parent's urgency before it is placed.
    const expanded = rest.map((r) => withKids(r));
    for (const s of SECTIONS) {
      const mine = expanded.filter((rows) => RANK[rows[0].status] === s.rank).flat();
      if (mine.length)
        groups.push({ id: `rank-${s.rank}`, label: s.label, tone: s.tone, rows: mine, count: 0 });
    }
  } else {
    const order = new Map(input.spaces.map((s, i) => [s.id, i]));
    const bySpace = new Map<string, Row[]>();
    for (const r of [...rest].sort(
      (a, b) => (order.get(a.space ?? "") ?? 1e9) - (order.get(b.space ?? "") ?? 1e9),
    )) {
      const key = r.space ?? "";
      bySpace.set(key, [...(bySpace.get(key) ?? []), ...withKids(r)]);
    }
    for (const [id, rows] of bySpace) {
      const head = rows[0];
      const label = head.machine ? `${head.spaceName} · ${head.machine}` : head.spaceName;
      groups.push({ id: `space-${id}`, label: label || "Space", tone: null, rows, count: 0 });
    }
    const bg = activeJobs.filter(keep).sort(byUrgency);
    if (bg.length)
      groups.push({ id: "jobs", label: "Background jobs", tone: null, rows: bg, count: 0 });
  }
  for (const r of pinned) {
    const i = groups[0].rows.indexOf(r);
    groups[0].rows.splice(i + 1, 0, ...withKids(r).slice(1));
  }
  if (extras.length) {
    const rows = extras.sort((a, b) => RANK[b.status] - RANK[a.status]).flatMap(withKids);
    groups.push({ id: "outside", label: "Outside spaces", tone: null, rows, count: 0 });
  }

  const stopped = stoppedJobs.filter(keep).sort(byUrgency);
  if (stopped.length)
    groups.push({ id: "jobs-stopped", label: "Stopped jobs", tone: null, rows: stopped, count: 0 });
  const old = oldJobs.filter(keep).sort(byUrgency);
  if (old.length)
    groups.push({
      id: "jobs-old",
      label: "Jobs older than a week",
      tone: null,
      rows: old,
      count: 0,
    });

  const all = groups.flatMap((g) => g.rows).filter((r) => r.depth === 0);
  // Folded groups keep their header only.
  for (const g of groups) {
    g.count = g.rows.length;
    if (input.folded.has(g.id)) g.rows = [];
  }

  const order = groups
    .flatMap((g) => g.rows)
    .filter((r) => r.native)
    .map((r) => r.address);
  for (const a of input.agents) if (!order.includes(a.address)) order.push(a.address);
  const stale = new Set([...stoppedJobs, ...oldJobs].map((r) => r.address));
  const needsYou = all.filter((r) => r.status === "blocked" && !stale.has(r.address)).length;
  return {
    groups,
    order,
    all,
    needsYou,
    total: nativeRows.length + outside.length + openJobs.length,
  };
}
