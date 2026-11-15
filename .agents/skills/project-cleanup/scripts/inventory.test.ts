import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { type Inventory, inventory } from "./inventory.ts";

// Isolate git from the user's global config (signing, hooks, default branch).
Object.assign(process.env, {
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
});

let dir: string;
let work: string;
let fakeTmp: string;
let inv: Inventory;

const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: work, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const commit = (file: string, text: string, message = `${file}=${text}`) => {
  fs.writeFileSync(path.join(work, file), text);
  git("add", file);
  git("commit", "-qm", message);
};

before(() => {
  dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "inventory-test-")));
  work = path.join(dir, "work");
  fakeTmp = path.join(dir, "machine-tmp");
  execFileSync("git", ["init", "-q", "--bare", "-b", "main", path.join(dir, "remote.git")]);
  execFileSync("git", ["clone", "-q", path.join(dir, "remote.git"), work], { stdio: "ignore" });
  git("checkout", "-qb", "main");
  fs.writeFileSync(path.join(work, "a.txt"), "a\n");
  git("add", "a.txt");
  commit("s.txt", "a\n", "init");
  git("push", "-q", "-u", "origin", "main");
  git("remote", "set-head", "origin", "main");

  // Merge commit.
  git("checkout", "-qb", "merged");
  commit("m.txt", "m");
  git("push", "-q", "origin", "merged");
  git("checkout", "-q", "main");
  git("merge", "-q", "--no-ff", "-m", "merge merged", "merged");

  // Squash, then main edits the same line again: only the patch-id check can see it.
  git("checkout", "-qb", "squashed");
  commit("s.txt", "x\n");
  commit("s.txt", "b\n");
  git("push", "-q", "origin", "squashed");
  git("checkout", "-q", "main");
  git("merge", "-q", "--squash", "squashed");
  git("commit", "-qm", "squash squashed");
  commit("s.txt", "c\n");

  // Squash with no later conflict: merging the branch into main changes nothing.
  git("checkout", "-qb", "squashone");
  commit("q1.txt", "1");
  commit("q2.txt", "2");
  git("checkout", "-q", "main");
  git("merge", "-q", "--squash", "squashone");
  git("commit", "-qm", "squash squashone");

  // Rebased onto a moved main (cherry-picked, new SHA).
  git("checkout", "-qb", "rebased");
  commit("r.txt", "r");
  git("checkout", "-q", "main");
  commit("o.txt", "o");
  git("cherry-pick", "rebased");

  // Fast-forwarded: only the reflog shows it had its own commits.
  git("checkout", "-qb", "ff");
  commit("f.txt", "f");
  git("checkout", "-q", "main");
  git("merge", "-q", "--ff-only", "ff");

  git("branch", "fresh");

  // Unlanded and partly unpushed.
  git("checkout", "-qb", "feature/wip");
  commit("w.txt", "w");
  git("push", "-q", "-u", "origin", "feature/wip");
  commit("w2.txt", "w2");
  git("checkout", "-q", "main");
  git("push", "-q", "origin", "main");

  fs.appendFileSync(path.join(work, ".git/info/exclude"), ".worktrees/\ntmp/\n");
  git("worktree", "add", "-q", ".worktrees/feature-wip", "feature/wip");
  fs.writeFileSync(path.join(work, ".worktrees/feature-wip/dirty.txt"), "x");
  fs.mkdirSync(path.join(work, ".worktrees/old-thing"));
  fs.mkdirSync(path.join(work, "tmp"));
  fs.writeFileSync(path.join(work, "tmp/log.txt"), "log");
  fs.mkdirSync(path.join(fakeTmp, "feature-wip-logs"), { recursive: true });
  fs.mkdirSync(path.join(fakeTmp, "unrelated"));
  fs.writeFileSync(path.join(work, "a.txt"), "changed\n");
  git("stash", "push", "-qm", "note");

  inv = inventory(work, { tmpDirs: [fakeTmp] });
});

after(() => fs.rmSync(dir, { recursive: true, force: true }));

const branch = (ref: string) => {
  const found = inv.branches.find((b) => b.ref === ref);
  assert.ok(found, `missing ${ref}`);
  return found;
};

test("resolves the base from the remote HEAD", () => {
  assert.equal(inv.base.ref, "origin/main");
  assert.deepEqual(inv.base.local, { name: "main", ahead: 0, behind: 0 });
  assert.ok(branch("refs/heads/main").protected);
  assert.ok(branch("refs/heads/main").current);
  assert.ok(!inv.branches.some((b) => b.ref === "refs/remotes/origin/HEAD"));
});

test("detects every way a branch lands", () => {
  const cases: [string, string, string | null][] = [
    ["refs/heads/merged", "landed", "ancestor"],
    ["refs/remotes/origin/merged", "landed", "ancestor"],
    ["refs/heads/squashed", "landed", "squash"],
    ["refs/remotes/origin/squashed", "landed", "squash"],
    ["refs/heads/squashone", "landed", "merge-tree"],
    ["refs/heads/rebased", "landed", "rebase"],
    ["refs/heads/ff", "landed", "fast-forward"],
    ["refs/heads/fresh", "pointer", null],
    ["refs/heads/feature/wip", "unlanded", null],
    ["refs/remotes/origin/feature/wip", "unlanded", null],
  ];
  for (const [ref, status, via] of cases) {
    const b = branch(ref);
    assert.deepEqual([ref, b.status, b.via], [ref, status, via]);
  }
});

test("reports unpushed commits, worktrees, and leftovers", () => {
  const wip = branch("refs/heads/feature/wip");
  assert.equal(wip.unpushed, 1);
  assert.equal(wip.worktree, path.join(work, ".worktrees/feature-wip"));
  assert.equal(branch("refs/remotes/origin/feature/wip").name, "feature/wip");

  const tree = inv.worktrees.find((w) => w.branch === "feature/wip");
  assert.equal(tree?.dirty, 1);

  const temp = inv.temp.map((t) => [path.relative(dir, t.path), t.kind, t.match]);
  assert.deepEqual(temp.sort(), [
    ["machine-tmp/feature-wip-logs", "machine-temp", "feature-wip"],
    ["work/.worktrees/old-thing", "orphan-worktree", null],
    ["work/tmp/log.txt", "project-scratch", null],
  ]);
  assert.deepEqual(
    inv.stashes.map((s) => s.branch),
    ["main"],
  );
});
