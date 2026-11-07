import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { evaluate, sessionActivity } from "./sf-stop-check.ts";

const use = (name: string, input: Record<string, unknown>) =>
  JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name, input }] } });
const edit = (file_path: string) => use("Edit", { file_path });
const bash = (command: string) => use("Bash", { command });

describe("sessionActivity", () => {
  test("edits after the last test run are reported", () => {
    const a = sessionActivity([
      edit("/p/classes/A.cls"),
      bash("sf apex run test --test-level RunLocalTests -o dev"),
      edit("/p/classes/B.cls"),
      edit("/p/lwc/cmp/cmp.js"),
      "not json",
    ]);
    assert.deepEqual(a.apexEdited, ["/p/classes/B.cls"]);
    assert.deepEqual(a.lwcEdited, ["/p/lwc/cmp/cmp.js"]);
  });
  test("test runs clear their own file type only", () => {
    const a = sessionActivity([
      edit("/p/classes/A.cls"),
      edit("/p/lwc/c/c.html"),
      bash("npm run test:unit"),
    ]);
    assert.deepEqual(a.apexEdited, ["/p/classes/A.cls"]);
    assert.deepEqual(a.lwcEdited, []);
  });
  test("validated deploy with tests counts as an Apex test run", () => {
    const a = sessionActivity([
      edit("/p/classes/A.cls"),
      bash("sf project deploy start --dry-run --test-level RunLocalTests"),
    ]);
    assert.deepEqual(a.apexEdited, []);
  });
});

describe("evaluate", () => {
  const proj = mkdtempSync(join(tmpdir(), "sfstop-"));
  writeFileSync(join(proj, "sfdx-project.json"), "{}");

  test("reminds via systemMessage in SFDX projects", () => {
    const out = evaluate({ cwd: proj }, [edit(join(proj, "A.cls"))])!;
    assert.match(String(out.systemMessage), /sf apex run test/);
    assert.equal(out.decision, undefined);
  });
  test("strict profile blocks once", () => {
    process.env.CLAUDE_HOOK_PROFILE = "strict";
    try {
      const out = evaluate({ cwd: proj }, [edit(join(proj, "A.cls"))])!;
      assert.equal(out.decision, "block");
      assert.equal(
        evaluate({ cwd: proj, stop_hook_active: true }, [edit(join(proj, "A.cls"))]),
        null,
      );
    } finally {
      delete process.env.CLAUDE_HOOK_PROFILE;
    }
  });
  test("quiet outside SFDX projects or without SF edits", () => {
    assert.equal(evaluate({ cwd: tmpdir() }, [edit("/x/A.cls")]), null);
    assert.equal(evaluate({ cwd: proj }, [edit(join(proj, "README.md"))]), null);
  });
});
