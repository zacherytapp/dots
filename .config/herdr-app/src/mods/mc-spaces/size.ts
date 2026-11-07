// How tall the Spaces block wants to be. Pure, so the floating behavior is tested directly.
// Pixel sizes match what main.ts draws.

export const HEADER = 34;
export const SEARCH = 38;
export const ROW = 32;
export const GROUP = 26;
export const GAP = 2;
export const PAD = 8;
/** Agents always keeps at least this much under Spaces before Spaces starts scrolling. */
export const AGENTS_MIN = 220;
/** Before Agents has reported its height, Spaces grows at most this tall. */
export const FIRST_MAX = 360;

export interface SizeInput {
  /** Space rows shown (or 1 for the "no spaces" line). */
  rows: number;
  /** Machine headers shown (0 when only this computer has spaces). */
  groups: number;
  /** The search field is shown. */
  searching: boolean;
  spacesFolded: boolean;
  agentsFolded: boolean;
  /** Spaces' height plus Agents' height now: what the two share. Null until both are known. */
  available: number | null;
}

/** Exactly the rows' height: header, search, rows, machine headers, gaps and bottom padding. */
export function contentHeight(rows: number, groups: number, searching: boolean): number {
  const items = rows + groups;
  return (
    HEADER +
    (searching ? SEARCH : 0) +
    rows * ROW +
    groups * GROUP +
    Math.max(0, items - 1) * GAP +
    PAD
  );
}

/** The px Spaces should be: its content, capped so Agents keeps AGENTS_MIN; all of it when Agents is folded. */
export function targetHeight(input: SizeInput): number {
  if (input.spacesFolded) return HEADER;
  const content = contentHeight(input.rows, input.groups, input.searching);
  if (input.available === null) return Math.min(content, FIRST_MAX);
  if (input.agentsFolded) return Math.max(HEADER, input.available - HEADER);
  return Math.max(HEADER, Math.min(content, input.available - AGENTS_MIN));
}
