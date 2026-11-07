#!/usr/bin/env node
/**
 * Sensitive-data guard: regex detection of credentials, Salesforce tokens and
 * regulated PII (see lib/sensitive-patterns.ts) at every point data crosses
 * the model boundary.
 *
 *  - UserPromptSubmit: high findings block the prompt (with
 *    suppressOriginalPrompt so the text isn't echoed back into the block
 *    message on disk); medium findings add a handling reminder. The user can
 *    put `[allow-sensitive]` in the prompt to send it anyway.
 *  - PreToolUse (Write/Edit/MultiEdit/NotebookEdit/Bash/WebFetch/WebSearch/
 *    mcp__*): high findings in what Claude is about to write, run or send
 *    trigger an "ask" permission prompt; medium findings add context.
 *  - PostToolUse (any tool): findings in tool output add a warning to
 *    Claude's context and a notice to the user; high-severity values are
 *    replaced with [REDACTED:…] via updatedToolOutput, keeping the output's
 *    shape (Claude Code ignores a mismatched shape for built-in tools).
 *  - Stop / SubagentStop: high findings in the final response raise a notice
 *    to the user. Never blocks.
 *
 * Disable with CLAUDE_DISABLED_HOOKS=sensitive-data-guard. Fails open.
 */

import { basename } from "node:path";
import { collectStrings, isRecord, preToolUse, runHook, str } from "./lib/hook-io.ts";
import type { HookEvent, HookOutput } from "./lib/hook-io.ts";
import { describe, redact, scanSensitive, summarize } from "./lib/sensitive-patterns.ts";
import type { Finding } from "./lib/sensitive-patterns.ts";

export const ID = "sensitive-data-guard";
const ALLOW_MARKER = /\[allow-sensitive\]/i;
const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
/** Files that legitimately contain detector source; reading them would always warn. */
const SELF = /^(?:sensitive-data-guard|sensitive-patterns|secret-guard|soql-guard)(?:\.test)?\.ts$/;

const HANDLING =
  "Do not repeat these values in responses, write them to files, commit them, put them in commands, or send them to " +
  "external services. Refer to them by type or masked form, and tell the user if they need to rotate a credential.";

const high = (fs: Finding[]) => fs.some((f) => f.severity === "high");

function counts(fs: Finding[]): string {
  const h = fs.filter((f) => f.severity === "high").length;
  return [h && `${h} high`, fs.length - h && `${fs.length - h} medium`].filter(Boolean).join(", ");
}

/** Text Claude is about to emit through a tool, plus a short label for it. */
export function outgoingText(
  tool: string,
  input: Record<string, unknown>,
): { text: string; target: string } | null {
  const path = str(input.file_path) || str(input.notebook_path);
  switch (tool) {
    case "Write":
      return { text: str(input.content), target: path };
    case "Edit":
      return { text: str(input.new_string), target: path };
    case "MultiEdit":
      return {
        text: (Array.isArray(input.edits) ? input.edits : [])
          .map((e) => (isRecord(e) ? str(e.new_string) : ""))
          .join("\n"),
        target: path,
      };
    case "NotebookEdit":
      return { text: str(input.new_source), target: path };
    case "Bash":
      return { text: str(input.command), target: "shell command" };
    case "WebFetch":
      return { text: `${str(input.url)}\n${str(input.prompt)}`, target: str(input.url) };
    case "WebSearch":
      return { text: str(input.query), target: "web search" };
    default:
      if (tool.startsWith("mcp__")) return { text: collectStrings(input).join("\n"), target: tool };
      return null;
  }
}

function onPrompt(event: HookEvent): HookOutput | null {
  const prompt = str(event.prompt);
  if (!prompt || ALLOW_MARKER.test(prompt)) return null;
  const findings = scanSensitive(prompt);
  if (findings.length === 0) return null;
  if (high(findings)) {
    return {
      decision: "block",
      // Must sit in hookSpecificOutput; Claude Code ignores it at the top level.
      hookSpecificOutput: { hookEventName: "UserPromptSubmit", suppressOriginalPrompt: true },
      reason:
        `${ID}: prompt not sent. It contains sensitive data:\n${describe(findings)}\n` +
        "Redact the values (or reference them by env var / file path) and resend. To send it anyway, " +
        "include [allow-sensitive] in the prompt. If this was a live credential, consider rotating it.",
    };
  }
  return {
    systemMessage: `${ID}: prompt may contain personal data (${summarize(findings)})`,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: `${ID}: the user's prompt appears to contain sensitive data:\n${describe(findings)}\n${HANDLING}`,
    },
  };
}

