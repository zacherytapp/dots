#!/usr/bin/env node
// Validates .agents/skills: metadata, size, links and anchors, skill and hook
// references, the vendored-skill lock and the local inventory in AGENTS.md.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

// The .agents directory, wherever the script is run from (repo root or ~/.agents)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = path.join(root, "skills");
const failures: string[] = [];
const fail = (message: string) => failures.push(message);
const lock = JSON.parse(fs.readFileSync(path.join(root, ".skill-lock.json"), "utf8")) as {
  skills?: Record<string, unknown>;
};
const locked = new Set(Object.keys(lock.skills ?? {}));

const skillNames = fs
  .readdirSync(skillsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const installed = new Set(skillNames);
const installedHooks = new Set(
  fs
    .readdirSync(path.join(root, "hooks"), { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name.replace(/\.(?:md|sh|json)$/, "")),
);

function markdownFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(fullPath));
    else if (entry.name.endsWith(".md")) files.push(fullPath);
  }
  return files;
}

function contentOutsideFences(content: string): string {
  let fenced = false;
  return content
    .split("\n")
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        fenced = !fenced;
        return "";
      }
      return fenced ? "" : line;
    })
    .join("\n");
}

function headingAnchors(content: string): Set<string> {
  const anchors = new Set<string>();
  const counts = new Map<string, number>();
  for (const line of contentOutsideFences(content).split("\n")) {
    const explicit = [
      ...line.matchAll(/<(?:a|[a-z][a-z0-9-]*)\s+(?:[^>]*\s)?(?:id|name)=["']([^"']+)["']/gi),
    ];
    for (const match of explicit) if (match[1]) anchors.add(match[1]);

    const heading = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/)?.[1];
    if (!heading) continue;
    const base = heading
      .replace(/<[^>]+>/g, "")
      .replace(/[`*_~]/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s/g, "-");
    if (!base) continue;
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    anchors.add(count ? `${base}-${count}` : base);
  }
  return anchors;
}

function referencedSkillNames(content: string): Set<string> {
  const names = new Set<string>();
  const prose = contentOutsideFences(content).replace(/<!--[\s\S]*?-->/g, "");
  const patterns = [
    /`([a-z][a-z0-9-]+)`\s+(?:skill|subagent)\b/g,
    /\b([a-z][a-z0-9]*-[a-z0-9-]+)\s+(?:skill|subagent)(?:\s+integration)?\b/g,
    /\b(?:run|use|invoke|follow|with)\s+(?:an?\s+|the\s+)?`?\/([a-z][a-z0-9-]+)`?/gi,
  ];
  for (const pattern of patterns) {
    for (const match of prose.matchAll(pattern)) if (match[1]) names.add(match[1]);
  }
  return names;
}

for (const skillName of skillNames) {
  const skillDir = path.join(skillsRoot, skillName);
  const skillFile = path.join(skillDir, "SKILL.md");
  if (!fs.existsSync(skillFile)) {
    fail(`skills/${skillName}: missing SKILL.md`);
    continue;
  }

  const content = fs.readFileSync(skillFile, "utf8");
  const lines = content.replace(/\n$/, "").split("\n");
  if (!locked.has(skillName) && lines.length > 100) {
    fail(`skills/${skillName}/SKILL.md: ${lines.length} lines (maximum 100)`);
  }

  const frontmatter = content.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!frontmatter) {
    fail(`skills/${skillName}/SKILL.md: missing frontmatter`);
  } else {
    const name = frontmatter[1].match(/^name:\s*["']?([^\n"']+)["']?\s*$/m)?.[1];
    const description = frontmatter[1].match(/^description:\s*(.+)$/m)?.[1] ?? "";
    if (name !== skillName)
      fail(`skills/${skillName}/SKILL.md: frontmatter name is ${name ?? "missing"}`);
    if (!locked.has(skillName) && !/^[^.]+\. Use when\b/.test(description)) {
      fail(
        `skills/${skillName}/SKILL.md: description must state a capability, then a sentence beginning "Use when"`,
      );
    }
    if (!locked.has(skillName) && description.length > 1024) {
      fail(`skills/${skillName}/SKILL.md: description exceeds 1024 characters`);
    }
  }
}

const markdown = markdownFiles(skillsRoot);
const anchorCache = new Map<string, Set<string>>();
for (const file of markdown) {
  const relativeFile = path.relative(root, file);
  const rawContent = fs.readFileSync(file, "utf8");
  const content = contentOutsideFences(rawContent);
  // Vendored skills keep upstream prose, so only local skills get the dependency checks below
  const vendored = locked.has(path.relative(skillsRoot, file).split(path.sep)[0]);
  // Inline code holds example syntax like `[the mock](mock.html)`, not real links
  const linkable = content.replace(/`[^`\n]+`/g, "");
  const linkPattern = /\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (const match of linkable.matchAll(linkPattern)) {
    const target = match[1].replace(/^<|>$/g, "");
    if (/^[a-z]+:/i.test(target)) continue;
    const hashIndex = target.indexOf("#");
    const pathname = decodeURIComponent(hashIndex >= 0 ? target.slice(0, hashIndex) : target);
    const fragment = hashIndex >= 0 ? decodeURIComponent(target.slice(hashIndex + 1)) : "";
    const targetFile = pathname ? path.resolve(path.dirname(file), pathname) : file;
    if (!fs.existsSync(targetFile)) {
      fail(`${relativeFile}: broken relative link ${target}`);
      continue;
    }
    if (fragment && targetFile.endsWith(".md")) {
      const anchors =
        anchorCache.get(targetFile) ?? headingAnchors(fs.readFileSync(targetFile, "utf8"));
      anchorCache.set(targetFile, anchors);
      if (!anchors.has(fragment)) fail(`${relativeFile}: broken Markdown anchor ${target}`);
    }
  }

  if (!vendored) {
    for (const dependency of referencedSkillNames(rawContent)) {
      if (!installed.has(dependency))
        fail(`${relativeFile}: references absent skill ${dependency}`);
    }

    const prose = content.replace(/<!--[\s\S]*?-->/g, "");
    for (const hook of prose.matchAll(/\b([a-z][a-z0-9]*-[a-z0-9-]+) hook\b/g)) {
      if (!installedHooks.has(hook[1]) && !installedHooks.has(`${hook[1]}-hook`)) {
        fail(`${relativeFile}: references absent hook ${hook[1]}`);
      }
    }
  }

  const unsupportedBasePatterns = [
    /\borigin\/main\b/,
    /\bmain\.\.\.?HEAD\b/,
    /\bdiff against `?main`?\b/i,
    /\bPR to `main`\b/,
    /\bmerged to `main`\b/,
  ];
  for (const pattern of unsupportedBasePatterns) {
    if (pattern.test(rawContent)) {
      fail(`${relativeFile}: hard-codes a reusable default branch; resolve the actual base`);
      break;
    }
  }

  for (const marker of content.matchAll(/<!--\s*([a-z][a-z0-9-]+):(ledger|review)\b/g)) {
    if (marker[1] !== "review-code") {
      fail(
        `${relativeFile}: incompatible review marker ${marker[1]}:${marker[2]}; use review-code markers`,
      );
    }
  }
}

for (const skillName of locked) {
  if (!installed.has(skillName))
    fail(`.skill-lock.json: receipt references absent skill ${skillName}`);
}

// Host skill links (.claude/skills) must not dangle; absent when run from ~/.agents
const hostSkills = path.resolve(root, "..", ".claude", "skills");
if (fs.existsSync(hostSkills)) {
  for (const entry of fs.readdirSync(hostSkills, { withFileTypes: true })) {
    if (entry.isSymbolicLink() && !fs.existsSync(path.join(hostSkills, entry.name, "SKILL.md"))) {
      fail(`.claude/skills/${entry.name}: dangling or non-skill symlink`);
    }
  }
  // Claude Code doesn't read ~/.agents/skills, so every local skill needs a link
  for (const name of skillNames.filter((skill) => !locked.has(skill))) {
    if (!fs.existsSync(path.join(hostSkills, name))) {
      fail(`.claude/skills/${name}: missing link (ln -s ../../.agents/skills/${name})`);
    }
  }
}

// Pi loads ~/.agents/skills itself; links in its own skill dir load them twice
const piSkills = path.resolve(root, "..", ".pi", "agent", "skills");
if (fs.existsSync(piSkills)) {
  for (const name of fs.readdirSync(piSkills)) {
    if (installed.has(name)) fail(`.pi/agent/skills/${name}: duplicates ~/.agents/skills/${name}`);
  }
}

// Vendored skills must be exactly the ones .prettierignore (shared by markdownlint) skips;
// absent when run from ~/.agents
const prettierIgnore = path.resolve(root, "..", ".prettierignore");
if (fs.existsSync(prettierIgnore)) {
  const ignored = [
    ...fs.readFileSync(prettierIgnore, "utf8").matchAll(/^\.agents\/skills\/([^/\s]+)\/$/gm),
  ]
    .map((match) => match[1])
    .sort();
  const expected = [...locked].sort();
  if (JSON.stringify(ignored) !== JSON.stringify(expected)) {
    fail(`.prettierignore: vendored skill list drift (expected: ${expected.join(", ")})`);
  }
}

const expectedLocal = skillNames.filter((name) => !locked.has(name));
const agents = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
const inventory = agents.split("## Local custom skills\n", 2)[1] ?? "";
const documentedLocal = [...inventory.matchAll(/^- `([^`]+)`/gm)].map((match) => match[1]).sort();
if (JSON.stringify(documentedLocal) !== JSON.stringify(expectedLocal)) {
  fail(`AGENTS.md: local skill inventory drift (expected: ${expectedLocal.join(", ")})`);
}

if (failures.length) {
  for (const failure of failures) console.error(`ERROR: ${failure}`);
  process.exit(1);
}
console.log(`validated ${skillNames.length} skills`);
