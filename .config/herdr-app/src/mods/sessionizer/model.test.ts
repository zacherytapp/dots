import assert from "node:assert/strict";
import { test } from "node:test";
import { keyAction, parseRow, spaceNameFor, type Key } from "./model.ts";

const key = (keystroke: string, key_char?: string, control = false): Key => ({
  key: keystroke.split("-").at(-1) ?? keystroke,
  keystroke,
  key_char,
  modifiers: { control },
});

test("rows from the script's output", () => {
  assert.deepEqual(parseRow("~/.claude"), { kind: "dir", path: "~/.claude" });
  assert.deepEqual(parseRow("⇄ studio"), { kind: "machine", machine: "studio" });
  assert.deepEqual(parseRow("+ pi"), { kind: "host", host: "pi" });
  assert.equal(parseRow("  "), null);
});

test("space names match sessionizer-lib.sh", () => {
  const home = "/home/z";
  assert.equal(spaceNameFor("~/.claude", home), "_claude");
  assert.equal(spaceNameFor("~/Projects/bank/", home), "bank");
  assert.equal(spaceNameFor("~/Projects/dots/.config", home), "dots__config");
  assert.equal(spaceNameFor("~/Projects/dots", home), "dots");
});

test("keys move, edit, submit and close", () => {
  assert.deepEqual(keyAction("", key("down")), { type: "move", by: 1 });
  assert.deepEqual(keyAction("", key("ctrl-p", undefined, true)), { type: "move", by: -1 });
  assert.deepEqual(keyAction("ab", key("c", "c")), { type: "edit", query: "abc" });
  assert.deepEqual(keyAction("ab", key("ctrl-c", "c", true)), { type: "close" });
  assert.deepEqual(keyAction("ab", key("ctrl-a", "a", true)), null);
  assert.deepEqual(keyAction("ab", key("backspace")), { type: "edit", query: "a" });
  assert.deepEqual(keyAction("", key("backspace")), { type: "back" });
  assert.deepEqual(keyAction("~/Projects/dots", key("ctrl-w", undefined, true)), {
    type: "edit",
    query: "~/Projects/",
  });
  assert.deepEqual(keyAction("x", key("enter")), { type: "submit" });
});
