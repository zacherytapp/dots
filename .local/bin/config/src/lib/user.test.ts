// User.preserving with real files, as the current user (isSelf, so no sudo).

import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { User, passwd } from "./user.ts";

const user = new User(passwd(userInfo().username));
const root = mkdtempSync(join(tmpdir(), "user-test-"));
after(() => rmSync(root, { recursive: true, force: true }));

let n = 0;
/** A repo file and a symlink to it, like a stowed dotfile. */
function stowed(content: string): { repo: string; link: string } {
  const dir = join(root, String(n++));
  const repo = `${dir}-repo.json`;
  const link = `${dir}-link.json`;
  writeFileSync(repo, content);
  symlinkSync(repo, link);
  return { repo, link };
}

test("restores content a tool wrote through the link", () => {
  const { repo, link } = stowed("old");
  const out = user.preserving(link, () => {
    writeFileSync(link, "new");
    return 42;
  });
  assert.equal(out, 42);
  assert.equal(readFileSync(repo, "utf8"), "old");
  assert.equal(readlinkSync(link), repo);
});

test("relinks when a tool replaced the link by rename", () => {
  const { repo, link } = stowed("old");
  user.preserving(link, () => {
    writeFileSync(`${link}.tmp`, "new");
    renameSync(`${link}.tmp`, link);
  });
  assert.ok(lstatSync(link).isSymbolicLink());
  assert.equal(readlinkSync(link), repo);
  assert.equal(readFileSync(repo, "utf8"), "old");
});

test("relinks when a tool deleted the link", () => {
  const { repo, link } = stowed("old");
  user.preserving(link, () => rmSync(link));
  assert.equal(readlinkSync(link), repo);
});

test("restores a plain file", () => {
  const file = join(root, `${n++}-plain`);
  writeFileSync(file, "old");
  user.preserving(file, () => writeFileSync(file, "new"));
  assert.equal(readFileSync(file, "utf8"), "old");
  assert.ok(!lstatSync(file).isSymbolicLink());
});

test("leaves a file the tool created", () => {
  const file = join(root, `${n++}-created`);
  user.preserving(file, () => writeFileSync(file, "made"));
  assert.equal(readFileSync(file, "utf8"), "made");
});

test("no-op when nothing changed", () => {
  const { repo, link } = stowed("same");
  user.preserving(link, () => undefined);
  assert.equal(readFileSync(repo, "utf8"), "same");
});

test("restores, then rethrows, when the tool fails", () => {
  const { repo, link } = stowed("old");
  assert.throws(
    () =>
      user.preserving(link, () => {
        writeFileSync(link, "half");
        throw new Error("tool failed");
      }),
    /tool failed/,
  );
  assert.equal(readFileSync(repo, "utf8"), "old");
});

test("the tool's error wins when the restore fails too", { skip: process.getuid?.() === 0 }, () => {
  const { repo, link } = stowed("old");
  assert.throws(
    () =>
      user.preserving(link, () => {
        writeFileSync(link, "half");
        chmodSync(repo, 0o444); // the restore's write now fails
        throw new Error("tool failed");
      }),
    /tool failed/,
  );
  chmodSync(repo, 0o644);
  assert.equal(readFileSync(repo, "utf8"), "half");
  assert.ok(existsSync(link));
});
