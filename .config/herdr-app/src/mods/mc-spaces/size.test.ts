import assert from "node:assert/strict";
import { test } from "node:test";
import { AGENTS_MIN, FIRST_MAX, HEADER, contentHeight, targetHeight } from "./size.ts";

const base = { groups: 0, searching: true, spacesFolded: false, agentsFolded: false };

test("Spaces is exactly as tall as its rows when there is room", () => {
  const want = contentHeight(4, 2, true);
  assert.equal(targetHeight({ ...base, rows: 4, groups: 2, available: 1200 }), want);
});

test("adding spaces pushes Agents down, removing them lets it float back up", () => {
  const three = targetHeight({ ...base, rows: 3, available: 1200 });
  const six = targetHeight({ ...base, rows: 6, available: 1200 });
  assert.ok(six > three);
  assert.equal(targetHeight({ ...base, rows: 3, available: 1200 }), three);
});

test("Spaces stops growing where Agents would have less than its minimum", () => {
  assert.equal(targetHeight({ ...base, rows: 80, available: 900 }), 900 - AGENTS_MIN);
});

test("folded Spaces keeps only its header; folded Agents gives Spaces the rest", () => {
  assert.equal(targetHeight({ ...base, rows: 9, spacesFolded: true, available: 900 }), HEADER);
  assert.equal(
    targetHeight({ ...base, rows: 2, agentsFolded: true, available: 900 }),
    900 - HEADER,
  );
});

test("before Agents reports its height, Spaces is capped", () => {
  assert.equal(targetHeight({ ...base, rows: 80, available: null }), FIRST_MAX);
});
