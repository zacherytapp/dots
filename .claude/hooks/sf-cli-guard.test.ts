import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { checkCommand, defaultOrg, evaluate } from "./sf-cli-guard.ts";

const empty = mkdtempSync(join(tmpdir(), "sfcli-"));
const check = (cmd: string, cwd = empty, home = empty) => checkCommand(cmd, cwd, home);
const asks = (cmd: string) => check(cmd).filter((f) => f.level === "ask");
const warns = (cmd: string) =>
  check(cmd)
    .filter((f) => f.level === "warn")
    .map((f) => f.message)
    .join("\n");

describe("deprecations", () => {
  test("mapped sfdx command", () =>
    assert.match(warns("sfdx force:source:push -u dev"), /sf project deploy start/));
  test("unmapped sfdx command", () =>
    assert.match(warns("sfdx force:limits:api:display"), /retired sfdx/));
  test("modern sf is quiet", () => assert.deepEqual(check("sf org list"), []));
});

describe("production targeting", () => {
  test("mutating command against prod asks", () => {
    assert.equal(
      asks("sf project deploy start -d force-app --test-level RunLocalTests --target-org acme-prod")
        .length,
      1,
    );
    assert.equal(asks("sf apex run --file fix.apex -o production").length, 1);
    assert.equal(asks("sf data delete record -s Account -i 001x -o prd").length, 1);
  });
  test("read-only command against prod warns", () => {
    assert.deepEqual(asks("sf data query -q 'SELECT Id FROM Account' -o acme-prod"), []);
    assert.match(warns("sf data query -q 'SELECT Id FROM Account' -o acme-prod"), /PRODUCTION/);
    assert.deepEqual(asks("sf apex run test -o prod --test-level RunLocalTests"), []);
  });
  test("aliases that merely contain 'prod' are not production", () => {
    assert.deepEqual(
      check("sf project deploy start -o product-dev --test-level RunLocalTests"),
      [],
    );
  });
  test("default target-org from .sf/config.json", () => {
    const proj = mkdtempSync(join(tmpdir(), "sfcli-"));
    mkdirSync(join(proj, ".sf"));
    writeFileSync(join(proj, ".sf", "config.json"), JSON.stringify({ "target-org": "corp-prod" }));
    assert.equal(defaultOrg(join(proj), empty), "corp-prod");
    const f = check("sf project deploy start --test-level RunLocalTests", proj);
    assert.equal(f.filter((x) => x.level === "ask").length, 1);
    assert.match(f[0]!.message, /default target-org "corp-prod"/);
  });
});

describe("destructive operations ask", () => {
  for (const cmd of [
    "sf org delete scratch -o tmp --no-prompt",
    "sf data delete bulk --sobject Contact --file ids.csv -o dev",
    "sf project delete source -m ApexClass:Foo -o dev",
    "sf project deploy start --post-destructive-changes destructiveChanges.xml -x package.xml --test-level RunLocalTests -o dev",
    "sf project deploy start -c -l RunLocalTests -o dev",
    "sf project retrieve start --ignore-conflicts -m ApexClass:Foo -o dev",
    "sf project deploy validate -d force-app -l RunLocalTests -o uat",
    "sf project deploy quick --job-id 0Af000 -o uat",
    "sf package version promote -p pkg@1.2.0-1",
  ]) {
    test(cmd, () => assert.ok(asks(cmd).length >= 1));
  }
});

describe("Dev Hub targeting", () => {
  const proj = mkdtempSync(join(tmpdir(), "sfcli-"));
  mkdirSync(join(proj, ".sf"));
  writeFileSync(join(proj, ".sf", "config.json"), JSON.stringify({ "target-dev-hub": "hub" }));
  test("mutating the Dev Hub asks", () =>
    assert.match(
      check("sf project deploy start -d force-app -l RunLocalTests -o hub", proj)[0]!.message,
      /Dev Hub/,
    ));
  test("creating a scratch org from the Dev Hub is quiet", () =>
    assert.deepEqual(
      check("sf org create scratch -f def.json --target-dev-hub hub -a s1", proj),
      [],
    ));
});

describe("deploy hygiene warnings", () => {
  test("missing --test-level", () =>
    assert.match(warns("sf project deploy start -d force-app -o dev"), /--test-level/));
  test("dry run skips the test-level warning", () =>
    assert.equal(warns("sf project deploy start --dry-run -o dev"), ""));
  test("data import without plan", () =>
    assert.match(warns("sf data import tree --files a.json -o dev"), /--plan/));
  test("package version without coverage", () => {
    assert.match(
      warns("sf package version create -p pkg --installation-key-bypass"),
      /code-coverage/,
    );
    assert.equal(warns("sf package version create -p pkg --code-coverage"), "");
  });
});

describe("hook output", () => {
  const run = (command: string) =>
    evaluate({ tool_name: "Bash", tool_input: { command }, cwd: empty }) as Record<
      string,
      any
    > | null;
  test("ask carries warnings too", () => {
    const h = run("sfdx force:source:deploy -p force-app -u acme-prod")!.hookSpecificOutput;
    assert.equal(h.permissionDecision, "ask");
    assert.match(h.permissionDecisionReason, /PRODUCTION/);
    assert.match(h.permissionDecisionReason, /sf project deploy start/);
  });
  test("warnings only become context", () => {
    const h = run("sf project deploy start -d force-app -o dev")!.hookSpecificOutput;
    assert.equal(h.permissionDecision, undefined);
    assert.match(h.additionalContext, /test-level/);
  });
  test("non-sf commands are ignored", () => {
    assert.equal(run("ls -la && echo surf"), null);
    assert.equal(evaluate({ tool_name: "Write", tool_input: {} }), null);
  });
});
