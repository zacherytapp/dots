import assert from "node:assert/strict";
import { test } from "node:test";
import { dayOf, parseListing, parseTail, splitFiles, within } from "./parse.ts";

const entry = {
  path: "/home/zakk/.claude/projects/-home-zakk-projects-dots/abc-123.jsonl",
  mtime: 1000,
  size: 5000,
};
const lines = (...rows: object[]) => rows.map((r) => JSON.stringify(r)).join("\n");

test("titles prefer a name you gave, then the agent's, then the AI title, then the prompt", () => {
  const text = `{"cut-short": tru\n${lines(
    { type: "last-prompt", lastPrompt: "make the sidebar float" },
    { type: "ai-title", aiTitle: "Sidebar float" },
    {
      type: "user",
      cwd: "/home/zakk/projects/dots",
      gitBranch: "main",
      timestamp: "2026-11-07T10:00:00Z",
    },
  )}`;
  const s = parseTail(entry, null, text);
  assert.equal(s.title, "Sidebar float");
  assert.equal(s.id, "abc-123");
  assert.equal(s.cwd, "/home/zakk/projects/dots");
  assert.equal(s.branch, "main");
  assert.equal(s.updated, Date.parse("2026-11-07T10:00:00Z"));
  const named = parseTail(
    entry,
    "incubus",
    lines({ type: "ai-title", aiTitle: "x" }, { type: "custom-title", customTitle: "Mine" }),
  );
  assert.equal(named.title, "Mine");
  assert.equal(named.machine, "incubus");
});

test("command noise is not a title, and the folder falls back to the project folder", () => {
  const s = parseTail(
    entry,
    null,
    lines({ type: "last-prompt", lastPrompt: "<command-name>/clear</command-name>" }),
  );
  assert.equal(s.title, "Untitled session");
  assert.equal(s.cwd, "/home/zakk/projects/dots");
  assert.equal(s.updated, 1000);
  assert.ok(
    parseTail(entry, null, lines({ type: "continued-in", continuedInSessionId: "z" })).continued,
  );
});

test("find and tail output parse", () => {
  assert.deepEqual(parseListing("1762500000.5\t2048\t/a/b.jsonl\nnoise\n"), [
    { path: "/a/b.jsonl", mtime: 1762500000500, size: 2048 },
  ]);
  assert.deepEqual(
    [...splitFiles("\x1e/a.jsonl\n{}\n\x1e/b.jsonl\n")],
    [
      ["/a.jsonl", "{}\n"],
      ["/b.jsonl", ""],
    ],
  );
});

test("a home-level folder matches only itself; a project folder matches inside it", () => {
  assert.ok(within("/home/zakk/projects/dots/src", "/home/zakk/projects/dots"));
  assert.ok(!within("/home/zakk/projects/dots", "/home/zakk"));
  assert.ok(within("/home/zakk", "/home/zakk"));
  assert.ok(!within("/home/zakk/projects/dotsy", "/home/zakk/projects/dots"));
});

test("days group sessions", () => {
  const now = new Date(2026, 10, 7, 15, 0).getTime();
  assert.equal(dayOf(new Date(2026, 10, 7, 9, 0).getTime(), now), "Today");
  assert.equal(dayOf(new Date(2026, 10, 6, 23, 0).getTime(), now), "Yesterday");
  assert.equal(dayOf(new Date(2026, 10, 3, 9, 0).getTime(), now), "This week");
  assert.equal(dayOf(new Date(2026, 9, 1).getTime(), now), "Earlier");
});
