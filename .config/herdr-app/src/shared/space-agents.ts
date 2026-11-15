// How many agents in each space are working, waiting for you or finished. mc-agents works out
// every agent's real state (also Claude Code started from a shell, which Herdr's own space status
// misses) and publishes the counts here; mc-spaces draws them on each space's row.

import { setShared, shared } from "herdr";
import type { SpaceAgents } from "./space-agents-model.ts";

export { countBySpace, urgent, type SpaceAgents } from "./space-agents-model.ts";

export const SPACE_AGENTS_KEY = "mc.agents.bySpace";

/** Publishes the counts, only when they changed (every mod re-renders on a change). */
export function publishSpaceAgents(counts: Record<string, SpaceAgents>): void {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  if (JSON.stringify(shared(SPACE_AGENTS_KEY)) === JSON.stringify(sorted)) return;
  setShared(SPACE_AGENTS_KEY, sorted);
}

/** The published counts, or null when mc-agents hasn't published any (not in the layout). */
export function spaceAgents(): Record<string, SpaceAgents> | null {
  const v = shared(SPACE_AGENTS_KEY);
  return v && typeof v === "object" ? (v as Record<string, SpaceAgents>) : null;
}
