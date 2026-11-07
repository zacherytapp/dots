import assert from "node:assert/strict";
import { test } from "node:test";
import type { AgentInfo, PaneInfo, Program, SpaceInfo } from "herdr";
import { buildModel, titleStatus, type Input, type TerminalRecord } from "./model.ts";
import { parseUsage, shortModel, splitBlocks } from "./usage.ts";

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
const zsh: Program = { ...claude, key: "shell", name: "zsh", shell: true, agent: false };

const tab = (id: string, name = "1") => ({
  id,
  index: 1,
  name,
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
const space = (id: string, name: string, machine: string | null, tabs: string[]): SpaceInfo => ({
  id,
  index: 1,
  name,
  named: false,
  folder: "",
  machine,
  branch: null,
  active: false,
  status: null,
  tabs: tabs.map((t) => tab(t)),
});
const pane = (terminal: string, tabId: string, title: string, program = claude): PaneInfo => ({
  pane: `p-${terminal}`,
  terminal,
  tab: tabId,
  title,
  cwd: "/home/zakk/x",
  branch: null,
  status: null,
  app: program.agent ? "claude-code" : null,
  program,
  focused: false,
  zoomed: false,
  movable: false,
});

function input(over: Partial<Input>): Input {
  return {
    agents: [],
    terminals: [],
    spaces: [],
    panes: [],
    mode: "priority",
    query: "",
    folded: new Set(),
    ...over,
  };
}

test("agents that report no status are listed from their panes, on every machine", () => {
  const spaces = [
    space("s1", "dots", null, ["tb1"]),
    space("balberith/s2", "homelab", "balberith", ["balberith/tb2", "balberith/tb3"]),
  ];
  const panes = [
    pane("t16", "tb1", "◐ Herdr app sidebar replication"),
    pane("balberith/t1", "balberith/tb2", "✳ hermes guardrails"),
    pane("balberith/t2", "balberith/tb3", "zakk@balberith:~", zsh),
  ];
  const model = buildModel(input({ spaces, panes }));
  const rows = model.groups.flatMap((g) => g.rows);
  assert.deepEqual(rows.map((r) => r.address).sort(), ["balberith/t1", "t16"]);
  const working = rows.find((r) => r.address === "t16");
  assert.equal(working?.status, "working");
  assert.equal(working?.title, "Herdr app sidebar replication");
  assert.equal(rows.find((r) => r.address === "balberith/t1")?.machine, "balberith");
  assert.equal(model.total, 2);
});

test("an agent outside every space comes from the core's terminals, once", () => {
  const terminals: TerminalRecord[] = [
    { address: "incubus/t9", state: "live", status: "blocked", program: claude, where: null },
    { address: "t16", state: "live", status: null, program: claude, where: "dots / 1" },
  ];
  const model = buildModel(
    input({
      terminals,
      spaces: [space("s1", "dots", null, ["tb1"])],
      panes: [pane("t16", "tb1", "x")],
    }),
  );
  const outside = model.groups.find((g) => g.id === "outside");
  assert.deepEqual(
    outside?.rows.map((r) => r.address),
    ["incubus/t9"],
  );
  assert.equal(outside?.rows[0].status, "blocked");
});

test("priority groups follow urgency and a folded group keeps its count", () => {
  const spaces = [space("s1", "dots", null, ["tb1", "tb2"])];
  const agents = [
    {
      address: "t1",
      pane: "p1",
      space: "s1",
      space_name: "dots",
      tab: "tb1",
      tab_index: 1,
      tab_name: "1",
      status: "idle",
      app: "claude-code",
      program: claude,
      title: "a",
      seq: 1,
      pinned: false,
      focused: false,
    },
    {
      address: "t2",
      pane: "p2",
      space: "s1",
      space_name: "dots",
      tab: "tb2",
      tab_index: 2,
      tab_name: "2",
      status: "blocked",
      app: "claude-code",
      program: claude,
      title: "b",
      seq: 2,
      pinned: false,
      focused: false,
    },
  ] as AgentInfo[];
  const model = buildModel(input({ agents, spaces, folded: new Set(["rank-1"]) }));
  assert.deepEqual(
    model.groups.map((g) => g.label),
    ["Needs you", "Idle"],
  );
  assert.equal(model.groups[1].count, 1);
  assert.equal(model.groups[1].rows.length, 0);
  assert.deepEqual(model.order, ["t2", "t1"]);
});

test("titleStatus reads Claude Code's spinners", () => {
  assert.equal(titleStatus("◐ Fix login"), "working");
  assert.equal(titleStatus("⠋ Fix login"), "working");
  assert.equal(titleStatus("✳ Fix login"), "idle");
  assert.equal(titleStatus("claude agents"), "idle");
});

test("context comes from the last assistant line, whole or cut short", () => {
  const line = JSON.stringify({
    type: "assistant",
    message: {
      model: "claude-opus-5-5",
      usage: {
        input_tokens: 2,
        cache_creation_input_tokens: 1234,
        cache_read_input_tokens: 203855,
        output_tokens: 598,
      },
    },
    effort: "xhigh",
    perTurnEffort: "xhigh",
    sessionId: "s1",
  });
  assert.deepEqual(parseUsage(line), {
    tokens: 205091,
    model: "claude-opus-5-5",
    effort: "xhigh",
  });
  assert.equal(parseUsage(line.slice(0, -10))?.tokens, 205091);
  assert.equal(parseUsage(line.slice(0, -10))?.effort, "xhigh", "a cut line still names it");
  const older = JSON.stringify({ type: "assistant", message: { usage: { input_tokens: 5 } } });
  assert.equal(parseUsage(older)?.effort, null, "versions that don't record it show none");
  assert.equal(parseUsage('{"type":"user"}'), null);
  assert.equal(shortModel("claude-opus-5-5"), "opus 5.5");
  assert.deepEqual(
    [...splitBlocks("\x1ea\nline1\n\x1eb\nline2\n")],
    [
      ["a", "line1\n"],
      ["b", "line2\n"],
    ],
  );
});
