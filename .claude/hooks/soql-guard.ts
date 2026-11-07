#!/usr/bin/env node
/**
 * PreToolUse guard for SOQL that reads sensitive fields.
 *
 * Inspects:
 *  - Bash commands in a Salesforce context (`sf`/`sfdx`, `force:` commands,
 *    REST `/services/data/…/query?q=…` calls, including URL-encoded SOQL), plus
 *    any `.soql` / `.apex` file the command references (e.g. `--file q.soql`).
 *  - Any MCP tool whose arguments contain a SELECT … FROM statement (Salesforce
 *    DX MCP `run_soql_query` and friends).
 *
 * High-sensitivity fields (SSN, tax/government IDs, DOB, bank/card numbers,
 * credentials and tokens, health and special-category data, AuthSession /
 * OauthToken / AuthProvider objects) trigger an "ask" prompt naming the
 * fields. Medium fields (contact details, home address, compensation,
 * FIELDS(ALL)) are allowed with a handling reminder in Claude's context.
 *
 * Extend or relax the field list per project in .claude/soql-sensitive-fields
 * (see lib/soql.ts). Disable with CLAUDE_DISABLED_HOOKS=soql-guard. Fails open.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { collectStrings, isRecord, preToolUse, runHook, str } from "./lib/hook-io.ts";
import type { HookEvent, HookOutput } from "./lib/hook-io.ts";
import { describeFields, extractQueries, loadOverrides, sensitiveFields } from "./lib/soql.ts";
import type { SoqlQuery } from "./lib/soql.ts";

export const ID = "soql-guard";

const SF_CONTEXT =
  /(?:^|[\s;&|(`$])(?:sf|sfdx)\s|\bforce:[a-z]|\/services\/data\/v\d|\.soql\b|\bsoql\b/i;
const FILE_REF = /(?:^|[\s=])(["']?)([^\s"'|;&]+\.(?:soql|apex))\1/gi;
const MAX_FILE = 256 * 1024;

function readReferencedFiles(command: string, cwd: string): string[] {
  const out: string[] = [];
  for (const m of command.matchAll(FILE_REF)) {
    const raw = m[2]!.replace(/^~(?=\/)/, process.env.HOME ?? "~");
    const file = isAbsolute(raw) ? raw : resolve(cwd || process.cwd(), raw);
    try {
      if (existsSync(file) && statSync(file).size <= MAX_FILE) out.push(readFileSync(file, "utf8"));
    } catch {
      // unreadable: skip
    }
  }
  return out;
}

/** Org alias the command targets, for a production hint in the prompt. */
function targetOrg(command: string): string {
  return /(?:--target-org|-o|-u|--targetusername)[=\s]+["']?([^\s"']+)/.exec(command)?.[1] ?? "";
}

export function queriesFor(tool: string, input: Record<string, unknown>, cwd: string): SoqlQuery[] {
  if (tool === "Bash") {
    const command = str(input.command);
    if (!SF_CONTEXT.test(command)) return [];
    return [command, ...readReferencedFiles(command, cwd)].flatMap(extractQueries);
  }
  if (tool.startsWith("mcp__")) return collectStrings(input).flatMap(extractQueries);
  return [];
}

export function evaluate(event: HookEvent): HookOutput | null {
  if (str(event.hook_event_name) && str(event.hook_event_name) !== "PreToolUse") return null;
  const tool = str(event.tool_name);
  const input = isRecord(event.tool_input) ? event.tool_input : {};
  const cwd = str(event.cwd);
  const queries = queriesFor(tool, input, cwd);
  if (queries.length === 0) return null;

  const fields = sensitiveFields(queries, loadOverrides(cwd || process.cwd()));
  if (fields.length === 0) return null;

  const objects = [...new Set(queries.map((q) => q.object))].join(", ");
  const unbounded = queries.some((q) => !q.hasLimit && !q.hasWhere);
  const org = tool === "Bash" ? targetOrg(str(input.command)) : "";
  const prod = /(?:^|[-_.@])(?:prod|production|prd)(?:$|[-_.@])/i.test(org);
  const notes = [
    unbounded && "The query has no WHERE or LIMIT, so it returns every record.",
    prod && `Target org "${org}" looks like PRODUCTION.`,
  ].filter(Boolean);

  if (fields.some((f) => f.severity === "high")) {
    return preToolUse(
      "ask",
      `${ID}: SOQL on ${objects} selects sensitive fields:\n${describeFields(fields)}\n` +
        (notes.length ? notes.join(" ") + "\n" : "") +
        "Approve only if these values are needed. Prefer dropping the fields, aggregating (COUNT), filtering " +
        "with WHERE/LIMIT, or querying a masked sandbox.",
    );
  }
  return preToolUse(
    undefined,
    "",
    `${ID}: this SOQL on ${objects} returns personal data:\n${describeFields(fields)}\n` +
      (notes.length ? notes.join(" ") + "\n" : "") +
      "Select only fields the task needs. Do not echo record values back in full, write them to files, or commit them; " +
      "summarize or mask them instead.",
  );
}

if (import.meta.main) await runHook(ID, "minimal", evaluate);
