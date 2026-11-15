import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { checkCommand, defaultOrg, evaluate, pushesOrDeploys } from "./sf-cli-guard.ts";

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
    "sf project deploy validate -d force-app -l RunLocalTests -o acme-prod",
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
  test("missing --test-level only matters for production", () => {
    assert.match(warns("sf project deploy start -d force-app -o acme-prod"), /--test-level/);
    assert.equal(warns("sf project deploy start -d force-app -o dev"), "");
  });
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
    const h = run(
      "sf project deploy start -d force-app -l RunLocalTests --ignore-errors -o dev",
    )!.hookSpecificOutput;
    assert.equal(h.permissionDecision, undefined);
    assert.match(h.additionalContext, /ignore-errors/);
  });
  test("non-sf commands are ignored", () => {
    assert.equal(run("ls -la && echo surf"), null);
    assert.equal(evaluate({ tool_name: "Write", tool_input: {} }), null);
  });
});

describe("only sf at command position counts", () => {
  const quiet = [
    `git commit -m "docs: explain sf org delete scratch"`,
    `echo "use sf project deploy quick"`,
    `printf '%s\\n' 'sf data delete bulk --sobject Contact'`,
    `git commit -F - <<'EOF'\nchore: document release\n\nsf package version promote -p pkg@1.0.0-1\nEOF`,
    `cat > notes.md <<EOF\nsf org delete scratch -o tmp\nEOF`,
    `gh pr create --title "x" --body "run sf project deploy quick after merge"`,
    `ls # sf org delete scratch`,
  ];
  for (const cmd of quiet)
    test(`quiet: ${cmd.split("\n")[0]}`, () => assert.deepEqual(check(cmd), []));

  const caught = [
    "sf org delete scratch -o tmp --no-prompt",
    "cd proj && sf org delete scratch -o tmp",
    "SF_LOG_LEVEL=debug sf org delete scratch -o tmp",
    "timeout 60 sf org delete scratch -o tmp",
    "sudo -u ci /usr/local/bin/sf org delete scratch -o tmp",
    `bash -c 'sf org delete scratch -o tmp'`,
    `echo done; sf org delete scratch -o tmp`,
    `echo "$(sf org delete scratch -o tmp)"`,
    "bash <<EOF\nsf org delete scratch -o tmp\nEOF",
    "if true; then sf org delete scratch -o tmp; fi",
  ];
  for (const cmd of caught)
    test(`caught: ${cmd.split("\n")[0]}`, () =>
      assert.ok(asks(cmd).some((f) => /Deletes a Salesforce org/.test(f.message))));
});

describe("deploy validate is check-only", () => {
  test("validate against a sandbox is quiet", () =>
    assert.deepEqual(asks("sf project deploy validate -d force-app -l RunLocalTests -o uat"), []));
  test("validate against production asks", () =>
    assert.match(
      asks("sf project deploy validate -d force-app -l RunLocalTests -o acme-prod")
        .map((f) => f.message)
        .join("\n"),
      /quick-deploy/,
    ));
  test("quick deploy still asks anywhere", () =>
    assert.equal(asks("sf project deploy quick --job-id 0Af000 -o uat").length, 1));
});

describe("pushesOrDeploys", () => {
  test("real pushes and deploys", () => {
    assert.ok(pushesOrDeploys("git push"));
    assert.ok(pushesOrDeploys("git -C repo push origin main"));
    assert.ok(pushesOrDeploys("pnpm check && git push -u origin HEAD"));
    assert.ok(pushesOrDeploys("sf project deploy start -d force-app -o dev"));
  });
  test("mentions, previews and help are not", () => {
    assert.ok(!pushesOrDeploys(`git commit -m "fix lint before git push"`));
    assert.ok(!pushesOrDeploys(`echo "then sf project deploy start"`));
    assert.ok(!pushesOrDeploys("git push --dry-run"));
    assert.ok(!pushesOrDeploys("sf project deploy start --dry-run -o dev"));
    assert.ok(!pushesOrDeploys("git log --oneline"));
  });
});

describe("Code Analyzer gate", () => {
  const git = (cwd: string, ...args: string[]) =>
    execFileSync(
      "git",
      ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...args],
      { cwd, stdio: "ignore" },
    );
  const root = mkdtempSync(join(tmpdir(), "sfca-"));
  const bin = join(root, "bin");
  const repo = join(root, "repo");
  const runs = join(root, "runs");
  mkdirSync(bin);
  mkdirSync(join(repo, "classes"), { recursive: true });
  // A fake `sf code-analyzer run … -f out.json` that reports one critical violation.
  writeFileSync(
    join(bin, "sf"),
    `#!/usr/bin/env node
const fs = require("node:fs");
fs.appendFileSync(${JSON.stringify(runs)}, "x");
const out = process.argv[process.argv.indexOf("-f") + 1];
fs.writeFileSync(out, JSON.stringify({ violations: [{ severity: 1, rule: "ApexCRUDViolation",
  message: "no CRUD check", locations: [{ file: "classes/Foo.cls", startLine: 3 }] }] }));
`,
    { mode: 0o755 },
  );
  writeFileSync(join(repo, "sfdx-project.json"), "{}");
  writeFileSync(join(repo, "classes", "Foo.cls"), "public class Foo {}\n");
  git(repo, "init", "-q");
  git(repo, "add", ".");
  git(repo, "commit", "-q", "--no-verify", "-m", "init");
  writeFileSync(join(repo, "classes", "Foo.cls"), "public class Foo { void f() {} }\n");

  const env = { PATH: process.env.PATH, XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR };
  before(() => {
    process.env.PATH = `${bin}:${process.env.PATH}`;
    process.env.XDG_RUNTIME_DIR = root;
  });
  after(() => {
    process.env.PATH = env.PATH;
    if (env.XDG_RUNTIME_DIR === undefined) delete process.env.XDG_RUNTIME_DIR;
    else process.env.XDG_RUNTIME_DIR = env.XDG_RUNTIME_DIR;
  });
  const run = (command: string) =>
    evaluate({ tool_name: "Bash", tool_input: { command }, cwd: repo }) as Record<
      string,
      any
    > | null;
  const count = () => (existsSync(runs) ? readFileSync(runs, "utf8").length : 0);

  test("a commit message mentioning git push runs nothing", () => {
    assert.equal(run(`git commit -am "fix lint before git push"`), null);
    assert.equal(count(), 0);
  });
  test("git push asks and caches the result per HEAD and file contents", () => {
    const first = run("git push")!.hookSpecificOutput;
    assert.equal(first.permissionDecision, "ask");
    assert.match(first.permissionDecisionReason, /ApexCRUDViolation/);
    assert.equal(count(), 1);
    assert.equal(run("git push")!.hookSpecificOutput.permissionDecision, "ask");
    assert.equal(count(), 1);
    writeFileSync(join(repo, "classes", "Foo.cls"), "public class Foo { void g() {} }\n");
    run("git push");
    assert.equal(count(), 2);
  });
});
