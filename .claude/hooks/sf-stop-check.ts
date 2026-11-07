#!/usr/bin/env node
/**
 * Stop hook for Salesforce projects. TypeScript port and merge of the
 * salesforce-claude-code `stop-hook.js` and `check-console-log.js`.
 *
 * Upstream printed a reminder about every uncommitted Apex/LWC file on every
 * stop, to stdout where nobody saw it. This version reads the session
 * transcript and only speaks up when Claude edited Apex or LWC source *this
 * session* without running tests afterwards:
 *
 *  - Apex edited after the last `sf apex run test` (or a deploy that runs
 *    tests / validates) → reminder to run Apex tests.
 *  - LWC edited after the last Jest run (`sfdx-lwc-jest`, `test:unit`, `jest`)
 *    → reminder to run LWC tests.
 *  - console.log left in changed LWC/Aura JS files.
 *
 * Default (standard profile): a notice to the user via systemMessage.
 * Strict profile: blocks the stop once (stop_hook_active guard) so Claude
 * runs the tests or explains why not.
 *
 * Only runs inside an SFDX project. Disable with
 * CLAUDE_DISABLED_HOOKS=sf-stop-check. Fails open.
 */

import { spawnSync } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { currentProfile, isRecord, runHook, str } from "./lib/hook-io.ts";
import type { HookEvent, HookOutput } from "./lib/hook-io.ts";

export const ID = "sf-stop-check";

const APEX_FILE = /\.(?:cls|trigger)$/i;
const LWC_FILE = /[\\/](?:lwc|aura)[\\/].+\.(?:js|html|css)$/i;
const APEX_TEST =
  /\bsf\s+apex\s+run\s+test\b|\bsfdx\s+force:apex:test:run\b|\bsf\s+project\s+deploy\s+(?:start|validate)\b[^\n]*--test-level\s+Run(?:Local|Specified|All)/i;
const JEST_TEST =
  /\bsfdx-lwc-jest\b|\btest:unit\b|\bjest\b|\b(?:npm|pnpm|yarn)\s+(?:run\s+)?test\b/i;
const MAX_TRANSCRIPT = 20 * 1024 * 1024;

function findProjectRoot(start: string): string | null {
  let dir = start;
  for (let i = 0; i < 25; i++) {
    if (existsSync(join(dir, "sfdx-project.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

export interface SessionActivity {
  apexEdited: string[];
  lwcEdited: string[];
}

/**
 * Walk the transcript in order and return SF files edited after the last
 * matching test run.
 */
export function sessionActivity(lines: string[]): SessionActivity {
  let apex = new Set<string>();
  let lwc = new Set<string>();
  for (const line of lines) {
    if (!line.includes('"tool_use"')) continue;
    let entry: unknown;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const content = isRecord(entry) && isRecord(entry.message) ? entry.message.content : null;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (!isRecord(block) || block.type !== "tool_use" || !isRecord(block.input)) continue;
      const name = str(block.name);
      const input = block.input;
      if (name === "Bash") {
        const cmd = str(input.command);
        if (APEX_TEST.test(cmd)) apex = new Set();
        if (JEST_TEST.test(cmd)) lwc = new Set();
      } else if (["Write", "Edit", "MultiEdit"].includes(name)) {
        const file = str(input.file_path);
        if (APEX_FILE.test(file)) apex.add(file);
        if (LWC_FILE.test(file)) lwc.add(file);
      }
    }
  }
  return { apexEdited: [...apex], lwcEdited: [...lwc] };
}

/** The last MAX_TRANSCRIPT bytes only: long sessions write transcripts far larger than that. */
function readTranscript(path: string): string[] {
  if (!path || !existsSync(path)) return [];
  const size = statSync(path).size;
  if (size <= MAX_TRANSCRIPT) return readFileSync(path, "utf8").split("\n");
  const buf = Buffer.alloc(MAX_TRANSCRIPT);
  const fd = openSync(path, "r");
  try {
    const n = readSync(fd, buf, 0, MAX_TRANSCRIPT, size - MAX_TRANSCRIPT);
    // The first line is almost certainly cut mid-record: drop it.
    return buf.subarray(0, n).toString("utf8").split("\n").slice(1);
  } finally {
    closeSync(fd);
  }
}

function consoleInChangedJs(root: string): string[] {
  const r = spawnSync("git", ["diff", "--name-only", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    timeout: 5000,
  });
  if (r.status !== 0) return [];
  return r.stdout
    .split("\n")
    .filter(
      (f) =>
        /[\\/](?:lwc|aura)[\\/].+\.js$/.test(f) && !/(?:__tests__|\.test\.js$|\.spec\.js$)/.test(f),
    )
    .filter((f) => {
      try {
        return /^\s*[^/\n]*\bconsole\.log\s*\(/m.test(readFileSync(join(root, f), "utf8"));
      } catch {
        return false;
      }
    })
    .slice(0, 10);
}

export function evaluate(event: HookEvent, lines?: string[]): HookOutput | null {
  if (event.stop_hook_active === true) return null;
  const root = findProjectRoot(str(event.cwd) || process.cwd());
  if (!root) return null;

  const activity = sessionActivity(lines ?? readTranscript(str(event.transcript_path)));
  const items: string[] = [];
  if (activity.apexEdited.length)
    items.push(
      `Apex edited without a later test run (${activity.apexEdited.length} file(s)). Run the focused tests: sf apex run test --class-names <ChangedClass>Test --result-format human --wait 10. Keep RunLocalTests for the final gate.`,
    );
  if (activity.lwcEdited.length)
    items.push(
      `LWC/Aura edited without a later Jest run (${activity.lwcEdited.length} file(s)). Run the project's LWC tests (e.g. npm run test:unit).`,
    );
  if (activity.apexEdited.length || activity.lwcEdited.length) {
    const logs = consoleInChangedJs(root);
    if (logs.length) items.push(`console.log left in: ${logs.join(", ")}`);
  }
  if (items.length === 0) return null;

  if (currentProfile() === "strict") {
    return {
      decision: "block",
      reason: `${ID}: before finishing:\n${items.map((i) => `- ${i}`).join("\n")}\nRun the tests (or tell the user why they can't run) and then finish.`,
    };
  }
  return { systemMessage: `${ID}: ${items.join(" | ")}` };
}

if (import.meta.main) await runHook(ID, "minimal", (e) => evaluate(e));
