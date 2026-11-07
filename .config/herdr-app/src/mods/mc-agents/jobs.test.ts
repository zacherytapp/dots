import assert from "node:assert/strict";
import { test } from "node:test";
import type { PaneInfo, Program, SpaceInfo } from "herdr";
import { jobStatus, matchJob, parseJobs, touchesState, type Job } from "./jobs-model.ts";
import { buildModel, liveStatus, titleMark } from "./model.ts";

const claude: Program = {
  key: "claude",
  name: "Claude Code",
  icon: null,
  tint: false,
  tile: null,
  color: null,
  shell: false,
  agent: true,
};
const NOW = Date.parse("2026-11-07T15:40:00Z");

const job = (over: Partial<Job>): Job => ({
  id: "a1",
  machine: null,
  state: "working",
  detail: "",
  name: "Job",
  cwd: "/home/zakk/x",
  sessionId: "s1",
  updated: NOW - 60000,
  tokens: null,
  ...over,
});

test("job records parse from the reader's blocks, skipping a half-written one", () => {
  const out = [
    "\x1e1da3b77f\n",
    JSON.stringify({
      state: "working",
      detail: "Reading  job\nstate",
      name: "Herdr app sidebar replication",
      cwd: "/home/zakk/projects/dots",
      sessionId: "1da3b77f-x",
      updatedAt: "2026-11-07T15:39:17.857Z",
      tokens: 197091,
    }),
    '\n\x1ebroken\n{"state":',
  ].join("");
  const jobs = parseJobs(out, "balberith");
  assert.equal(jobs.length, 1);
  assert.deepEqual(
    { ...jobs[0] },
    {
      id: "1da3b77f",
      machine: "balberith",
      state: "working",
      detail: "Reading job state",
      name: "Herdr app sidebar replication",
      cwd: "/home/zakk/projects/dots",
      sessionId: "1da3b77f-x",
      updated: Date.parse("2026-11-07T15:39:17.857Z"),
      tokens: 197091,
    },
  );
  assert.equal(jobStatus("blocked"), "blocked");
  assert.equal(jobStatus("stopped"), "idle");
});

test("a pane finds its job by folder and title, else the only open job there", () => {
  const jobs = [
    job({ id: "old", name: "Fix login", state: "done", updated: NOW - 9e6 }),
    job({ id: "new", name: "Fix login", state: "blocked" }),
    job({ id: "other", name: "Docs", state: "working" }),
    job({ id: "far", name: "Fix login", machine: "incubus" }),
  ];
  assert.equal(matchJob(jobs, null, "/home/zakk/x", "✳ Fix login", new Set())?.id, "new");
  assert.equal(matchJob(jobs, null, "/home/zakk/x", "something else", new Set()), null);
  assert.equal(matchJob([job({ id: "solo" })], null, "/home/zakk/x", "x", new Set()), null);
  assert.equal(
    matchJob([job({ id: "solo" })], null, "/home/zakk/x", "x", new Set(), true)?.id,
    "solo",
  );
  assert.equal(matchJob(jobs, null, "/elsewhere", "Fix login", new Set()), null);
});

test("an agent pane takes its job's state and detail; unmatched open jobs are listed", () => {
  const space: SpaceInfo = {
    id: "s1",
    index: 1,
    name: "x",
    named: false,
    folder: "",
    machine: null,
    branch: null,
    active: true,
    status: null,
    tabs: [
      {
        id: "tb1",
        index: 1,
        name: "1",
        named: false,
        active: true,
        status: null,
        panes: 1,
        zoomed: false,
        settled: false,
        settled_at: null,
        changed_at: null,
        working_since: null,
      },
    ],
  };
  const pane: PaneInfo = {
    pane: "p1",
    terminal: "t1",
    tab: "tb1",
    title: "✳ Fix login",
    cwd: "/home/zakk/x",
    branch: null,
    status: null,
    app: "claude-code",
    program: claude,
    focused: false,
    zoomed: false,
    movable: false,
  };
  const model = buildModel({
    agents: [],
    terminals: [],
    spaces: [space],
    panes: [pane],
    mode: "priority",
    query: "",
    folded: new Set(["jobs-old"]),
    now: NOW,
    jobs: [
      job({ id: "mine", name: "Fix login", state: "blocked", detail: "Allow git push?" }),
      job({ id: "bg", name: "Background review", state: "working", cwd: "/home/zakk/y" }),
      job({ id: "st", name: "Paused", state: "stopped", cwd: "/home/zakk/z" }),
      job({
        id: "ancient",
        name: "August",
        state: "blocked",
        cwd: "/a",
        updated: NOW - 90 * 86400000,
      }),
      job({ id: "fin", name: "Finished", state: "done", cwd: "/b" }),
    ],
  });
  const row = model.all.find((r) => r.address === "t1");
  assert.equal(row?.status, "blocked");
  assert.equal(row?.detail, "Allow git push?");
  assert.deepEqual(
    model.groups.map((g) => [g.label, g.count]),
    [
      ["Needs you", 1],
      ["Working", 1],
      ["Stopped jobs", 1],
      ["Jobs older than a week", 1],
    ],
  );
  assert.equal(model.groups.at(-1)?.rows.length, 0, "older jobs start folded");
  assert.equal(model.total, 4);
});