function onPreToolUse(event: HookEvent): HookOutput | null {
  const tool = str(event.tool_name);
  const input = isRecord(event.tool_input) ? event.tool_input : {};
  const out = outgoingText(tool, input);
  if (!out || !out.text) return null;
  if (out.target && SELF.test(basename(out.target))) return null;
  const findings = scanSensitive(out.text);
  if (findings.length === 0) return null;
  const where = out.target ? ` (${out.target})` : "";
  if (high(findings)) {
    return preToolUse(
      "ask",
      `${ID}: this ${tool} call${where} would write, run or send sensitive data:\n${describe(findings)}\n` +
        "Approve only if this is intended (e.g. writing a git-ignored .env). Otherwise reference the value " +
        "via an environment variable or secret store instead of inlining it.",
    );
  }
  return preToolUse(
    undefined,
    "",
    `${ID}: this ${tool} input${where} may contain sensitive data:\n${describe(findings)}\n` +
      "Make sure these are not real credentials or personal data before continuing.",
  );
}

/** Rebuild `value` with every high-severity string value redacted, preserving shape. */
export function redactDeep(value: unknown, depth = 0): { value: unknown; count: number } {
  if (depth > 12) return { value, count: 0 };
  if (typeof value === "string") {
    const r = redact(value);
    return { value: r.text, count: r.count };
  }
  if (Array.isArray(value)) {
    let count = 0;
    const arr = value.map((v) => {
      const r = redactDeep(v, depth + 1);
      count += r.count;
      return r.value;
    });
    return { value: arr, count };
  }
  if (isRecord(value)) {
    let count = 0;
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const r = redactDeep(v, depth + 1);
      count += r.count;
      obj[k] = r.value;
    }
    return { value: obj, count };
  }
  return { value, count: 0 };
}

function onPostToolUse(event: HookEvent): HookOutput | null {
  const tool = str(event.tool_name);
  // Write-type tools echo back content that PreToolUse already checked.
  if (WRITE_TOOLS.has(tool)) return null;
  const input = isRecord(event.tool_input) ? event.tool_input : {};
  const target =
    str(input.file_path) || str(input.path) || str(input.url) || str(input.command).slice(0, 80);
  if ((tool === "Read" || tool === "Grep" || tool === "Glob") && SELF.test(basename(target)))
    return null;

  const findings = scanSensitive(collectStrings(event.tool_response).join("\n"));
  if (findings.length === 0) return null;

  const specific: Record<string, unknown> = {
    hookEventName: "PostToolUse",
    additionalContext:
      `${ID}: the ${tool} output${target ? ` from ${target}` : ""} contains sensitive data:\n${describe(findings)}\n` +
      (high(findings)
        ? "High-severity values were replaced with [REDACTED:<type>] placeholders. "
        : "") +
      HANDLING,
  };
  if (high(findings)) {
    const r = redactDeep(event.tool_response);
    if (r.count > 0) specific.updatedToolOutput = r.value;
  }
  return {
    systemMessage: `${ID}: ${tool} output contained sensitive data (${counts(findings)}: ${summarize(findings)})`,
    hookSpecificOutput: specific,
  };
}

function onStop(event: HookEvent): HookOutput | null {
  if (event.stop_hook_active === true) return null;
  const message = str(event.last_assistant_message);
  if (!message) return null;
  const findings = scanSensitive(message).filter((f) => f.severity === "high");
  if (findings.length === 0) return null;
  return {
    systemMessage:
      `${ID}: Claude's last response contains sensitive data (${summarize(findings)}). ` +
      "Avoid copying it elsewhere and rotate any exposed credential.",
  };
}

export function evaluate(event: HookEvent): HookOutput | null {
  switch (str(event.hook_event_name)) {
    case "UserPromptSubmit":
      return onPrompt(event);
    case "PreToolUse":
      return onPreToolUse(event);
    case "PostToolUse":
      return onPostToolUse(event);
    case "Stop":
    case "SubagentStop":
      return onStop(event);
    default:
      return null;
  }
}

if (import.meta.main) await runHook(ID, "minimal", evaluate);
