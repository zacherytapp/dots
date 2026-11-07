import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { evaluate, parseAliases, splitTopLevelCommands, type HookContext } from "./safety-hook.ts";

const HOOK = join(import.meta.dirname, "safety-hook.ts");
const root = mkdtempSync(join(tmpdir(), "safety-hook-test-"));
const flags = join(root, "flags");
const home = join(root, "home");
const repo = join(root, "repo");
mkdirSync(flags);
mkdirSync(home);
mkdirSync(repo);
writeFileSync(join(home, ".bashrc"), "alias del='rm'\n");
after(() => rmSync(root, { recursive: true, force: true }));

const baseEnv = {
  PATH: process.env.PATH,
  HOME: home,
  SHELL: "/bin/bash",
  CLAUDE_HOOK_FLAG_DIR: flags,
};

function ctx(cwd = root, env: Record<string, string | undefined> = {}): HookContext {
  return { cwd, env: { ...baseEnv, ...env } };
}

function bashJson(command: string, sessionId = "test-session"): string {
  return JSON.stringify({
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    session_id: sessionId,
    tool_input: { command },
  });
}

function decision(out: Record<string, unknown> | null): string {
  if (!out) return "";
  const specific = out.hookSpecificOutput as Record<string, unknown> | undefined;
  return String(specific?.permissionDecision ?? out.decision ?? "");
}

function assertBash(expected: string, command: string, c = ctx(), sessionId?: string): void {
  assert.equal(decision(evaluate(bashJson(command, sessionId), c)), expected, command);
}

/** Run the real entrypoint the way a host does. */
function runHook(input: string, env: Record<string, string | undefined> = {}, cwd = root) {
  return spawnSync(process.execPath, [HOOK], {
    input,
    cwd,
    encoding: "utf8",
    env: { ...baseEnv, ...env },
  });
}

describe("command recognition", () => {
  const denied = [
    "echo ok && rm scratch.txt",
    "echo ok\nrm scratch.txt",
    "echo $(rm scratch.txt)",
    "echo $(echo $(rm deep.txt))",
    "echo `rm scratch.txt`",
    'for f in a b; do rm "$f"; done',
    "if true; then git add .; fi",
    "if false; then echo; else rm x; fi",
    "(rm scratch.txt)",
    "{ rm scratch.txt; }",
    "! rm scratch.txt",
    "/bin/rm scratch.txt",
    "a || rm b",
    "a | rm b",
    "a & rm b",
    // Each line of a quoted multi-line string is checked too (conservative).
    'git commit -m "line one\nrm stuff"',
    // $(…) is extracted even inside single quotes (conservative).
    "echo '$(rm quoted)'",
  ];
  for (const command of denied)
    test(`denies ${JSON.stringify(command)}`, () => assertBash("deny", command));

  const approved = [
    "if true; then echo ok; fi",
    'echo "safe; rm scratch.txt"',
    "echo safe\\; rm scratch.txt",
    "rmdir x && rmx y",
  ];
  for (const command of approved) {
    test(`approves ${JSON.stringify(command)}`, () => assertBash("approve", command));
  }

  test("expands a first-token alias from the shell rc", () =>
    assertBash("deny", "del scratch.txt"));

  test("loads aliases once per run", () => {
    const c = ctx();
    evaluate(bashJson("ls && pwd && whoami"), c);
    assert.equal(c.aliases?.get("del"), "rm");
  });

  test("splits on separators outside quotes only", () => {
    assert.deepEqual(splitTopLevelCommands("a && b || c; d | e & f"), [
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
    ]);
    assert.deepEqual(splitTopLevelCommands("echo \"x; y\" 'p|q'"), ["echo \"x; y\" 'p|q'"]);
  });

  test("parses bash and zsh alias output", () => {
    const aliases = parseAliases(
      "alias ll='ls -la'\ngaa=\"git add .\"\nx=y\nalias ll='other'\nnoeq\n",
    );
    assert.equal(aliases.get("ll"), "ls -la");
    assert.equal(aliases.get("gaa"), "git add .");
    assert.equal(aliases.get("x"), "y");
    assert.equal(aliases.has("noeq"), false);
  });

  // Wrappers and nested shells are outside the recognizer's supported forms.
  const bypasses = [
    "command rm scratch.txt",
    'bash -c "rm scratch.txt"',
    "printf scratch.txt | xargs rm",
    "sudo git add .",
    "env git add .",
  ];
  for (const command of bypasses) {
    test(`documents bypass ${JSON.stringify(command)}`, () => assertBash("approve", command));
  }
});

