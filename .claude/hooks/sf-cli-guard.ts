#!/usr/bin/env node
/**
 * PreToolUse guard for Salesforce CLI commands. TypeScript port of the
 * salesforce-claude-code `pre-tool-use.js`, `sfdx-validate.js` and
 * `sfdx-scanner-check.js` hooks.
 *
 * Upstream printed to stderr and exited 0 (often as async hooks), so Claude
 * never saw the warnings. Here:
 *
 *  - "ask" (permission prompt): mutating commands aimed at an org alias that
 *    looks like production (explicit --target-org/-o/-u, or the default
 *    target-org from .sf/config.json); org deletion; bulk deletes;
 *    destructive-changes deploys; `sf project delete source`; mutating
 *    commands aimed at the default Dev Hub; production quick-deploy commands
 *    (`project deploy validate|quick`); --ignore-conflicts on deploy or
 *    retrieve; package version promotion; deploys or pushes with
 *    high-severity Code Analyzer (PMD) violations.
 *  - additionalContext (Claude sees it, command still runs): deprecated
 *    `sfdx force:*` commands with their `sf` replacement, deploys without
 *    --test-level, --ignore-errors, --no-track-source, data import
 *    without --plan, package versions without --code-coverage, and read-only
 *    commands against production.
 *
 * The Code Analyzer gate runs only for `git push` and
 * `sf project deploy start` inside an SFDX project, on changed Apex files,
 * and only when `sf code-analyzer` (v5) or `sf scanner` (v4) is installed.
 * Skip it with CLAUDE_DISABLED_HOOKS=sf-code-analyzer.
 *
 * Disable everything with CLAUDE_DISABLED_HOOKS=sf-cli-guard. Fails open.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { hookEnabled, isRecord, preToolUse, runHook, str } from "./lib/hook-io.ts";
import type { HookEvent, HookOutput } from "./lib/hook-io.ts";

export const ID = "sf-cli-guard";

/** Deprecated sfdx commands and their sf replacements. */
export const SFDX_MIGRATION: Record<string, string> = {
  "force:apex:execute": "sf apex run",
  "force:apex:test:run": "sf apex run test",
  "force:apex:test:report": "sf apex get test",
  "force:apex:log:tail": "sf apex tail log",
  "force:apex:log:get": "sf apex get log",
  "force:apex:class:create": "sf apex generate class",
  "force:apex:trigger:create": "sf apex generate trigger",
  "force:lightning:component:create": "sf lightning generate component",
  "force:source:deploy": "sf project deploy start",
  "force:source:retrieve": "sf project retrieve start",
  "force:source:push": "sf project deploy start",
  "force:source:pull": "sf project retrieve start",
  "force:source:status": "sf project deploy preview / sf project retrieve preview",
  "force:source:delete": "sf project delete source",
  "force:mdapi:deploy": "sf project deploy start --metadata-dir",
  "force:mdapi:retrieve": "sf project retrieve start --target-metadata-dir",
  "force:org:create": "sf org create scratch",
  "force:org:delete": "sf org delete scratch",
  "force:org:list": "sf org list",
  "force:org:open": "sf org open",
  "force:org:display": "sf org display",
  "force:data:soql:query": "sf data query",
  "force:data:query": "sf data query",
  "force:data:record:create": "sf data create record",
  "force:data:record:update": "sf data update record",
  "force:data:record:delete": "sf data delete record",
  "force:data:bulk:upsert": "sf data upsert bulk",
  "force:data:bulk:delete": "sf data delete bulk",
  "force:data:tree:import": "sf data import tree",
  "force:data:tree:export": "sf data export tree",
  "force:package:create": "sf package create",
  "force:package:version:create": "sf package version create",
  "force:package:install": "sf package install",
  "force:user:create": "sf org create user",
  "force:user:password:generate": "sf org generate password",
  "force:auth:web:login": "sf org login web",
  "force:auth:jwt:grant": "sf org login jwt",
  "force:config:set": "sf config set",
};

