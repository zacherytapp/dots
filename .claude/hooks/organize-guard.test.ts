import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { denialReason, type GuardOptions } from "./organize-guard.ts";

const sandbox = mkdtempSync(join(tmpdir(), "organize-guard-"));
after(() => rmSync(sandbox, { recursive: true, force: true }));

const home = join(sandbox, "home");
const app = join(home, "projects", "app");
const dots = join(home, "projects", "dots");
const plain = join(home, "projects", "plain");
const fakeTmp = join(sandbox, "systmp");
for (const dir of [join(app, "src"), dots, plain, join(home, "Projects"), fakeTmp]) {
  mkdirSync(dir, { recursive: true });
}
execFileSync("git", ["init", "-q", app]);
writeFileSync(join(app, "existing.md"), "");

const opts: GuardOptions = {
  bases: [join(home, "projects"), join(home, "Projects")],
  excluded: [dots],
  systemTmp: [fakeTmp],
};

const check = (filePath: string, cwd = app, tool = "Write") =>
  denialReason({ tool_name: tool, tool_input: { file_path: filePath, content: "x" }, cwd }, opts);

describe("project root", () => {
  test("denies loose root file notes.txt", () => {
    assert.match(check(join(app, "notes.txt")) ?? "", /loose files in the project root/);
  });

  for (const name of [
    "CLAUDE.md",
    "vite.config.ts",
    "main.py",
    "Makefile",
    "package.json",
    ".env.example",
    "requirements-dev.txt",
  ]) {
    test(`allows standard root file ${name}`, () => {
      assert.equal(check(join(app, name)), null);
    });
  }

  test("allows overwriting an existing root file", () => {
    assert.equal(check(join(app, "existing.md")), null);
  });

  test("suggests a destination directory", () => {
    assert.match(
      check(join(app, "debug-webhook.sh")) ?? "",
      /Suggested: .*\/tmp\/debug-webhook\.sh/,
    );
    assert.match(check(join(app, "deploy.sh")) ?? "", /Suggested: .*\/scripts\/deploy\.sh/);
    assert.match(check(join(app, "plan.md")) ?? "", /Suggested: .*\/docs\/plan\.md/);
  });

  test("allows files in subdirectories", () => {
    assert.equal(check(join(app, "src", "util.ts")), null);
    assert.equal(check(join(app, "docs", "plan.md")), null);
    assert.equal(check(join(app, "scripts", "deploy.sh")), null);
  });

  test("uses the top-level dir as the root for non-git projects", () => {
    assert.match(check(join(plain, "notes.md"), plain) ?? "", /loose files/);
  });

  test("ignores Edit", () => {
    assert.equal(check(join(app, "x.md"), app, "Edit"), null);
  });
});

describe("scope", () => {
  test("leaves the dotfiles repo alone", () => {
    assert.equal(check(join(dots, "new-notes.md"), dots), null);
  });

  test("leaves paths outside the project dirs alone", () => {
    assert.equal(check(join(home, "elsewhere", "notes.md"), home), null);
  });
});

describe("temp files", () => {
  test("redirects system temp writes into the project's tmp/", () => {
    assert.match(check(join(fakeTmp, "foo.sh")) ?? "", new RegExp(`${join(app, "tmp", "foo.sh")}`));
  });

  test("allows system temp writes from the dotfiles repo", () => {
    assert.equal(check(join(fakeTmp, "foo.sh"), dots), null);
  });

  test("allows tmp/ writes and git-ignores tmp/ locally", () => {
    assert.equal(check(join(app, "tmp", "out.log")), null);
    assert.match(readFileSync(join(app, ".git", "info", "exclude"), "utf8"), /^\/tmp\/$/m);
    execFileSync("git", ["-C", app, "check-ignore", "-q", "tmp/out.log"]); // throws if not ignored
  });
});

describe("organize.allow", () => {
  test("allows root files matching project patterns", () => {
    mkdirSync(join(plain, ".claude"), { recursive: true });
    writeFileSync(join(plain, ".claude", "organize.allow"), "# local\nnotes-*.md\n");
    assert.equal(check(join(plain, "notes-a.md"), plain), null);
    assert.match(check(join(plain, "other.md"), plain) ?? "", /loose files/);
  });

  test("'*' disables the guard", () => {
    writeFileSync(join(plain, ".claude", "organize.allow"), "*\n");
    assert.equal(check(join(plain, "other.md"), plain), null);
    assert.equal(check(join(fakeTmp, "x.sh"), plain), null);
  });
});