describe("environment-file policy", () => {
  const denied = [
    "cat .env.local",
    "printf value > .env",
    "git commit -m x && cat .env",
    "gh pr create --fill; cat .env",
    "CAT .ENV",
    "find . -name '.env*'",
    "sed -i s/a/b/ .env",
    "cat env",
  ];
  for (const command of denied)
    test(`denies ${JSON.stringify(command)}`, () => assertBash("deny", command));

  test("allows .env in a commit message (asks for the commit)", () =>
    assertBash("ask", "git commit -m 'ignore .env files'"));
  test("documents source bypass", () => assertBash("approve", "source .env"));
  test("allows mentions outside file-access commands", () =>
    assertBash("approve", "echo .env && ls .env && cat environment.txt"));
  // Bash-side matching is broader than Read: any *.env or .env* name counts.
  for (const command of ["cat foo.env", "cat .envrc"]) {
    test(`denies ${command}`, () => assertBash("deny", command));
  }

  test("denies Read of .env files", () => {
    for (const file_path of ["/tmp/project/.env", ".ENV.local"]) {
      const out = evaluate(
        JSON.stringify({
          hook_event_name: "PreToolUse",
          tool_name: "Read",
          tool_input: { file_path },
        }),
        ctx(),
      );
      assert.equal(decision(out), "deny", file_path);
    }
  });
  test("allows Read of .envrc", () => {
    const out = evaluate(
      JSON.stringify({ tool_name: "Read", tool_input: { file_path: ".envrc" } }),
      ctx(),
    );
    assert.equal(decision(out), "approve");
  });
});

describe("git policy", () => {
  const denied = [
    "git add .",
    "git -C /tmp add .",
    "git --no-pager add .",
    "git add -A",
    "git add --all",
    "git add ../x",
    "git add *.py",
    "git checkout --force main",
    "git checkout .",
    "git checkout HEAD -- tracked.txt",
    "git restore tracked.txt",
  ];
  for (const command of denied)
    test(`denies ${JSON.stringify(command)}`, () => assertBash("deny", command));

  test("allows staged-only restore", () =>
    assertBash("approve", "git restore --staged tracked.txt"));
  test("allows git add dry runs", () => {
    assertBash("approve", "git add -n .");
    assertBash("approve", "git add --dry-run .");
  });
  test("asks before git commit", () =>
    assertBash("ask", "git commit -m test", ctx(), "ask-session"));
  test("asks before git global option commit", () =>
    assertBash("ask", "git --no-pager commit -m test", ctx(), "ask-session"));

  test("multiple denials are listed together", () => {
    const out = evaluate(bashJson("rm x; git add ."), ctx()) as {
      hookSpecificOutput: { permissionDecisionReason: string };
    };
    assert.match(
      out.hookSpecificOutput.permissionDecisionReason,
      /^Multiple safety checks failed:\n\n1\. .*\n\n2\. BLOCKED/s,
    );
  });

  describe("git commit -a needs a message source", () => {
    const sessionId = "commit-a";
    before(() => writeFileSync(join(flags, `allow-git-commit.${sessionId}`), ""));
    for (const form of ["-a", "--all", "-an", "-a -n", "-a --amend", "-a -- -m"]) {
      test(`denies git commit ${form}`, () =>
        assertBash("deny", `git commit ${form}`, ctx(), sessionId));
    }
    test("dry-run skips the -a check", () =>
      assertBash("approve", "git commit -a --dry-run", ctx(), sessionId));
    const allowed = [
      "-a -m msg",
      "-am msg",
      "--all --message=msg",
      "-a -F msg.txt",
      "-aF msg.txt",
      "-a --file=msg.txt",
      "-a -C HEAD",
      "-a --reuse-message=HEAD",
      "-a -c HEAD",
      "-a --reedit-message=HEAD",
      "--amend -a --no-edit",
      "-na -m msg",
    ];
    for (const form of allowed) {
      test(`allows git commit ${form}`, () =>
        assertBash("approve", `git commit ${form}`, ctx(), sessionId));
    }
  });

  describe("repository state", () => {
    before(() => {
      const git = (...args: string[]) => {
        const res = spawnSync("git", args, { cwd: repo, env: { ...baseEnv } });
        assert.equal(res.status, 0, `git ${args.join(" ")}: ${res.stderr}`);
      };
      git("init", "-q");
      git("config", "user.email", "test@example.com");
      git("config", "user.name", "Test");
      mkdirSync(join(repo, "src"));
      writeFileSync(join(repo, "tracked.txt"), "one\n");
      writeFileSync(join(repo, "src", "a.txt"), "a\n");
      git("add", "tracked.txt", "src");
      git("commit", "-qm", "initial");
    });

    test("allows ordinary checkout in a clean repository", () =>
      assertBash("approve", "git checkout --quiet main", ctx(repo), "git-session"));

    test("asks before staging modified tracked files", () => {
      writeFileSync(join(repo, "tracked.txt"), "two\n");
      assertBash("ask", "git add tracked.txt", ctx(repo), "git-session");
      assertBash("approve", "git checkout --quiet main", ctx(repo), "git-session");
    });

    test("asks before staging a directory with modified files", () => {
      writeFileSync(join(repo, "src", "a.txt"), "aa\n");
      const out = evaluate(bashJson("git add src/", "git-session"), ctx(repo)) as {
        hookSpecificOutput: { permissionDecisionReason: string };
      };
      assert.equal(decision(out), "ask");
      assert.match(out.hookSpecificOutput.permissionDecisionReason, /src\/a\.txt/);
    });

    test("allows staging only untracked files", () => {
      writeFileSync(join(repo, "new.txt"), "n\n");
      assertBash("approve", "git add new.txt", ctx(repo), "git-session");
    });

    test("allows ordinary checkout outside a repository", () =>
      assertBash("approve", "git checkout main", ctx(root), "git-session"));
  });
});

