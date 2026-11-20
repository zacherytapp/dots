import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { missingSkills, pluginSkillNames } from "./agents.ts";

test("pluginSkillNames takes the skill directory names from the manifest", () => {
  const manifest = JSON.stringify({
    skills: ["./skills/engineering/tdd", "./skills/productivity/grill-me"],
  });
  assert.deepEqual(pluginSkillNames(manifest), ["tdd", "grill-me"]);
  assert.throws(() => pluginSkillNames("{}"));
});

test("missingSkills skips the repo's own skills and earlier installs", () => {
  const root = mkdtempSync(join(tmpdir(), "agents-test-"));
  try {
    const repo = join(root, "repo");
    const home = join(root, "home");
    mkdirSync(join(repo, ".agents", "skills", "to-spec"), { recursive: true });
    mkdirSync(join(home, ".agents", "skills", "tdd"), { recursive: true });
    assert.deepEqual(missingSkills(["to-spec", "tdd", "grill-me"], repo, home), ["grill-me"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