const SF_CMD = /(?:^|[\s;&|(`])(sf|sfdx)\s+([a-z][\w:-]*(?:\s+[a-z][\w-]*){0,3})/gi;
const PROD_ALIAS = /(?:^|[-_.@])(?:prod|production|prd)(?:$|[-_.@])/i;

/** Subcommands that change org state (data, metadata, users, the org itself). */
const MUTATING =
  /^(?:project deploy (?:start|resume|quick)|project delete|data (?:create|update|delete|upsert|import|resume)|apex run(?! test)|org (?:delete|create user|assign|generate password)|package (?:install|uninstall)|community publish|force:(?:source:(?:deploy|push|delete)|mdapi:deploy|data:|apex:execute|package:install|user:))/i;

interface Finding {
  level: "ask" | "warn";
  message: string;
}

function sfInvocations(command: string): { bin: string; sub: string; seg: string }[] {
  const out: { bin: string; sub: string; seg: string }[] = [];
  for (const m of command.matchAll(SF_CMD)) {
    const start = m.index ?? 0;
    const rest = command.slice(start);
    const end = rest.search(/\s(?:&&|\|\||;|\|)\s|\n/);
    out.push({
      bin: m[1]!.toLowerCase(),
      sub: m[2]!.toLowerCase(),
      seg: end < 0 ? rest : rest.slice(0, end),
    });
  }
  return out;
}

function explicitOrg(seg: string): string {
  return /(?:--target-org|--targetusername|\s-o|\s-u)(?:=|\s+)["']?([^\s"']+)/.exec(seg)?.[1] ?? "";
}

function findUp(start: string, name: string): string | null {
  let dir = start;
  for (let i = 0; i < 25; i++) {
    const candidate = join(dir, name);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** A config value from the nearest .sf/config.json, then ~/.sf/config.json. */
function sfConfig(key: string, cwd: string, home: string): string {
  for (const file of [findUp(cwd, join(".sf", "config.json")), join(home, ".sf", "config.json")]) {
    if (!file || !existsSync(file)) continue;
    try {
      const cfg: unknown = JSON.parse(readFileSync(file, "utf8"));
      if (isRecord(cfg) && typeof cfg[key] === "string") return cfg[key];
    } catch {
      // ignore malformed config
    }
  }
  return "";
}

/** Default target-org from the nearest .sf/config.json, then ~/.sf/config.json. */
export function defaultOrg(cwd: string, home = homedir()): string {
  return sfConfig("target-org", cwd, home);
}

export function checkCommand(command: string, cwd: string, home = homedir()): Finding[] {
  const findings: Finding[] = [];
  const devHub = sfConfig("target-dev-hub", cwd, home);
  const add = (level: Finding["level"], message: string) => {
    if (!findings.some((f) => f.message === message)) findings.push({ level, message });
  };

  for (const { bin, sub, seg } of sfInvocations(command)) {
    const head = sub.split(/\s+/)[0]!;
    if (bin === "sfdx" || head.startsWith("force:")) {
      const repl = SFDX_MIGRATION[head];
      add(
        "warn",
        repl
          ? `\`${bin} ${head}\` is deprecated; use \`${repl}\`.`
          : `\`${bin} ${head}\` uses the retired sfdx command set; use the \`sf\` equivalent.`,
      );
    }

    const org = explicitOrg(seg) || defaultOrg(cwd, home);
    const prod = org !== "" && PROD_ALIAS.test(org);
    const mutating = MUTATING.test(sub);
    const orgNote = explicitOrg(seg) ? `org "${org}"` : `default target-org "${org}"`;
    if (prod && mutating)
      add("ask", `\`${bin} ${sub}\` changes ${orgNote}, which looks like PRODUCTION.`);
    else if (prod)
      add(
        "warn",
        `\`${bin} ${sub}\` runs against ${orgNote}, which looks like PRODUCTION. Keep it read-only.`,
      );
    if (mutating && devHub !== "" && org === devHub)
      add(
        "ask",
        `\`${bin} ${sub}\` changes ${orgNote}, the default Dev Hub. Develop and deploy in scratch orgs or sandboxes.`,
      );
    if (/^project deploy (?:validate|quick)\b/.test(sub))
      add(
        "ask",
        `\`sf ${sub}\` is the production quick-deploy workflow. For scratch orgs and sandboxes use \`sf project deploy start --dry-run\`.`,
      );
    if (/^package version promote\b/.test(sub))
      add("ask", "Promoting a package version releases it permanently; it can't be un-promoted.");
    if (
      /^project (?:deploy|retrieve) start/.test(sub) &&
      /--ignore-conflicts|\s-c\b/.test(seg) &&
      !/--dry-run/.test(seg)
    )
      add(
        "ask",
        "--ignore-conflicts overwrites conflicting changes (in the org on deploy, in local source on retrieve). Resolve conflicts instead.",
      );

    if (/^org delete\b|^force:org:delete/.test(sub))
      add(
        "ask",
        "Deletes a Salesforce org. Make sure it is the right org and that source changes are retrieved.",
      );
    if (/^data delete bulk|^force:data:bulk:delete/.test(sub))
      add("ask", "Bulk delete permanently removes records. Check the CSV and target org first.");
    if (/^project delete source|^force:source:delete/.test(sub))
      add("ask", "Deletes metadata from the org and local project.");
    if (/^project deploy start/.test(sub) || /^force:source:deploy|^force:mdapi:deploy/.test(sub)) {
      if (/--(?:pre|post)-destructive-changes|destructiveChanges(?:Pre|Post)?\.xml/i.test(seg))
        add(
          "ask",
          "Destructive-changes deploy deletes metadata in the target org. Verify the manifest.",
        );
      const preview = /--dry-run|--validate|--checkonly|--check-only/.test(seg);
      if (!preview && !/--test-level|\s-l\s/.test(seg))
        add(
          "warn",
          "Deploy without --test-level. Consider --test-level RunLocalTests (required for production), or --dry-run first.",
        );
      if (/--ignore-errors/.test(seg))
        add("warn", "--ignore-errors can leave the org partially deployed.");
    }
    if (/--no-track-source/.test(seg))
      add("warn", "--no-track-source: local source tracking won't reflect these changes.");
    if (/^org delete scratch/.test(sub) && !/--no-prompt/.test(seg))
      add("warn", "Retrieve or commit any scratch-org changes before deleting it.");
    if (/^data import tree/.test(sub) && !/--plan|\s-p\s/.test(seg))
      add("warn", "Data import without --plan. A plan file makes imports repeatable.");
    if (/^package version create/.test(sub) && !/--code-coverage|-c\b|--skip-validation/.test(seg))
      add(
        "warn",
        "Package version without --code-coverage can't be promoted (managed packages need 75% coverage).",
      );
  }
  return findings;
}

