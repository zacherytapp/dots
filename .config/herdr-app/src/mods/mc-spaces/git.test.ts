import assert from "node:assert/strict";
import { test } from "node:test";
import { backoff, describe, parseBatch, parseStatus } from "./git.ts";

test("reads ahead, behind and changes from porcelain v2", () => {
  const s = parseStatus(
    [
      "# branch.oid 0123456789abcdef",
      "# branch.head main",
      "# branch.upstream origin/main",
      "# branch.ab +2 -3",
      "1 .M N... 100644 100644 100644 aaa bbb src/a.ts",
      "2 R. N... 100644 100644 100644 aaa bbb R100 src/b.ts\tsrc/old.ts",
      "u UU N... 100644 100644 100644 100644 aaa bbb ccc src/c.ts",
      "? notes.txt",
      "",
    ].join("\n"),
  );
  assert.deepEqual(s, {
    branch: "main",
    upstream: "origin/main",
    ahead: 2,
    behind: 3,
    changed: 3,
    untracked: 1,
  });
  assert.equal(
    describe(s),
    "3 commits to pull from origin/main\n2 commits to push to origin/main\n3 changed files, not committed\n1 untracked file",
  );
});

test("a branch with no upstream counts the commits no remote has", () => {
  const s = parseStatus("# branch.oid abc\n# branch.head feat/x\n# local.unpushed 4\n");
  assert.equal(s.upstream, null);
  assert.equal(s.ahead, 4);
  assert.equal(s.behind, 0);
  assert.match(describe(s), /4 commits on no remote \(feat\/x has no upstream\)/);
});

test("a clean, synced or detached checkout says nothing", () => {
  const synced = parseStatus(
    "# branch.head main\n# branch.upstream origin/main\n# branch.ab +0 -0\n",
  );
  assert.equal(describe(synced), "");
  const detached = parseStatus("# branch.oid abc\n# branch.head (detached)\n");
  assert.equal(detached.branch, null);
  assert.equal(detached.ahead, 0);
});

test("splits batched output per folder", () => {
  const out = [
    "@@@ 0",
    "# branch.head main",
    "# branch.upstream origin/main",
    "# branch.ab +1 -0",
    "@@@ 1",
    "@@@ 2",
    "# branch.head dev",
    "? a.txt",
    "",
  ].join("\n");
  const r = parseBatch(out, 3);
  assert.equal(r[0]?.ahead, 1);
  assert.equal(r[1], null);
  assert.equal(r[2]?.untracked, 1);
});

test("backs off unreachable machines", () => {
  assert.equal(backoff(0), 0);
  assert.equal(backoff(1), 15000);
  assert.equal(backoff(3), 60000);
  assert.equal(backoff(20), 300000);
});
