import assert from "node:assert/strict";
import { test } from "node:test";
import { kindOf, mergeBranches, parseLocal, parseLsRemote, parseRemoteRefs } from "./model.ts";

const local = parseLocal(
  [
    "main\torigin/main\t\taaa\t1762500000\tMerge PR",
    "feature\torigin/feature\tahead 2, behind 1\tbbb\t1762510000\tWork in progress",
    "spike\t\t\tccc\t1762400000\tTry\tsomething",
    "old\torigin/old\tgone\tddd\t1762300000\tOld",
  ].join("\n"),
);

test("local branches read upstream, ahead/behind, gone and subjects with tabs", () => {
  assert.equal(local.length, 4);
  assert.deepEqual({ ahead: local[1].ahead, behind: local[1].behind }, { ahead: 2, behind: 1 });
  assert.equal(local[2].subject, "Try\tsomething");
  assert.equal(local[3].gone, true);
  assert.equal(local[0].date, 1762500000000);
});

test("ls-remote heads, and branches merged across local and remote with PRs", () => {
  const heads = parseLsRemote(
    "aaa\trefs/heads/main\nzzz\trefs/heads/feature\neee\trefs/heads/remote-only\nfff\trefs/tags/v1\n",
  );
  assert.deepEqual([...heads.keys()], ["main", "feature", "remote-only"]);
  const tracking = parseRemoteRefs("origin/remote-only\t\t\teee\t1762600000\tFrom someone else");
  const rows = mergeBranches({
    key: "m:/r",
    current: "main",
    local,
    remotes: [{ remote: "origin", heads, web: "https://github.com/z/r/tree/" }],
    tracking,
    prs: new Map([
      [
        "feature",
        { number: 7, title: "Feature", url: "u", draft: false, provider: "github" as const },
      ],
    ]),
  });
  assert.deepEqual(
    rows.map((r) => [r.name, kindOf(r)]),
    [
      ["main", "both"],
      ["feature", "both"],
      ["remote-only", "remote"],
      ["spike", "local"],
      ["old", "local"],
    ],
  );
  assert.equal(rows[0].remotes[0].same, true);
  assert.equal(rows[1].remotes[0].same, false);
  assert.equal(rows[1].pr?.number, 7);
  assert.equal(rows[2].subject, "From someone else");
  assert.equal(rows[2].web, "https://github.com/z/r/tree/remote-only");
  assert.equal(rows[3].web, null);
});