describe(">allow-git session toggles", () => {
  const prompt = (text: string, sessionId = "toggle") =>
    evaluate(
      JSON.stringify({ hook_event_name: "UserPromptSubmit", session_id: sessionId, prompt: text }),
      ctx(),
    );

  test("allow-git commit suppresses the commit prompt", () => {
    assert.equal(decision(prompt(">allow-git commit")), "block");
    assertBash("approve", "git commit -m test", ctx(), "toggle");
  });

  test("status lists active toggles; off restores prompts", () => {
    prompt(">allow-git");
    assert.deepEqual(prompt(">allow-git status"), {
      decision: "block",
      reason: "Active: staging, commit\nUse >allow-git off to restore prompts.",
    });
    prompt(">allow-git off");
    assert.equal(existsSync(join(flags, "allow-git-commit.toggle")), false);
    assertBash("ask", "git commit -m test", ctx(), "toggle");
  });

  test("ignores other prompts and needs a session", () => {
    assert.equal(prompt("please >allow-git"), null);
    assert.equal(prompt(">allow-gitx"), null);
    assert.deepEqual(prompt(">allow-git", ""), {
      decision: "block",
      reason: "No session ID available.",
    });
  });
});

describe("Edit/Write line-count speed bump", () => {
  const write = (content: string, file_path = "short.py", sessionId = "short") =>
    JSON.stringify({
      hook_event_name: "PreToolUse",
      tool_name: "Write",
      session_id: sessionId,
      tool_input: { file_path, content },
    });

  test("allows a short source write", () =>
    assert.equal(decision(evaluate(write("one"), ctx())), "approve"));

  test("ignores non-source files", () =>
    assert.equal(
      decision(evaluate(write("1\n2\n3", "notes.md"), ctx(root, { MAX_FILE_LINES: "1" }))),
      "approve",
    ));

  test("trailing newlines don't count", () =>
    assert.equal(
      decision(evaluate(write("1\n2\n\n\n", "t.py", "trail"), ctx(root, { MAX_FILE_LINES: "2" }))),
      "approve",
    ));

  test("denies an Edit over the limit once, then allows the retry", () => {
    const file = join(root, "long.py");
    writeFileSync(file, "one\ntwo\n");
    const edit = JSON.stringify({
      hook_event_name: "PreToolUse",
      tool_name: "Edit",
      session_id: "edit-length",
      tool_input: { file_path: file, old_string: "two", new_string: "two\nthree" },
    });
    const c = ctx(root, { MAX_FILE_LINES: "2" });
    assert.equal(decision(evaluate(edit, c)), "deny");
    assert.equal(decision(evaluate(edit, c)), "approve");
  });

  test("replace_all multiplies the line delta", () => {
    const file = join(root, "rep.py");
    writeFileSync(file, "x\nx\nx\n");
    const edit = (replace_all: boolean, sessionId: string) =>
      JSON.stringify({
        tool_name: "Edit",
        session_id: sessionId,
        tool_input: { file_path: file, old_string: "x", new_string: "x\ny", replace_all },
      });
    const c = ctx(root, { MAX_FILE_LINES: "5" });
    assert.equal(decision(evaluate(edit(false, "ra1"), c)), "approve"); // 4 lines
    assert.equal(decision(evaluate(edit(true, "ra2"), c)), "deny"); // 6 lines
  });
});

