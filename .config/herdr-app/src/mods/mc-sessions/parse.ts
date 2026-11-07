// Claude Code session files (~/.claude/projects/<dir>/<id>.jsonl) to session rows. Claude Code
// appends title records (custom-title, agent-name, ai-title, last-prompt) throughout a session,
// so the tail of a file is enough for its title, folder, branch and last activity. Pure.

export interface FileEntry {
  path: string;
  /** ms since the epoch. */
  mtime: number;
  size: number;
}

export interface Session {
  id: string;
  machine: string | null;
  path: string;
  cwd: string;
  branch: string;
  title: string;
  /** ms since the epoch. */
  updated: number;
  size: number;
  /** Continued in another session (that one is the one to resume). */
  continued: boolean;
}

/** `find -printf '%T@\t%s\t%p\n'` lines. */
export function parseListing(stdout: string): FileEntry[] {
  return stdout
    .split("\n")
    .map((line) => line.split("\t"))
    .filter((p) => p.length === 3 && p[2].endsWith(".jsonl"))
    .map(([t, s, path]) => ({ path, mtime: Math.round(Number(t) * 1000), size: Number(s) }))
    .filter((e) => Number.isFinite(e.mtime));
}

/** `\x1e<path>\n<text>` blocks. */
export function splitFiles(stdout: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const block of stdout.split("\x1e").slice(1)) {
    const nl = block.indexOf("\n");
    if (nl > 0) out.set(block.slice(0, nl), block.slice(nl + 1));
  }
  return out;
}

const isNoise = (s: string) =>
  /^<(command|local-command|system-reminder|bash-|task-notification)/.test(s.trim());

export function parseTail(entry: FileEntry, machine: string | null, text: string): Session {
  let custom = "";
  let agentName = "";
  let aiTitle = "";
  let prompt = "";
  let cwd = "";
  let branch = "";
  let last = 0;
  let continued = false;
  // The first line is usually cut short by `tail -c`; JSON.parse skips it.
  for (const line of text.split("\n")) {
    if (!line.startsWith("{")) continue;
    let row: Record<string, unknown>;
    try {
      row = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }
    const type = row.type;
    if (type === "custom-title" && typeof row.customTitle === "string") custom = row.customTitle;
    else if (type === "agent-name" && typeof row.agentName === "string") agentName = row.agentName;
    else if (type === "ai-title" && typeof row.aiTitle === "string") aiTitle = row.aiTitle;
    else if (
      type === "last-prompt" &&
      typeof row.lastPrompt === "string" &&
      !isNoise(row.lastPrompt)
    )
      prompt = row.lastPrompt;
    else if (type === "continued-in") continued = true;
    if (typeof row.cwd === "string" && row.cwd) cwd = row.cwd;
    if (typeof row.gitBranch === "string" && row.gitBranch && row.gitBranch !== "HEAD")
      branch = row.gitBranch;
    if (typeof row.timestamp === "string") {
      const t = Date.parse(row.timestamp);
      if (Number.isFinite(t) && t > last) last = t;
    }
  }
  const id =
    entry.path
      .split("/")
      .pop()
      ?.replace(/\.jsonl$/, "") ?? entry.path;
  const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
  const fromPrompt = oneLine(prompt).slice(0, 90);
  return {
    id,
    machine,
    path: entry.path,
    cwd: cwd || dirFromProject(entry.path),
    branch,
    title: oneLine(custom || agentName || aiTitle) || fromPrompt || "Untitled session",
    updated: last || entry.mtime,
    size: entry.size,
    continued,
  };
}

/** A best guess at the folder from the project folder name ("-home-zakk-x" → "/home/zakk/x"). */
function dirFromProject(path: string): string {
  const dir = path.split("/").slice(-2, -1)[0] ?? "";
  return dir.startsWith("-") ? dir.replace(/-/g, "/") : "";
}

/** True when `cwd` is `folder` or inside it; a home-level folder only matches itself. */
export function within(cwd: string, folder: string): boolean {
  if (!cwd || !folder) return false;
  const f = folder.replace(/\/+$/, "");
  if (cwd === f) return true;
  const broad = f.split("/").filter(Boolean).length <= 2;
  return !broad && cwd.startsWith(`${f}/`);
}

export type Day = "Today" | "Yesterday" | "This week" | "Earlier";

export function dayOf(ms: number, now = Date.now()): Day {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const today = start.getTime();
  if (ms >= today) return "Today";
  if (ms >= today - 86400000) return "Yesterday";
  if (ms >= today - 6 * 86400000) return "This week";
  return "Earlier";
}
