/**
 * Shared plumbing for Claude Code command hooks: stdin parsing, output
 * helpers, and the profile/disable switches ported from the
 * salesforce-claude-code `hook-flags.js` / `run-with-flags.js`.
 *
 *   CLAUDE_HOOK_PROFILE   minimal | standard (default) | strict
 *   CLAUDE_DISABLED_HOOKS comma-separated hook ids to turn off
 *
 * Every hook fails open: a parse error or exception allows the action.
 */

import { realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

export type Profile = "minimal" | "standard" | "strict";
export type HookEvent = Record<string, unknown>;
export type HookOutput = Record<string, unknown>;

const LEVELS: Record<Profile, number> = { minimal: 1, standard: 2, strict: 3 };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function currentProfile(env: NodeJS.ProcessEnv = process.env): Profile {
  const raw = (env.CLAUDE_HOOK_PROFILE ?? "").trim().toLowerCase();
  return raw in LEVELS ? (raw as Profile) : "standard";
}

/** True when `id` is not disabled and the active profile is at least `min`. */
export function hookEnabled(
  id: string,
  min: Profile = "standard",
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const disabled = (env.CLAUDE_DISABLED_HOOKS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (disabled.includes(id.toLowerCase())) return false;
  return LEVELS[currentProfile(env)] >= LEVELS[min];
}

/** Recursively collect every string leaf, so stderr and nested MCP content are covered. */
export function collectStrings(value: unknown, out: string[] = [], depth = 0): string[] {
  if (depth > 12) return out;
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) collectStrings(v, out, depth + 1);
  else if (isRecord(value)) for (const v of Object.values(value)) collectStrings(v, out, depth + 1);
  return out;
}

export function preToolUse(
  decision: "allow" | "deny" | "ask" | undefined,
  reason: string,
  context?: string,
): HookOutput {
  const out: Record<string, unknown> = { hookEventName: "PreToolUse" };
  if (decision) {
    out.permissionDecision = decision;
    out.permissionDecisionReason = reason;
  }
  if (context) out.additionalContext = context;
  return { hookSpecificOutput: out };
}

export function addContext(event: string, context: string, systemMessage?: string): HookOutput {
  const out: HookOutput = {
    hookSpecificOutput: { hookEventName: event, additionalContext: context },
  };
  if (systemMessage) out.systemMessage = systemMessage;
  return out;
}

export const MAX_STDIN = 4 * 1024 * 1024;

export interface StdinRead {
  /** The first `max` bytes, decoded. */
  text: string;
  /** Total bytes received, including any past the cap. */
  bytes: number;
  truncated: boolean;
}

/** Read stdin up to `max` bytes, draining and counting the rest so the full size is known. */
export async function readStdinInfo(max = MAX_STDIN): Promise<StdinRead> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    const buf = chunk as Buffer;
    if (size < max) chunks.push(buf.subarray(0, max - size));
    size += buf.length;
  }
  return { text: Buffer.concat(chunks).toString("utf8"), bytes: size, truncated: size > max };
}

export async function readStdin(): Promise<string> {
  return (await readStdinInfo()).text;
}

/** What a hook can still tell from a payload too large to parse. */
export interface OversizeEvent {
  /** Read from the head of the raw JSON, where they precede tool_input/tool_response ("" if absent). */
  hookEventName: string;
  toolName: string;
  bytes: number;
}

export function oversizeEvent(raw: string, bytes: number): OversizeEvent {
  const head = raw.slice(0, 64 * 1024);
  const field = (key: string) =>
    new RegExp(`"${key}"\\s*:\\s*"([^"\\\\]{1,200})"`).exec(head)?.[1] ?? "";
  return { hookEventName: field("hook_event_name"), toolName: field("tool_name"), bytes };
}

export const formatMB = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export interface RunHookOptions {
  /**
   * Called instead of `evaluate` when stdin went over MAX_STDIN and could not be parsed, so
   * the hook can say it skipped the payload rather than fail open silently.
   */
  oversize?: (event: OversizeEvent) => HookOutput | null;
}

/**
 * A UserPromptSubmit prompt that the harness wrote, not the user: a subagent hand-back or a
 * task / cross-session notification. Blocking one silently drops the report.
 */
export const HARNESS_DELIVERY = /^\s*<(?:agent-message|task-notification|cross-session-message)\b/;

export function isHarnessDelivery(prompt: string): boolean {
  return HARNESS_DELIVERY.test(prompt);
}

/** Resolve `target` against `cwd` and follow symlinks (stow links), falling back to the plain path. */
export function realPath(target: string, cwd: string = process.cwd()): string {
  const abs = isAbsolute(target) ? target : join(cwd, target);
  try {
    return realpathSync.native(abs);
  } catch {
    return resolve(abs);
  }
}

/** True when the resolved `path` is `dir` or inside it. */
export function isInside(path: string, dir: string): boolean {
  const rel = relative(dir, path);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

/**
 * Standard entrypoint: parse stdin, check flags, run `evaluate`, print JSON.
 * Exits 0 on any failure (fail open).
 */
export async function runHook(
  id: string,
  min: Profile,
  evaluate: (event: HookEvent) => HookOutput | null | Promise<HookOutput | null>,
  options: RunHookOptions = {},
): Promise<void> {
  try {
    if (!hookEnabled(id, min)) return;
    const input = await readStdinInfo();
    let event: unknown;
    try {
      event = JSON.parse(input.text);
    } catch (err) {
      if (!input.truncated || !options.oversize) throw err;
      const output = options.oversize(oversizeEvent(input.text, input.bytes));
      if (output) process.stdout.write(JSON.stringify(output));
      return;
    }
    if (!isRecord(event)) return;
    const output = await evaluate(event);
    if (output) process.stdout.write(JSON.stringify(output));
  } catch {
    // fail open
  }
}