// --- Code Analyzer gate -------------------------------------------------------

interface Violation {
  severity: number;
  rule: string;
  message: string;
  file: string;
  line: number;
}

function sh(cmd: string, args: string[], cwd: string, timeout: number) {
  return spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    timeout,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function changedApex(root: string): string[] {
  const files = new Set<string>();
  for (const args of [
    ["diff", "--name-only", "HEAD"],
    ["diff", "--name-only", "--cached"],
    ["diff", "--name-only", "@{upstream}...HEAD"],
  ]) {
    const r = sh("git", args, root, 5000);
    if (r.status !== 0) continue;
    for (const f of r.stdout.split("\n"))
      if (/\.(?:cls|trigger)$/.test(f) && existsSync(join(root, f))) files.add(f);
  }
  return [...files].slice(0, 50);
}

/** Run Code Analyzer v5 (or v4 sf scanner) PMD rules on `files`; severity 1-2 only. */
export function runCodeAnalyzer(root: string, files: string[]): Violation[] | null {
  const dir = mkdtempSync(join(tmpdir(), "sf-ca-"));
  try {
    const out = join(dir, "out.json");
    const targets = files.flatMap((f) => ["-t", f]);
    const v5 = sh(
      "sf",
      ["code-analyzer", "run", "-r", "pmd:1", "-r", "pmd:2", ...targets, "-f", out],
      root,
      50000,
    );
    if (existsSync(out)) {
      const data: unknown = JSON.parse(readFileSync(out, "utf8"));
      if (!isRecord(data) || !Array.isArray(data.violations)) return [];
      return data.violations.filter(isRecord).map((v) => {
        const locs = Array.isArray(v.locations) ? v.locations.filter(isRecord) : [];
        const loc =
          locs[typeof v.primaryLocationIndex === "number" ? v.primaryLocationIndex : 0] ?? {};
        return {
          severity: Number(v.severity),
          rule: str(v.rule),
          message: str(v.message),
          file: str(loc.file),
          line: Number(loc.startLine) || 0,
        };
      });
    }
    // v5.error means sf is missing (ENOENT) or v5 hit its timeout. Falling back to v4 then
    // would only burn a second 50s budget and overrun the hook's 75s timeout.
    if (v5.error) return null;
    if (/not a sf command|command code-analyzer not found/i.test(v5.stderr ?? "")) {
      const v4 = sh(
        "sf",
        ["scanner", "run", "--target", files.join(","), "--format", "json", "--engine", "pmd"],
        root,
        50000,
      );
      const parsed: unknown = JSON.parse(v4.stdout || "null");
      if (!Array.isArray(parsed)) return null;
      return parsed.filter(isRecord).flatMap((f) =>
        (Array.isArray(f.violations) ? f.violations.filter(isRecord) : []).map((v) => ({
          severity: Number(v.severity),
          rule: str(v.ruleName),
          message: str(v.message).trim(),
          file: str(f.fileName),
          line: Number(v.line) || 0,
        })),
      );
    }
    return null;
  } catch {
    return null;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function codeAnalyzerGate(command: string, cwd: string): Finding | null {
  if (!hookEnabled("sf-code-analyzer", "standard")) return null;
  if (!/\bgit\s+(?:-\S+\s+)*push\b|\bsf\s+project\s+deploy\s+start\b/.test(command)) return null;
  if (/--dry-run|--help/.test(command)) return null;
  const project = findUp(cwd, "sfdx-project.json");
  if (!project) return null;
  const root = dirname(project);
  const files = changedApex(root);
  if (files.length === 0) return null;
  const violations = runCodeAnalyzer(root, files)?.filter((v) => v.severity <= 2) ?? [];
  if (violations.length === 0) return null;
  const lines = violations
    .slice(0, 10)
    .map(
      (v) =>
        `    [${v.severity === 1 ? "CRITICAL" : "HIGH"}] ${v.file}:${v.line} ${v.rule}: ${v.message}`,
    );
  if (violations.length > 10) lines.push(`    …and ${violations.length - 10} more`);
  return {
    level: "ask",
    message: `Code Analyzer found ${violations.length} critical/high PMD violation(s) in changed Apex:\n${lines.join("\n")}\n  Fix them before pushing or deploying, or approve to continue anyway.`,
  };
}

export function evaluate(event: HookEvent): HookOutput | null {
  if (str(event.tool_name) !== "Bash") return null;
  const input = isRecord(event.tool_input) ? event.tool_input : {};
  const command = str(input.command);
  if (!command) return null;
  const cwd = str(event.cwd) || process.cwd();

  const findings = /\b(?:sf|sfdx)\s/.test(command) ? checkCommand(command, cwd) : [];
  const gate = codeAnalyzerGate(command, cwd);
  if (gate) findings.push(gate);
  if (findings.length === 0) return null;

  const asks = findings.filter((f) => f.level === "ask").map((f) => `  - ${f.message}`);
  const warns = findings.filter((f) => f.level === "warn").map((f) => `  - ${f.message}`);
  if (asks.length > 0) {
    return preToolUse(
      "ask",
      `${ID}: confirm this Salesforce operation:\n${asks.join("\n")}` +
        (warns.length ? `\nAlso:\n${warns.join("\n")}` : ""),
    );
  }
  return preToolUse(
    undefined,
    "",
    `${ID}: Salesforce CLI notes for this command:\n${warns.join("\n")}`,
  );
}

if (import.meta.main) await runHook(ID, "minimal", evaluate);
