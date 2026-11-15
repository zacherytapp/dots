// Small pure helpers shared by every mod. No `herdr` or `gpui-kit` imports, so tests can load it.

export interface LayoutNode {
  id?: string;
  type?: string;
  hidden?: boolean;
  active?: string;
  size?: { px?: number; weight?: number };
  children?: LayoutNode[];
}

/** The layout node with this id, searching depth first. */
export function findNode(node: unknown, id: string): LayoutNode | null {
  const n = node as LayoutNode | null | undefined;
  if (!n) return null;
  if (n.id === id) return n;
  for (const child of n.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

/** A terminal title without its leading spinner or status glyphs ("✳ Fix login" → "Fix login"). */
export function cleanTitle(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim();
}

export function baseName(path: string | null | undefined): string {
  const trimmed = (path ?? "").replace(/\/+$/, "");
  return trimmed.split("/").pop() || trimmed || "/";
}

/** "~/projects/dots" for a path under `home`. */
export function tildify(path: string | null | undefined, home: string): string {
  if (!path) return "";
  if (home && (path === home || path.startsWith(`${home}/`))) return `~${path.slice(home.length)}`;
  return path;
}

/** "<1m", "4m", "3h", "2d": how long ago or how long for. */
export function duration(ms: number): string {
  const m = Math.floor(Math.max(0, ms) / 60000);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 60 ? `${d}d` : `${Math.floor(d / 30)}mo`;
}

/** "just now", "5m ago", "3d ago". */
export function ago(when: number | string | null | undefined, now = Date.now()): string {
  const t = typeof when === "string" ? Date.parse(when) : (when ?? NaN);
  if (!Number.isFinite(t)) return "";
  const ms = now - t;
  if (ms < 60000) return "just now";
  return `${duration(ms)} ago`;
}

/** 205312 → "205k", 1250000 → "1.3M". */
export function compactNumber(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}k`;
  return String(n);
}

/** Case-insensitive "every word appears somewhere in the haystack". */
export function matches(query: string, ...hay: (string | null | undefined)[]): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = hay.filter(Boolean).join(" ").toLowerCase();
  return words.every((w) => text.includes(w));
}

/**
 * The item `step` places away from the one at `current` in `list`, wrapping at either end. With
 * no current one (-1), the first going forward and the last going back. Null for an empty list.
 */
export function stepIn<T>(list: T[], current: number, step: 1 | -1): T | null {
  if (!list.length) return null;
  if (current < 0 || current >= list.length) return list[step === 1 ? 0 : list.length - 1];
  return list[(current + step + list.length) % list.length];
}

/** Claude Code's project folder name for a working directory. */
export function claudeProjectDir(cwd: string): string {
  return cwd.replace(/[^A-Za-z0-9]/g, "-");
}

/** Parses JSON, or returns `fallback` when it isn't. */
export function parseJson<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

/** `fn` over every item with at most `limit` running at once, results in input order. */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, worker));
  return out;
}
