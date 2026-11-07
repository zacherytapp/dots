#!/usr/bin/env node
/**
 * PostToolUse quality gate for Salesforce source written by Claude
 * (Write / Edit / MultiEdit). TypeScript port and merge of the
 * salesforce-claude-code `governor-check.js`, `quality-gate.js`,
 * `post-write.js`, `post-edit-console-warn.js` and the LWC part of
 * `post-edit-typecheck.js`.
 *
 * Findings go into Claude's context (additionalContext) so it can fix them;
 * upstream printed to stderr from async hooks, which Claude never saw.
 *
 * Apex (.cls / .trigger), on source with comments and strings blanked:
 *  - CRITICAL: SOQL, SOSL, DML or HTTP callouts inside loops
 *  - HIGH: enqueueJob / EventBus.publish / sendEmail in loops, Trigger.new[0],
 *    missing sharing declaration with SOQL/DML, `without sharing` exposing
 *    @AuraEnabled/@RemoteAction, sensitive fields (lib/soql.ts) selected
 *    without WITH USER_MODE / SECURITY_ENFORCED
 *  - MEDIUM: describe calls in loops, loop nesting ≥ 3, hard-coded record IDs,
 *    dynamic SOQL, Database DML without AccessLevel.USER_MODE
 *  - LOW: unbounded SOQL on large objects, many System.debug calls, new
 *    class with no matching test class
 * Test classes skip the security and governor checks.
 *
 * LWC (`lwc/<name>/<name>.js`): console statements, imperative Apex without
 * error handling, missing `export default class … extends LightningElement`.
 *
 * Strict profile (CLAUDE_HOOK_PROFILE=strict) also runs Code Analyzer PMD on
 * the file. Disable with CLAUDE_DISABLED_HOOKS=apex-quality. Fails open.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, extname, join, sep } from "node:path";
import { currentProfile, isRecord, runHook, str } from "./lib/hook-io.ts";
import type { HookEvent, HookOutput } from "./lib/hook-io.ts";
import { isTestClass, preprocessApex, trackLoopDepth } from "./lib/apex-analysis.ts";
import { extractQueries, loadOverrides, sensitiveFields } from "./lib/soql.ts";
import type { FieldOverrides } from "./lib/soql.ts";
import { runCodeAnalyzer } from "./sf-cli-guard.ts";

export const ID = "apex-quality";

export type Level = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export interface Issue {
  level: Level;
  line: number;
  message: string;
}

const ORDER: Record<Level, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const LOOP_RULES: { level: Level; re: RegExp; message: string }[] = [
  {
    level: "CRITICAL",
    re: /\[\s*SELECT\b/i,
    message: "SOQL inside a loop (100-query limit). Query once before the loop and use a Map.",
  },
  {
    level: "CRITICAL",
    re: /\[\s*FIND\b/i,
    message: "SOSL inside a loop (20-search limit). Search once before the loop.",
  },
  {
    level: "CRITICAL",
    re: /(?:^|[;{}\s])(?:insert|update|delete|upsert|undelete|merge)\s+(?!into\b)[\w([]|Database\.(?:insert|update|delete|upsert|undelete|merge)\w*\s*\(/i,
    message:
      "DML inside a loop (150-statement limit). Collect records and run one DML after the loop.",
  },
  {
    level: "CRITICAL",
    re: /\bHttp\s*\(\s*\)\s*\.\s*send\b|\.send\s*\(\s*\w*req\w*\s*\)|\bnew\s+HttpRequest\b/i,
    message:
      "HTTP callout inside a loop (100-callout limit). Batch the work or move it to Queueable.",
  },
  {
    level: "HIGH",
    re: /System\.enqueueJob\s*\(/i,
    message: "System.enqueueJob in a loop (50-job limit). Enqueue one job after the loop.",
  },
  {
    level: "HIGH",
    re: /EventBus\.publish\s*\(/i,
    message: "EventBus.publish in a loop. Publish a list once after the loop.",
  },
  {
    level: "HIGH",
    re: /Messaging\.sendEmail\s*\(/i,
    message: "Messaging.sendEmail in a loop (10-invocation limit). Send one list after the loop.",
  },
  {
    level: "MEDIUM",
    re: /Schema\.\w+\.getDescribe\s*\(|\.getDescribe\s*\(\s*\)|Schema\.getGlobalDescribe\s*\(/i,
    message: "Schema describe inside a loop. Cache the result outside the loop.",
  },
];

const LARGE_OBJECTS =
  /\bFROM\s+(?:Account|Contact|Lead|Opportunity|Task|Event|Case|CampaignMember|User)\b/i;

/** Matches the test-class conventions FooTest, Foo_Test, FooTests, TestFoo, Foo_Tests. */
export function hasTestClass(file: string): boolean {
  const name = basename(file, extname(file));
  const candidates = [
    `${name}Test`,
    `${name}_Test`,
    `${name}Tests`,
    `${name}_Tests`,
    `Test${name}`,
    `Test_${name}`,
  ].map((n) => `${n.toLowerCase()}.cls`);
  const dirs = [dirname(file), join(dirname(file), "..", "tests"), join(dirname(file), "tests")];
  for (const dir of dirs) {
    try {
      if (readdirSync(dir).some((f) => candidates.includes(f.toLowerCase()))) return true;
    } catch {
      // missing directory
    }
  }
  return false;
}

