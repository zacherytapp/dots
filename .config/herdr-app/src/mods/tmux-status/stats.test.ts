import assert from "node:assert/strict";
import { test } from "node:test";
import { batteryIcon, cpuPercent, fahrenheit, parseCpu, readout } from "./stats.ts";

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
  assert.equal(fahrenheit("45000\n"), 113);
  assert.equal(fahrenheit(null), null);
  assert.equal(fahrenheit("junk"), null);
});

test("readout parts and battery icon", () => {
  assert.deepEqual(readout(7, 113, "80\n", "Charging\n"), {
    cpu: 7,
    temp: 113,
    battery: 80,
    charging: true,
  });
  assert.deepEqual(readout(null, null, null, null), {
    cpu: 0,
    temp: null,
    battery: null,
    charging: false,
  });
  assert.equal(batteryIcon(80, false), "battery-full");
  assert.equal(batteryIcon(50, false), "battery-medium");
  assert.equal(batteryIcon(20, false), "battery-low");
  assert.equal(batteryIcon(5, false), "battery-warning");
  assert.equal(batteryIcon(5, true), "battery-charging");
});
