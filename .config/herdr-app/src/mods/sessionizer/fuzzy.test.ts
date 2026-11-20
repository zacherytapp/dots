import assert from "node:assert/strict";
import { test } from "node:test";
import { fuzzyFilter, fuzzyMatch, segments } from "./fuzzy.ts";

const DIRS = [
  "~/.config/nvim",
  "~/Projects/dots",
  "~/Projects/dots/.config",
  "~/.claude/hooks",
  "~/.agents/skills",
  "~/Projects/bank",
];

test("every term must match as a subsequence", () => {
  assert.equal(fuzzyMatch("~/.claude/hooks", "clhk")?.positions.length, 4);
  assert.equal(fuzzyMatch("~/.claude/hooks", "zz"), null);
  assert.equal(fuzzyMatch("~/.claude/hooks", "claude zz"), null);
  assert.ok(fuzzyMatch("~/.claude/hooks", "hooks claude"));
});

test("an empty query keeps every candidate in order", () => {
  assert.deepEqual(
    fuzzyFilter(DIRS, "  ").map((m) => m.text),
    DIRS,
  );
});

test("last-segment and word-start matches rank first", () => {
  assert.equal(fuzzyFilter(DIRS, "dots")[0].text, "~/Projects/dots");
  assert.equal(fuzzyFilter(DIRS, "skills")[0].text, "~/.agents/skills");
  assert.equal(fuzzyFilter(DIRS, "nvim")[0].text, "~/.config/nvim");
});

test("a capital makes a term case-sensitive", () => {
  assert.ok(fuzzyMatch("~/Projects/bank", "P"));
  assert.equal(fuzzyMatch("~/projects/bank", "P"), null);
});

test("segments mark matched runs", () => {
  assert.deepEqual(segments("abcd", [1, 2]), [
    { text: "a", hit: false },
    { text: "bc", hit: true },
    { text: "d", hit: false },
  ]);
});
