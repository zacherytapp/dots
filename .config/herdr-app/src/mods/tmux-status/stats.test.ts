import assert from "node:assert/strict";
import { test } from "node:test";
import { cpuPercent, fahrenheit, format, parseCpu } from "./stats.ts";

test("cpu percent from two samples", () => {
  const a = parseCpu("cpu  100 0 100 800 5 0 0\ncpu0 1 1 1 1");
  const b = parseCpu("cpu  150 0 150 900 5 0 0");
  assert.deepEqual(a, { idle: 800, total: 1000 });
  assert.equal(cpuPercent(a, b), 50);
  assert.equal(cpuPercent(null, b), null);
  assert.equal(cpuPercent(b, b), null);
  assert.equal(parseCpu("nonsense"), null);
});

test("fahrenheit from millidegrees", () => {
  assert.equal(fahrenheit("45000\n"), "113°F");
  assert.equal(fahrenheit(null), "");
  assert.equal(fahrenheit("junk"), "");
});

test("battery icon and format", () => {
  assert.equal(format(7, "113°F", ""), " 7%  113°F");
  assert.equal(format(null, "", ""), " 0%");
});
