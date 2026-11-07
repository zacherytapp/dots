import assert from "node:assert/strict";
import { test } from "node:test";
import type { PaneInfo, Program, TabInfo } from "herdr";
import { tabLabel } from "./label.ts";

const claude: Program = {
  key: "claude",
  name: "Claude Code",
  icon: "icons/claude.svg",
  tint: false,
  tile: null,
  color: null,
  shell: false,
  agent: true,
};
const zsh: Program = { ...claude, key: "shell", name: "zsh", shell: true, agent: false };
const tab = (over: Partial<TabInfo> = {}): TabInfo => ({
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
  ...over,
});
const pane = (over: Partial<PaneInfo>): PaneInfo => ({
  pane: "p1",
  terminal: "t1",
  tab: "tb1",
  title: "",
  cwd: "/home/zakk/projects/dots",
  branch: "main",
  status: null,
  app: null,
  program: zsh,
  focused: false,
  zoomed: false,
  movable: false,
  ...over,
});

test("an agent's own title names an unnamed tab; folder and branch go beside it", () => {
  const l = tabLabel(
    tab(),
    [pane({ title: "◐ Herdr sidebar", program: claude, branch: "feature" })],
    "/home/zakk",
  );
  assert.equal(l.name, "Herdr sidebar");
  assert.equal(l.detail, "dots · feature");
  assert.equal(l.lead?.program.key, "claude");
});

test("a typed name wins; shells show their program; main is left out", () => {
  assert.equal(
    tabLabel(
      tab({ named: true, name: "deploy" }),
      [pane({ title: "◐ x", program: claude })],
      "/home/zakk",
    ).name,
    "deploy",
  );
  const shell = tabLabel(tab(), [pane({ title: "zakk@host:~/projects/dots" })], "/home/zakk");
  assert.equal(shell.name, "zsh");
  assert.equal(shell.detail, "dots");
});

test("the agent pane leads a split tab and the tooltip lists panes", () => {
  const l = tabLabel(
    tab({ panes: 2 }),
    [pane({ pane: "p0", title: "x" }), pane({ title: "Fix", program: claude })],
    "/home/zakk",
  );
  assert.equal(l.name, "Fix");
  assert.match(l.tooltip, /2 panes/);
});
