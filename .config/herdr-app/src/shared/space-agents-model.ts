// How many agents in each space are working, waiting for you or finished: the pure counting
// behind space-agents.ts, so tests can feed it plain rows.

import type { Status } from "herdr";

export interface SpaceAgents {
  working: number;
  blocked: number;
  done: number;
  idle: number;
}

/** What a row of the agents list needs to be counted (see mc-agents/model.ts `Row`). */
export interface CountedRow {
  space: string | null;
  machine: string | null;
  status: Status;
  cwd: string | null;
  depth: number;
  /** A background job without a pane: placed by its folder. */
  job: { cwd: string; updated: number } | null;
}

export interface SpacePlace {
  id: string;
  machine: string | null;
  /** Its terminals' live folders and its own folder. */
  folders: string[];
}

const WEEK = 7 * 86400000;

const inside = (folder: string, path: string): boolean => {
  const f = folder.replace(/\/+$/, "");
  return path === f || path.startsWith(`${f}/`);
};

/** The space on the job's machine whose folder holds it most closely. */
function placeOf(row: CountedRow, places: SpacePlace[]): string | null {
  const cwd = row.job?.cwd ?? row.cwd;
  if (!cwd) return null;
  let best: { id: string; len: number } | null = null;
  for (const p of places) {
    if ((p.machine ?? null) !== (row.machine ?? null)) continue;
    for (const f of p.folders) {
      if (f && inside(f, cwd) && (!best || f.length > best.len)) best = { id: p.id, len: f.length };
    }
  }
  return best?.id ?? null;
}

/** Counts top-level rows by space; background jobs go to the space holding their folder. */
export function countBySpace(
  rows: CountedRow[],
  places: SpacePlace[],
  now = Date.now(),
): Record<string, SpaceAgents> {
  const out: Record<string, SpaceAgents> = {};
  for (const r of rows) {
    if (r.depth > 0) continue;
    if (r.job && now - r.job.updated > WEEK) continue;
    const id = r.space ?? (r.job ? placeOf(r, places) : null);
    if (!id) continue;
    const c = (out[id] ??= { working: 0, blocked: 0, done: 0, idle: 0 });
    c[r.status] += 1;
  }
  return out;
}

/** The most urgent state among a space's agents: blocked > done > working > idle. */
export function urgent(c: SpaceAgents | null | undefined): Status | null {
  if (!c) return null;
  if (c.blocked) return "blocked";
  if (c.done) return "done";
  if (c.working) return "working";
  return c.idle ? "idle" : null;
}