export function checkApex(file: string, content: string, overrides?: FieldOverrides): Issue[] {
  const issues: Issue[] = [];
  const isTrigger = extname(file).toLowerCase() === ".trigger";
  const test = isTestClass(content);
  const processed = preprocessApex(content);
  const lines = processed.split("\n");
  const depths = trackLoopDepth(lines);
  let deepWarned = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const depth = depths[i]!;
    if (!test && depth > 0) {
      for (const rule of LOOP_RULES)
        if (rule.re.test(line))
          issues.push({ level: rule.level, line: i + 1, message: rule.message });
    }
    if (!test && depth >= 3 && !deepWarned) {
      deepWarned = true;
      issues.push({
        level: "MEDIUM",
        line: i + 1,
        message: `Loop nesting depth ${depth}; CPU-time risk. Use Maps for lookups.`,
      });
    }
    if (isTrigger && /Trigger\.(?:new|old)\s*\[\s*0\s*\]/.test(line))
      issues.push({
        level: "HIGH",
        line: i + 1,
        message: "Trigger reads Trigger.new[0]; handle every record in bulk.",
      });
    if (
      !test &&
      /\[\s*SELECT\b/i.test(line) &&
      LARGE_OBJECTS.test(line) &&
      !/\b(?:WHERE|LIMIT)\b|COUNT\s*\(/i.test(line)
    )
      issues.push({
        level: "LOW",
        line: i + 1,
        message: "SOQL on a large object with no WHERE or LIMIT.",
      });
  }

  if (!test) {
    const header = content.split("{")[0] ?? "";
    const hasSharing = /\b(?:with|without|inherited)\s+sharing\b/i.test(header);
    const dataAccess =
      /\[\s*SELECT\b/i.test(processed) ||
      /(?:^|[;{}\s])(?:insert|update|delete|upsert)\s+\w/im.test(processed) ||
      /Database\.(?:insert|update|delete|upsert|query)\w*\s*\(/i.test(processed);
    if (!isTrigger && !hasSharing && dataAccess && /\bclass\b/i.test(header))
      issues.push({
        level: "HIGH",
        line: 1,
        message:
          "No sharing declaration on a class that runs SOQL/DML. Add `with sharing` or `inherited sharing`.",
      });
    if (/\bwithout\s+sharing\b/i.test(header) && /@(?:AuraEnabled|RemoteAction)\b/i.test(content))
      issues.push({
        level: "HIGH",
        line: 1,
        message:
          "`without sharing` class exposes @AuraEnabled/@RemoteAction methods; possible privilege escalation.",
      });

    // Sensitive fields read without FLS enforcement. Blank only comments so [SELECT …] blocks survive.
    const noComments = content
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
      .replace(/\/\/.*$/gm, "");
    for (const block of noComments.matchAll(/\[\s*SELECT\b[\s\S]*?\]/gi)) {
      const queries = extractQueries(block[0]);
      if (queries.some((q) => q.userMode)) continue;
      const hits = sensitiveFields(queries, overrides).filter((f) => f.severity === "high");
      if (hits.length) {
        const line = content.slice(0, block.index).split("\n").length;
        issues.push({
          level: "HIGH",
          line,
          message: `SOQL reads sensitive fields (${hits.map((h) => `${h.object}.${h.field}`).join(", ")}) without WITH USER_MODE or SECURITY_ENFORCED.`,
        });
      }
    }

    const dynamic = /Database\.(?:query|countQuery|queryWithBinds)\s*\(/i.exec(processed);
    if (dynamic)
      issues.push({
        level: "MEDIUM",
        line: processed.slice(0, dynamic.index).split("\n").length,
        message:
          "Dynamic SOQL. Bind variables (queryWithBinds) or String.escapeSingleQuotes() on user input.",
      });
    for (let i = 0; i < lines.length; i++) {
      if (
        /Database\.(?:insert|update|delete|upsert)\s*\(/i.test(lines[i]!) &&
        !/AccessLevel\.USER_MODE/i.test(lines[i]!)
      ) {
        issues.push({
          level: "MEDIUM",
          line: i + 1,
          message: "Database DML without AccessLevel.USER_MODE.",
        });
        break;
      }
    }
    // Record IDs: 3-char key prefix + 2-char pod, a run of zeros, 15 or 18 chars total.
    for (const m of content.matchAll(/(['"])([A-Za-z0-9]{5}0{3,}[A-Za-z0-9]{4,10})\1/g)) {
      const id = m[2]!;
      if (
        (id.length === 15 || id.length === 18) &&
        /[A-Za-z]/.test(id) &&
        /^[a-zA-Z0-9]{3}/.test(id)
      ) {
        issues.push({
          level: "MEDIUM",
          line: content.slice(0, m.index).split("\n").length,
          message: "Hard-coded record ID. Use Custom Metadata, Custom Settings or a query.",
        });
        break;
      }
    }
  }

  const threshold = Number.parseInt(process.env.APEX_DEBUG_THRESHOLD ?? "", 10) || 5;
  const debugs = (processed.match(/System\.debug\s*\(/gi) ?? []).length;
  if (debugs > threshold)
    issues.push({
      level: "LOW",
      line: 1,
      message: `${debugs} System.debug calls; remove before deploying.`,
    });

  return issues;
}

export function checkLwc(file: string, content: string): Issue[] {
  const issues: Issue[] = [];
  const lines = content.split("\n");
  const consoleLines = lines.flatMap((l, i) =>
    /\bconsole\.(?:log|debug|info|warn|error)\s*\(/.test(l) && !/^\s*\/\//.test(l) ? [i + 1] : [],
  );
  if (consoleLines.length)
    issues.push({
      level: "LOW",
      line: consoleLines[0]!,
      message: `${consoleLines.length} console statement(s) (lines ${consoleLines.slice(0, 5).join(", ")}); remove before deploying.`,
    });
  if (
    /import\s+\w+\s+from\s+['"]@salesforce\/apex\/[\w.]+['"]/.test(content) &&
    !/\.catch\s*\(|\bcatch\s*\(|\btry\s*\{/.test(content)
  )
    issues.push({
      level: "MEDIUM",
      line: 1,
      message: "Imperative Apex call without error handling. Add try/catch or .catch().",
    });
  const component = basename(dirname(file));
  if (basename(file, ".js") === component) {
    if (!/export\s+default\s+class\b/.test(content))
      issues.push({ level: "HIGH", line: 1, message: "LWC module needs `export default class`." });
    else if (!/extends\s+(?:\w+\()*LightningElement\b/.test(content))
      issues.push({ level: "HIGH", line: 1, message: "LWC class should extend LightningElement." });
  }
  return issues;
}

function format(file: string, issues: Issue[]): string {
  const sorted = [...issues].sort((a, b) => ORDER[a.level] - ORDER[b.level] || a.line - b.line);
  const shown = sorted.slice(0, 20).map((i) => `  - [${i.level}] line ${i.line}: ${i.message}`);
  if (sorted.length > 20) shown.push(`  - …${sorted.length - 20} more`);
  return `${ID}: ${basename(file)} has ${issues.length} issue(s):\n${shown.join("\n")}\nFix CRITICAL and HIGH issues now unless the user said otherwise.`;
}

export function evaluate(event: HookEvent): HookOutput | null {
  const tool = str(event.tool_name);
  if (!["Write", "Edit", "MultiEdit"].includes(tool)) return null;
  const input = isRecord(event.tool_input) ? event.tool_input : {};
  const file = str(input.file_path);
  const ext = extname(file).toLowerCase();
  const isApex = ext === ".cls" || ext === ".trigger";
  const isLwc =
    ext === ".js" &&
    file.split(sep).includes("lwc") &&
    !/\.(?:test|spec)\.js$/.test(file) &&
    !file.includes(`${sep}__tests__${sep}`);
  if (!isApex && !isLwc) return null;
  if (!existsSync(file)) return null;
  const content = readFileSync(file, "utf8");

  let issues: Issue[];
  if (isApex) {
    issues = checkApex(file, content, loadOverrides(str(event.cwd) || dirname(file)));
    if (tool === "Write" && ext === ".cls" && !isTestClass(content) && !hasTestClass(file))
      issues.push({
        level: "LOW",
        line: 1,
        message: `No test class found for ${basename(file, ext)}. Production deploys need 75% coverage; add ${basename(file, ext)}Test.cls.`,
      });
    if (currentProfile() === "strict") {
      const pmd = runCodeAnalyzer(dirname(file), [basename(file)]) ?? [];
      for (const v of pmd.filter((p) => p.severity <= 2).slice(0, 5))
        issues.push({
          level: v.severity === 1 ? "CRITICAL" : "HIGH",
          line: v.line,
          message: `PMD ${v.rule}: ${v.message}`,
        });
    }
  } else issues = checkLwc(file, content);

  if (issues.length === 0) return null;
  const serious = issues.filter((i) => ORDER[i.level] <= 1).length;
  const out: HookOutput = {
    hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: format(file, issues) },
  };
  if (serious) out.systemMessage = `${ID}: ${basename(file)} has ${serious} critical/high issue(s)`;
  return out;
}

if (import.meta.main) await runHook(ID, "minimal", evaluate);
