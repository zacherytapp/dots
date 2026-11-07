import assert from "node:assert/strict";
import { test } from "node:test";
import type { BoardItem } from "./board-model.ts";
import {
  attachWork,
  branchNames,
  pullNames,
  refOf,
  type RemotePull,
  type RepoWork,
} from "./work-model.ts";

const card = (over: Partial<BoardItem>): BoardItem => ({
  id: "github:o/r#307",
  key: "#307",
  title: "t",
  url: "",
  column: "todo",
  status: "Open",
  where: "o/r",
  updated: 0,
  repo: "o/r",
  tabName: "r#307",
  task: "",
  ...over,
});

const pull = (over: Partial<RemotePull>): RemotePull => ({
  number: 1,
  title: "",
  url: "https://example/pull/1",
  draft: false,
  head: "unrelated",
  body: "",
  ...over,
});

test("refOf reads issue numbers and Jira keys", () => {
  assert.deepEqual(refOf(card({ key: "#12" })), { number: 12 });
  assert.deepEqual(refOf(card({ key: "WEB-142" })), { key: "WEB-142" });
  assert.equal(refOf(card({ key: "weird" })), null);
});

test("branchNames matches the number as a whole segment only", () => {
  const ref = { number: 307 };
  for (const name of [
    "feat/307-gbfb-redesign",
    "307",
    "fix_307",
    "issue-307",
    "gh-307",
    "issue307",
  ])
    assert.ok(branchNames(name, ref), name);
  for (const name of ["feat/3070-x", "v1.307", "release-1307", "main", "fix/30-7"])
    assert.ok(!branchNames(name, ref), name);
  assert.ok(branchNames("web-142-login", { key: "WEB-142" }));
  assert.ok(branchNames("feature/WEB-142", { key: "WEB-142" }));
  assert.ok(!branchNames("WEB-1420-x", { key: "WEB-142" }));
  assert.ok(!branchNames("XWEB-142", { key: "WEB-142" }));
});

test("pullNames uses the head branch, then #N or the key in title and body", () => {
  const ref = { number: 12 };
  assert.ok(pullNames(pull({ head: "fix/12-login" }), ref));
  assert.ok(pullNames(pull({ body: "Closes #12." }), ref));
  assert.ok(pullNames(pull({ title: "Fix login (#12)" }), ref));
  assert.ok(!pullNames(pull({ body: "Closes #123" }), ref));
  assert.ok(!pullNames(pull({ body: "see other/repo#12" }), ref));
  assert.ok(!pullNames(pull({ body: "&#12;" }), ref));
  assert.ok(pullNames(pull({ title: "WEB-142: login" }), { key: "WEB-142" }));
});

test("attachWork adds branches and PRs, folding a PR's head branch into the PR", () => {
  const work = new Map<string, RepoWork>([
    [
      "o/r",
      {
        branches: [
          { name: "feat/307-redesign", url: "b1" },
          { name: "spike/307", url: "b2" },
          { name: "main", url: "b3" },
        ],
        pulls: [
          pull({ number: 5, head: "feat/307-redesign", title: "Redesign" }),
          pull({ number: 6, body: "Part of #307", draft: true }),
          pull({ number: 7, body: "Unrelated" }),
        ],
      },
    ],
  ]);
  const [a] = attachWork([card({ repo: "O/R" })], work);
  assert.deepEqual(
    a.pulls?.map((p) => [p.number, p.draft]),
    [
      [5, false],
      [6, true],
    ],
  );
  assert.deepEqual(
    a.branches?.map((b) => b.name),
    ["spike/307"],
  );
});

test("attachWork keeps the tracker's own links and leaves unknown repos alone", () => {
  const linked = { number: 9, title: "Linked", url: "u", draft: false };
  const [kept] = attachWork([card({ pulls: [linked] })], new Map());
  assert.deepEqual(kept.pulls, [linked]);
  assert.equal(kept.branches, undefined);
  const [merged] = attachWork(
    [card({ pulls: [linked] })],
    new Map([["o/r", { branches: [], pulls: [pull({ number: 9, body: "#307" })] }]]),
  );
  assert.equal(merged.pulls?.length, 1);
  assert.deepEqual(merged.branches, []);
});
