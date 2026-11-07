// Exit statuses as a shell would report them.

import assert from "node:assert/strict";
import { test } from "node:test";
import { attempt, capture } from "./exec.ts";

test("exit status passes through", () => {
  assert.equal(capture("sh", ["-c", "exit 3"]).status, 3);
  assert.equal(attempt("sh", ["-c", "exit 0"]), 0);
});

test("a signal death is 128 + n, with a message", () => {
  const res = capture("sh", ["-c", "kill -TERM $$"]);
  assert.equal(res.status, 143);
  assert.match(res.stderr, /killed by SIGTERM/);
});

test("a missing command is 127", () => {
  assert.equal(capture("dots-no-such-command-xyz").status, 127);
});
