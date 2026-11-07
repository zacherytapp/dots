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

const MAX_STDIN = 4 * 1024 * 1024;

export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    const buf = chunk as Buffer;
    if (size + buf.length > MAX_STDIN) {
      chunks.push(buf.subarray(0, MAX_STDIN - size));
      break;
    }
    chunks.push(buf);
    size += buf.length;
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Standard entrypoint: parse stdin, check flags, run `evaluate`, print JSON.
 * Exits 0 on any failure (fail open).
 */
export async function runHook(
  id: string,
  min: Profile,
  evaluate: (event: HookEvent) => HookOutput | null | Promise<HookOutput | null>,
): Promise<void> {
  try {
    if (!hookEnabled(id, min)) return;
    const event: unknown = JSON.parse(await readStdin());
    if (!isRecord(event)) return;
    const output = await evaluate(event);
    if (output) process.stdout.write(JSON.stringify(output));
  } catch {
    // fail open
  }
}
