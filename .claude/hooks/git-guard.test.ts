import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { evaluate, findBypass, segments, tokenize } from "./git-guard.ts";

describe("blocks hook bypasses", () => {
  const blocked = [
    "git commit --no-verify -m 'wip'",
    "git commit -m 'wip' --no-verify",
    "git commit -n -m wip",
    "git commit -anm 'wip'",
    "git push --no-verify origin main",
    "git merge --no-verify feature",
    "git -C repo commit --no-verify -m x",
    "git -c core.hooksPath=/dev/null commit -m x",
    "HUSKY=0 git commit -m x",
    "SKIP=eslint git commit -m x",
    "/usr/bin/git commit -n -m x",
    "env git push --no-verify",
    "env HUSKY=0 git commit -m x",
    "env -i git commit --no-verify -m x",
    "env GIT_X=1 git commit --no-verify -m x",
    "nice -n 5 git commit --no-verify -m x",
    "sudo -E env SKIP=lint git commit -m x",
  ];
  for (const cmd of blocked) test(cmd, () => assert.ok(findBypass(cmd), cmd));
});

describe("allows normal git", () => {
  const allowed = [
    "git commit -m 'skip with --no-verify next time'",
    "git commit -m wip -- -n",
    "git push -n origin main", // -n is --dry-run for push
    "git commit -am 'update'",
    "git log --no-verify",
    "echo 'git push --no-verify; done'",
    "HUSKY=1 git commit -m x",
    "env GIT_AUTHOR_NAME=x git commit -m x",
    "git commit -m \"$(cat <<'EOF'\nUse --no-verify sparingly\nEOF\n)\"",
  ];
  for (const cmd of allowed) test(cmd, () => assert.equal(findBypass(cmd), null, cmd));
});

describe("helpers", () => {
  test("tokenize handles quotes and escapes", () => {
    assert.deepEqual(tokenize(`git commit -m "a b" 'c d' e\\ f ""`), [
      "git",
      "commit",
      "-m",
      "a b",
      "c d",
      "e f",
      "",
    ]);
  });
  test("segments split only outside quotes", () => {
    assert.deepEqual(
      segments(`a; b "c; d" && e`).map((s) => s.trim()),
      ["a", 'b "c; d"', "e"],
    );
  });
});

describe("hook output", () => {
  test("denies with a reason", () => {
    const out = evaluate({
      tool_name: "Bash",
      tool_input: { command: "git commit --no-verify -m x" },
    }) as Record<string, any>;
    assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
    assert.match(out.hookSpecificOutput.permissionDecisionReason, /skips git hooks/);
  });
  test("ignores other tools", () => {
    assert.equal(
      evaluate({ tool_name: "Write", tool_input: { content: "git commit --no-verify" } }),
      null,
    );
  });
});