describe("review fixes", () => {
  test("conventional root docs need the exact name, not a prefix", () => {
    for (const name of [
      "SECURITY.md",
      "README.zh-CN.md",
      "CHANGELOG.md",
      "LICENSE-MIT",
      "CONTRIBUTING.md",
    ]) {
      assert.equal(check(join(app, name)), null, name);
    }
    for (const name of ["security-review.md", "readme-draft.md", "changelog-notes.md"]) {
      assert.match(check(join(app, name)) ?? "", /loose files/, name);
    }
  });

  test("allows root type declaration files", () => {
    assert.equal(check(join(app, "env.d.ts")), null);
  });
});

describe("harness scratchpad", () => {
  const scratch = join(fakeTmp, "claude-1000", "-home-u-projects-app", "0123-abcd", "scratchpad");

  test("allows the session scratchpad from inside a project", () => {
    assert.equal(check(join(scratch, "notes.md")), null);
    assert.equal(check(join(scratch, "deep", "run.sh")), null);
  });

  test("allows $CLAUDE_SCRATCHPAD wherever it is", () => {
    const custom = join(fakeTmp, "custom-pad");
    const withPad = { ...opts, scratchpads: [custom] };
    const event = (file_path: string) => ({
      tool_name: "Write",
      tool_input: { file_path },
      cwd: app,
    });
    assert.equal(denialReason(event(join(custom, "x.sh")), withPad), null);
    assert.match(
      denialReason(event(join(fakeTmp, "x.sh")), withPad) ?? "",
      /belong inside the repo/,
    );
  });

  test("still redirects other system temp writes", () => {
    assert.match(check(join(fakeTmp, "claude-1000", "x.sh")) ?? "", /belong inside the repo/);
    assert.match(check(join(fakeTmp, "scratchpad", "x.sh")) ?? "", /belong inside the repo/);
    assert.match(check(join(fakeTmp, "claude-1000", "scratchpad-x.sh")) ?? "", /belong inside/);
  });
});

describe("root allowlist", () => {
  for (const name of [
    "vitest.setup.ts",
    "jest.setup.js",
    "gulpfile.js",
    "Gruntfile.js",
    "sw.js",
    "CNAME",
    "humans.txt",
    "ads.txt",
    "security.txt",
    "favicon.ico",
    "favicon.svg",
    "install.sh",
    "setup.sh",
    "bootstrap.sh",
  ]) {
    test(`allows ${name}`, () => assert.equal(check(join(app, name)), null));
  }
  for (const name of ["TODO.md", "PLAN.md", "ARCHITECTURE.md", "install-notes.sh"]) {
    test(`still denies ${name}`, () => assert.match(check(join(app, name)) ?? "", /loose files/));
  }
});

describe("git lookups without spawning", () => {
  const main = join(home, "projects", "main");
  const wt = join(home, "projects", "group", "wt");
  const identity = ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false"];
  execFileSync("git", ["init", "-q", main]);
  execFileSync("git", ["-C", main, ...identity, "commit", "-q", "--allow-empty", "-m", "init"]);
  execFileSync("git", ["-C", main, "worktree", "add", "-q", "--detach", wt]);

  test("a .git file (worktree) marks the project root", () => {
    // The worktree is the root, not group/ (the first dir under ~/projects).
    assert.match(check(join(wt, "notes.md"), wt) ?? "", new RegExp(`project root \\(${wt}\\)`));
  });

  test("a worktree's tmp/ is ignored through the common info/exclude", () => {
    assert.equal(check(join(wt, "tmp", "out.log"), wt), null);
    assert.match(readFileSync(join(main, ".git", "info", "exclude"), "utf8"), /^\/tmp\/$/m);
    execFileSync("git", ["-C", wt, "check-ignore", "-q", "tmp/out.log"]); // throws if not ignored
  });

  test("does not append the exclude rule twice", () => {
    assert.equal(check(join(app, "tmp", "a.log")), null);
    assert.equal(check(join(app, "tmp", "b.log")), null);
    const exclude = readFileSync(join(app, ".git", "info", "exclude"), "utf8");
    assert.equal(exclude.match(/^\/tmp\/$/gm)?.length, 1);
  });
});