test("a new untitled pane can't take the job of a named pane in the same folder", () => {
  const tab = (id: string) => ({
    id,
    index: 1,
    name: "1",
    named: false,
    active: true,
    status: null,
    panes: 1,
    zoomed: false,
    settled: false,
    settled_at: null,
    changed_at: null,
    working_since: null,
  });
  const space: SpaceInfo = {
    id: "s1",
    index: 1,
    name: "dots",
    named: false,
    folder: "",
    machine: null,
    branch: null,
    active: true,
    status: null,
    tabs: [tab("tb1"), tab("tb2")],
  };
  const pane = (terminal: string, tabId: string, title: string): PaneInfo => ({
    pane: `p-${terminal}`,
    terminal,
    tab: tabId,
    title,
    cwd: "/home/zakk/projects/dots",
    branch: null,
    status: null,
    app: "claude-code",
    program: claude,
    focused: false,
    zoomed: false,
    movable: false,
  });
  const model = buildModel({
    agents: [],
    terminals: [],
    spaces: [space],
    // The untitled pane comes first, as it did in the window.
    panes: [
      pane("t20", "tb2", "Claude Code"),
      pane("t16", "tb1", "◐ Herdr app sidebar replication"),
    ],
    mode: "priority",
    query: "",
    folded: new Set(),
    now: NOW,
    jobs: [
      job({
        id: "1da3b77f",
        name: "Herdr app sidebar replication",
        cwd: "/home/zakk/projects/dots",
        state: "working",
        detail: "writing tests",
      }),
    ],
  });
  const mine = model.all.find((r) => r.address === "t16");
  const fresh = model.all.find((r) => r.address === "t20");
  assert.equal(mine?.job?.id, "1da3b77f");
  assert.equal(mine?.status, "working");
  assert.equal(fresh?.job, null);
  assert.equal(fresh?.detail, null);
});

test("a pane finds its job in a subfolder by the terminal's own title, not a renamed tab", () => {
  const jobs = [
    job({ id: "deep", name: "agent-status", cwd: "/home/zakk/dots/mods/agents" }),
    job({ id: "same", name: "agent-status", cwd: "/home/zakk/dots", updated: NOW - 9e6 }),
    job({ id: "sibling", name: "agent-status", cwd: "/home/zakk/dots-old" }),
  ];
  const titles = ["◐ agent-status", "My renamed tab"];
  assert.equal(matchJob(jobs, null, "/home/zakk/dots", titles, new Set())?.id, "same");
  assert.equal(
    matchJob(jobs, null, "/home/zakk/dots", titles, new Set(["same"]))?.id,
    "deep",
    "a job started in a subfolder of the pane's",
  );
  assert.equal(
    matchJob(jobs, null, "/home/zakk/dots", "My renamed tab", new Set()),
    null,
    "the tab's name alone isn't the session",
  );
  assert.equal(
    matchJob([jobs[0]], null, "/home/zakk/dots", "x", new Set(), true),
    null,
    "the only-open-job guess stays in its exact folder",
  );
});

test("a Claude pane's state: waiting for you from its job, working and idle from its title", () => {
  const working = job({ state: "working" });
  const done = job({ state: "done" });
  const blocked = job({ state: "blocked" });
  assert.equal(titleMark("◐ Fix login"), "working");
  assert.equal(titleMark("⠋ Fix login"), "working");
  assert.equal(titleMark("✳ Fix login"), "idle");
  assert.equal(titleMark("Fix login"), null);
  // A permission prompt keeps the spinner; only the job knows it waits for you.
  assert.equal(liveStatus("◐ Fix login", blocked), "blocked");
  // The title changes the instant a turn starts or ends, ahead of the job record.
  assert.equal(liveStatus("◐ Fix login", done), "working");
  assert.equal(liveStatus("✳ Fix login", working), "idle");
  // No mark in the title: the job decides.
  assert.equal(liveStatus("Fix login", working), "working");
  assert.equal(liveStatus("Fix login", null), "idle");
});

test("a pane in a parent folder with a renamed tab takes its job and reads its spinner", () => {
  const space: SpaceInfo = {
    id: "s1",
    index: 1,
    name: "dots",
    named: false,
    folder: "",
    machine: null,
    branch: null,
    active: true,
    status: null,
    tabs: [
      {
        id: "tb1",
        index: 1,
        name: "Sidebar work",
        named: true,
        active: true,
        status: null,
        panes: 1,
        zoomed: false,
        settled: false,
        settled_at: null,
        changed_at: null,
        working_since: null,
      },
    ],
  };
  const pane: PaneInfo = {
    pane: "p1",
    terminal: "t16",
    tab: "tb1",
    title: "◐ agent-status",
    cwd: "/home/zakk/projects/dots",
    branch: null,
    status: null,
    app: "claude-code",
    program: claude,
    focused: false,
    zoomed: false,
    movable: false,
  };
  const model = buildModel({
    agents: [],
    terminals: [],
    spaces: [space],
    panes: [pane],
    mode: "priority",
    query: "",
    folded: new Set(),
    now: NOW,
    jobs: [
      job({
        id: "e51f03bd",
        name: "agent-status",
        cwd: "/home/zakk/projects/dots/.config/herdr-app",
        state: "done",
        detail: "reading main.ts",
      }),
    ],
  });
  const row = model.all.find((r) => r.address === "t16");
  assert.equal(row?.title, "Sidebar work");
  assert.equal(row?.job?.id, "e51f03bd");
  assert.equal(row?.status, "working", "the spinner is ahead of the job record");
  assert.equal(model.total, 1, "the job isn't listed again as a background job");
});

test("only a job's state.json (or a full refresh) triggers a read", () => {
  const root = "/home/zakk/.claude/jobs";
  assert.equal(touchesState([`${root}/e51f03bd/state.json`], root), true);
  assert.equal(
    touchesState([`${root}/e51f03bd/tmp/out.log`, `${root}/x/timeline.jsonl`], root),
    false,
  );
  assert.equal(touchesState([`${root}/`], root), true);
});
