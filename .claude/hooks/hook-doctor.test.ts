import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { commandNeeds, diagnose, duplicateScripts, evaluate, hookCommands } from "./hook-doctor.ts";
import type { DoctorOptions } from "./hook-doctor.ts";

/** A fake machine: $HOME, a bin dir holding the named programs, and a project dir. */
function machine(programs: string[], hookCmds: string[] = []) {
  const root = mkdtempSync(join(tmpdir(), "hook-doctor-"));
  const home = join(root, "home");
  const bin = join(root, "bin");
  const project = join(root, "project");
  for (const dir of [join(home, ".claude", "hooks"), bin, project])
    mkdirSync(dir, { recursive: true });
  for (const p of programs) {
    writeFileSync(join(bin, p), "#!/bin/sh\n");
    chmodSync(join(bin, p), 0o755);
  }
  writeFileSync(
    join(home, ".claude", "settings.json"),
    JSON.stringify({
      hooks: {
        PreToolUse: [
          { matcher: "^Bash$", hooks: hookCmds.map((command) => ({ type: "command", command })) },
        ],
      },
    }),
  );
  const opts: DoctorOptions = { home, env: { PATH: bin }, hasImportMetaMain: true };
  return { home, bin, project, opts };
}

describe("helpers", () => {
  test("commandNeeds reads program and script", () => {
    assert.deepEqual(commandNeeds("node $HOME/.claude/hooks/x.ts", "/h"), {
      program: "node",
      script: "/h/.claude/hooks/x.ts",
    });
    assert.deepEqual(
      commandNeeds('NODE_COMPILE_CACHE=$HOME/.cache/c node "$HOME/a.ts" || echo x', "/h"),
      {
        program: "node",
        script: "/h/a.ts",
      },
    );
    assert.deepEqual(commandNeeds("bash -c 'echo hi.there'", "/h"), {
      program: "bash",
      script: null,
    });
    assert.deepEqual(commandNeeds("notify-send done", "/h"), {
      program: "notify-send",
      script: null,
    });
  });
  test("hookCommands walks every event and group", () => {
    const cmds = hookCommands({
      hooks: {
        Stop: [
          {
            hooks: [
              { type: "command", command: "a" },
              { type: "prompt", prompt: "p" },
            ],
          },
        ],
        SessionStart: [{ matcher: "startup", hooks: [{ type: "command", command: "b" }] }],
      },
    });
    assert.deepEqual(cmds, ["a", "b"]);
  });
  test("duplicateScripts spots a reinstall's hard-coded copy of a portable entry", () => {
    const hook = (command: string) => ({ type: "command", command });
    const settings = (...events: Array<[string, string]>) => ({
      hooks: Object.fromEntries(events.map(([ev, cmd]) => [ev, [{ hooks: [hook(cmd)] }]])),
    });
    const portable = 'bash "$HOME/.claude/hooks/herdr-agent-state.sh" session || true';
    const herdr = "bash '/h/.claude/hooks/herdr-agent-state.sh' session";
    assert.deepEqual(
      duplicateScripts(
        { hooks: { SessionStart: [{ hooks: [hook(portable)] }, { hooks: [hook(herdr)] }] } },
        "/h",
      ),
      ["SessionStart /h/.claude/hooks/herdr-agent-state.sh"],
    );
    // the same script under different events, or one entry alone, is fine
    assert.deepEqual(
      duplicateScripts(settings(["SessionStart", portable], ["Stop", herdr]), "/h"),
      [],
    );
    assert.deepEqual(duplicateScripts(settings(["SessionStart", portable]), "/h"), []);
  });
});

describe("diagnose", () => {
  test("healthy machine is silent", () => {
    const m = machine(["git", "node"], ["node $HOME/.claude/hooks/bash-guard.ts"]);
    writeFileSync(join(m.home, ".claude", "hooks", "bash-guard.ts"), "");
    assert.equal(evaluate({ cwd: m.project }, m.opts), null);
  });
  test("missing node is a required problem", () => {
    const m = machine(["git"], ["node $HOME/.claude/hooks/bash-guard.ts"]);
    const out = evaluate({ cwd: m.project }, m.opts)!;
    assert.match(String(out.systemMessage), /not running[\s\S]*`node` is not on PATH/);
  });
  test("missing hook script is reported", () => {
    const m = machine(
      ["git", "bash"],
      ["bash '/home/someone-else/.claude/hooks/herdr.sh' session"],
    );
    const p = diagnose({ cwd: m.project }, m.opts);
    assert.match(p[0]!.message, /herdr\.sh is missing/);
  });
  test("optional `|| true` commands are skipped", () => {
    const m = machine(["git"], ["python3 $HOME/missing/pulse.py idle 2>/dev/null || true"]);
    assert.deepEqual(diagnose({ cwd: m.project }, m.opts), []);
  });
  test("missing git", () => {
    const m = machine([]);
    assert.match(diagnose({ cwd: m.project }, m.opts)[0]!.message, /`git` is not on PATH/);
  });
  test("old Node without import.meta.main", () => {
    const m = machine(["git"]);
    const p = diagnose({ cwd: m.project }, { ...m.opts, hasImportMetaMain: false });
    assert.match(p[0]!.message, /import\.meta\.main/);
  });
  test("Salesforce project without sf or Code Analyzer", () => {
    const m = machine(["git"]);
    writeFileSync(join(m.project, "sfdx-project.json"), "{}");
    assert.match(diagnose({ cwd: m.project }, m.opts)[0]!.message, /`sf` CLI is not on PATH/);

    const withSf = machine(["git", "sf"]);
    writeFileSync(join(withSf.project, "sfdx-project.json"), "{}");
    mkdirSync(join(withSf.home, ".local", "share", "sf"), { recursive: true });
    const manifest = join(withSf.home, ".local", "share", "sf", "package.json");
    writeFileSync(manifest, JSON.stringify({ dependencies: {} }));
    const out = evaluate({ cwd: withSf.project }, withSf.opts)!;
    assert.match(String(out.systemMessage), /limited[\s\S]*Code Analyzer plugin/);
    writeFileSync(
      manifest,
      JSON.stringify({ dependencies: { "@salesforce/plugin-code-analyzer": "5" } }),
    );
    assert.equal(evaluate({ cwd: withSf.project }, withSf.opts), null);
  });
});
