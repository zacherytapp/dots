#!/usr/bin/env node
/**
 * Consent gate wrapper (PreToolUse, Bash|Write|Edit|NotebookEdit).
 *
 * Runs the claude-companion consent gate, whose consent.py path is the first argument,
 * except in auto mode. consent.py stands down for bypassPermissions and dontAsk but not
 * auto, so in its `enforce` mode it would hold every mutating tool call for up to 110 s
 * waiting on the desktop panel. Auto mode must never be blocked by a hook.
 *
 * The consent.py path stays in the settings.json command so the plugin's installer
 * (hooks/install.py) still recognises the entry and doesn't add a second, unwrapped one.
 *
 * Fails open: anything that goes wrong prints nothing.
 */

import { spawnSync } from "node:child_process";
import { isRecord, readStdin, warnOnly } from "./lib/hook-io.ts";

/** Under the 120 s hook timeout and above consent.py's own 110 s deadline. */
const CHILD_TIMEOUT_MS = 115_000;

/** True when the consent gate should run for this raw hook payload. */
export function gateApplies(raw: string): boolean {
  try {
    const event: unknown = JSON.parse(raw);
    return !(isRecord(event) && warnOnly(event));
  } catch {
    return true; // consent.py does its own parsing and fails open
  }
}

async function main(): Promise<void> {
  try {
    const script = process.argv[2];
    if (!script) return;
    const raw = await readStdin();
    if (!gateApplies(raw)) return;
    spawnSync("python3", [script], {
      input: raw,
      stdio: ["pipe", "inherit", "ignore"],
      timeout: CHILD_TIMEOUT_MS,
    });
  } catch {
    // fail open
  }
}

if (import.meta.main) await main();
