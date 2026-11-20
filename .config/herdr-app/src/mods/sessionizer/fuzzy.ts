// fzf-style matching for the sessionizer picker: every space-separated term must appear in the
// candidate as a subsequence (case-insensitive unless the term has a capital). Matches that start
// words, run together or land in the last path segment rank higher; ties go to the shorter path.

export interface Match {
  text: string;
  score: number;
  /** Indexes into `text` of the matched characters, ascending. */
  positions: number[];
}

const BOUNDARY = new Set(["/", ".", "_", "-", " ", "~"]);

/** Scores one term against `text` from `from` on, greedily from the best start; null if absent. */
function matchTerm(
  text: string,
  term: string,
  baseStart: number,
): { score: number; positions: number[] } | null {
  const hay = /[A-Z]/.test(term) ? text : text.toLowerCase();
  let best: { score: number; positions: number[] } | null = null;
  // Try every place the first character occurs and keep the best-scoring run.
  for (let start = hay.indexOf(term[0]); start !== -1; start = hay.indexOf(term[0], start + 1)) {
    const positions: number[] = [];
    let score = 0;
    let at = start;
    for (const ch of term) {
      const i = hay.indexOf(ch, at);
      if (i === -1) return best;
      const prev = positions.at(-1);
      score += 1;
      if (prev !== undefined && i === prev + 1) score += 4;
      if (i === 0 || BOUNDARY.has(text[i - 1])) score += 3;
      if (i >= baseStart) score += 2;
      positions.push(i);
      at = i + 1;
    }
    // Penalise gaps between the first and last matched character.
    score -= (positions.at(-1)! - positions[0] + 1 - term.length) * 0.2;
    if (!best || score > best.score) best = { score, positions };
  }
  return best;
}

/** Scores `text` against a query; null when some term doesn't match. An empty query matches all. */
export function fuzzyMatch(text: string, query: string): Match | null {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return { text, score: 0, positions: [] };
  const baseStart = text.lastIndexOf("/") + 1;
  const all = new Set<number>();
  let score = 0;
  for (const term of terms) {
    const m = matchTerm(text, term, baseStart);
    if (!m) return null;
    score += m.score;
    for (const p of m.positions) all.add(p);
  }
  return { text, score, positions: [...all].sort((a, b) => a - b) };
}

/** The candidates matching `query`, best first (input order kept for an empty query). */
export function fuzzyFilter(items: string[], query: string): Match[] {
  const out: Match[] = [];
  for (const text of items) {
    const m = fuzzyMatch(text, query);
    if (m) out.push(m);
  }
  if (!query.trim()) return out;
  return out.sort((a, b) => b.score - a.score || a.text.length - b.text.length);
}

/** Splits `text` into runs for drawing, each marked whether its characters matched. */
export function segments(text: string, positions: number[]): { text: string; hit: boolean }[] {
  const hits = new Set(positions);
  const out: { text: string; hit: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const hit = hits.has(i);
    const last = out.at(-1);
    if (last && last.hit === hit) last.text += text[i];
    else out.push({ text: text[i], hit });
  }
  return out;
}
