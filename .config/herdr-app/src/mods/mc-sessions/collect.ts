// Reads recent Claude Code sessions on this computer and every connected machine, through
// Herdr's `exec({ on })`: `find` lists them, `tail` reads only those that changed since the
// last look. Plain POSIX tools, so remote machines need nothing installed.

import { exec, machines } from "herdr";
import { loadConfig } from "../../shared/config.ts";
import { parseListing, parseTail, splitFiles, type FileEntry, type Session } from "./parse.ts";

const LIST =
  'find "$HOME/.claude/projects" -mindepth 2 -maxdepth 2 -name "*.jsonl" -size +1k -mtime "-$1" -printf "%T@\\t%s\\t%p\\n" 2>/dev/null | sort -rn | head -n "$2"';
const TAILS = 'for f in "$@"; do printf "\\036%s\\n" "$f"; tail -c 98304 "$f"; printf "\\n"; done';
/** Files per `tail` call: 12 × 96 KB stays well under exec's 8 MiB. */
const BATCH = 12;

const cache = new Map<string, { size: number; mtime: number; session: Session }>();

export interface Collected {
  sessions: Session[];
  /** Machines that couldn't be read, with why. */
  failed: { machine: string; why: string }[];
}

async function onMachine(machine: string | null, days: number, limit: number): Promise<Session[]> {
  const on = machine ?? undefined;
  const list = await exec("sh", ["-c", LIST, "sh", String(days), String(limit)], { on });
  const entries = parseListing(list.stdout);
  const key = (e: FileEntry) => `${machine ?? ""}\0${e.path}`;
  const stale = entries.filter((e) => {
    const hit = cache.get(key(e));
    return !hit || hit.size !== e.size || hit.mtime !== e.mtime;
  });
  for (let i = 0; i < stale.length; i += BATCH) {
    const batch = stale.slice(i, i + BATCH);
    const r = await exec("sh", ["-c", TAILS, "sh", ...batch.map((e) => e.path)], { on });
    const texts = splitFiles(r.stdout);
    for (const e of batch) {
      cache.set(key(e), {
        size: e.size,
        mtime: e.mtime,
        session: parseTail(e, machine, texts.get(e.path) ?? ""),
      });
    }
  }
  return entries.map((e) => cache.get(key(e))?.session).filter((s): s is Session => Boolean(s));
}

export async function collect(): Promise<Collected> {
  const config = (await loadConfig()).sessions;
  const remote = machines()
    .filter((m) => m.name && m.layout !== "unavailable")
    .map((m) => m.name as string);
  const failed: Collected["failed"] = [];
  const results = await Promise.all(
    [null, ...remote].map((m) =>
      onMachine(m, config.days, config.limit).catch((e: unknown) => {
        failed.push({ machine: m ?? "this computer", why: String((e as Error)?.message ?? e) });
        return [] as Session[];
      }),
    ),
  );
  const sessions = results
    .flat()
    .filter((s) => !s.continued)
    .sort((a, b) => b.updated - a.updated);
  return { sessions, failed };
}
