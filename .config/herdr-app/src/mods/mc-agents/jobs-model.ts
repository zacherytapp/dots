// Claude Code's own record of each session it runs (~/.claude/jobs/<id>/state.json): its state
// (working, blocked = waiting for you, done, failed), what it is doing now (`detail`), its name
// and folder. Interactive sessions started in a terminal have one too, so this is how an agent
// that reports nothing to Herdr still shows its real state. Pure.

import type { Status } from "herdr";

export interface Job {
  id: string;
  machine: string | null;
  state: string;
  detail: string;
  name: string;
  cwd: string;
  sessionId: string;
  /** ms since the epoch. */
  updated: number;
  tokens: number | null;
}

/** Finished for good: everything else is a job not yet closed out. */
export const CLOSED = new Set(["done", "failed"]);

/** `\x1e<id>\n<state.json>` blocks from the reader. */
export function parseJobs(stdout: string, machine: string | null): Job[] {
  const jobs: Job[] = [];
  for (const block of stdout.split("\x1e").slice(1)) {
    const nl = block.indexOf("\n");
    if (nl <= 0) continue;
    const id = block.slice(0, nl).trim();
    try {
      const s = JSON.parse(block.slice(nl + 1)) as Record<string, unknown>;
      const str = (k: string) => (typeof s[k] === "string" ? (s[k] as string) : "");
      const updated = Date.parse(str("updatedAt") || str("createdAt"));
      jobs.push({
        id,
        machine,
        state: str("state") || "unknown",
        detail: str("detail").replace(/\s+/g, " ").trim(),
        name: str("name") || str("intent").slice(0, 60) || id,
        cwd: str("cwd"),
        sessionId: str("sessionId") || str("resumeSessionId"),
        updated: Number.isFinite(updated) ? updated : 0,
        tokens: typeof s.tokens === "number" ? s.tokens : null,
      });
    } catch {
      // a state file mid-write: next look
    }
  }
  return jobs;
}

/** A state.json path in a watched batch (other files under a job, like its tmp/, don't count). */
export function touchesState(paths: string[], root: string): boolean {
  const base = root.replace(/\/+$/, "");
  return paths.some((p) => p.replace(/\/+$/, "") === base || p.endsWith("/state.json"));
}

export function jobStatus(state: string): Status {
  if (state === "working") return "working";
  if (state === "blocked") return "blocked";
  return "idle";
}

const norm = (s: string) =>
  s
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim()
    .toLowerCase();

/** Same folder, or one inside the other (an agent started in a subfolder of its pane's). */
function related(a: string, b: string): boolean {
  const x = a.replace(/\/+$/, "") || "/";
  const y = b.replace(/\/+$/, "") || "/";
  return x === y || x.startsWith(`${y}/`) || y.startsWith(`${x}/`);
}

/**
 * The job behind an agent pane: same machine, a related folder, and the same name as one of the
 * pane's titles (Claude Code titles its terminal with the session name, so pass that raw title,
 * not only a tab name someone gave it). The same folder beats a nested one, then the newest.
 * With `fallback`, also the only open job in exactly that folder; callers pass it only once every
 * pane has had its chance to match by name, and only for the one pane left in that folder, so a
 * pane can't take another's job.
 */
export function matchJob(
  jobs: Job[],
  machine: string | null,
  cwd: string | null,
  titles: string | (string | null | undefined)[],
  taken: Set<string>,
  fallback = false,
): Job | null {
  if (!cwd) return null;
  const names = new Set(
    (Array.isArray(titles) ? titles : [titles]).map((t) => norm(t ?? "")).filter(Boolean),
  );
  const near = jobs.filter(
    (j) => j.machine === machine && !taken.has(j.id) && j.cwd && related(j.cwd, cwd),
  );
  const named = near
    .filter((j) => names.has(norm(j.name)))
    .sort((a, b) => Number(b.cwd === cwd) - Number(a.cwd === cwd) || b.updated - a.updated);
  if (named.length) return named[0];
  if (!fallback) return null;
  const open = near.filter((j) => j.cwd === cwd && !CLOSED.has(j.state));
  return open.length === 1 ? open[0] : null;
}
