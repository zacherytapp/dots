import assert from "node:assert/strict";
import test from "node:test";
import { sameReadings, type Reading } from "./usage.ts";

const r = (tokens: number): Reading => ({ tokens, model: "m", effort: null, at: Date.now() });

test("sameReadings ignores the read time", () => {
  assert.ok(sameReadings(new Map([["a", r(1)]]), new Map([["a", { ...r(1), at: 0 }]])));
  assert.ok(!sameReadings(new Map([["a", r(1)]]), new Map([["a", r(2)]])));
  assert.ok(!sameReadings(new Map(), new Map([["a", r(1)]])));
});