describe("entrypoint", () => {
  test("fails open on invalid or incomplete JSON", () => {
    for (const input of ["{", "{}", "", "null"]) {
      const res = runHook(input);
      assert.equal(res.status, 0);
      assert.deepEqual(JSON.parse(res.stdout), { decision: "approve" }, JSON.stringify(input));
    }
  });

  test("prints nothing for an ordinary prompt", () => {
    const res = runHook(
      JSON.stringify({ hook_event_name: "UserPromptSubmit", session_id: "s", prompt: "hello" }),
    );
    assert.equal(res.status, 0);
    assert.equal(res.stdout, "");
  });

  // Regression: policy messages must never evaluate backticks or substitutions.
  test("commit denial runs no command", () => {
    const bin = join(root, "bin");
    const marker = join(root, "commit-executed");
    mkdirSync(bin, { recursive: true });
    writeFileSync(join(bin, "git"), `#!/bin/sh\ntouch '${marker}'\n`);
    chmodSync(join(bin, "git"), 0o755);
    const res = runHook(bashJson("git commit -a"), { PATH: `${bin}:${process.env.PATH}` });
    assert.equal(res.stderr, "");
    assert.equal(existsSync(marker), false);
    assert.equal(decision(JSON.parse(res.stdout)), "deny");
  });

  test("file-length path runs no command", () => {
    const marker = join(root, "path-executed");
    const input = JSON.stringify({
      hook_event_name: "PreToolUse",
      tool_name: "Write",
      session_id: "length-session",
      tool_input: { file_path: `$(touch ${marker}).py`, content: "one\ntwo" },
    });
    const res = runHook(input, { MAX_FILE_LINES: "1" });
    assert.equal(res.stderr, "");
    assert.equal(existsSync(marker), false);
    assert.equal(decision(JSON.parse(res.stdout)), "deny");
  });
});

// Findings from the port's parity/security review.
describe("hardening", () => {
  test("a session ID with / can't address files outside the flag directory", () => {
    const victim = join(root, "victim.txt");
    writeFileSync(victim, "keep");
    const traversal = `/${"../".repeat(12)}${victim.slice(1)}`;
    assertBash("ask", "git commit -m x", ctx(), traversal);
    const write = JSON.stringify({
      tool_name: "Write",
      session_id: traversal,
      tool_input: { file_path: "x.py", content: "1\n2\n3" },
    });
    const c = ctx(root, { MAX_FILE_LINES: "1" });
    evaluate(write, c);
    evaluate(write, c);
    assert.equal(readFileSync(victim, "utf8"), "keep");
  });

  test("NUL bytes are dropped before matching", () => assertBash("deny", "r\0m x"));

  test("a leading BOM doesn't skip the checks", () =>
    assert.equal(decision(evaluate(`﻿${bashJson("rm x")}`, ctx())), "deny"));

  test("the commit exemption needs a Unicode word boundary", () =>
    assertBash("deny", "git commité cat .env", ctx(), "commit-a"));

  test("negative MAX_FILE_LINES is honored", () => {
    const write = JSON.stringify({
      tool_name: "Write",
      session_id: "neg",
      tool_input: { file_path: "x.py", content: "1" },
    });
    assert.equal(decision(evaluate(write, ctx(root, { MAX_FILE_LINES: "-1" }))), "deny");
  });

  test(".env matching stays fast on crafted input", () => {
    const start = performance.now();
    for (const command of [
      "sed -i ".repeat(4000),
      "cat ".repeat(32000),
      `find ${"-name ".repeat(4000)}`,
      `cat ${".env.env".repeat(2000)}"`,
    ]) {
      evaluate(bashJson(command), ctx());
    }
    assert.ok(performance.now() - start < 2000, `took ${performance.now() - start}ms`);
  });
});

test("hook host wiring", () => {
  const hooks = JSON.parse(readFileSync(join(import.meta.dirname, "hooks.json"), "utf8")) as {
    hooks: Record<string, { hooks: { command: string }[] }[]>;
  };
  const commands = Object.values(hooks.hooks).flatMap((groups) =>
    groups.flatMap((g) => g.hooks.map((h) => h.command)),
  );
  const expected = 'node "${CLAUDE_PLUGIN_ROOT:-$HOME/.agents}/hooks/safety-hook.ts"';
  assert.deepEqual(commands, Array(5).fill(expected));
  assert.ok(statSync(HOOK).mode & 0o100, "safety-hook.ts is executable");
});
