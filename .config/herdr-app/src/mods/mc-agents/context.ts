// How much context each Claude Code agent is using, read from its session file on the machine
// it runs on (one `exec` per machine). A row whose Claude Code job is known reads exactly that
// session's file. Without one, a folder's newest session is read only when that row is the one
// Claude agent in the folder: otherwise it could be another agent's, and the number would lie.

import { exec } from "herdr";
import { claudeProjectDir } from "../../shared/util.ts";
import type { Row } from "./model.ts";
import { parseUsage, splitBlocks, type Usage } from "./usage.ts";

export interface Reading extends Usage {
  at: number;
}

// Each argument is "f:<dir>/<session>.jsonl" (that file) or "d:<dir>" (its newest file).
const READER = [
  'for a in "$@"; do',
  "  f=",
  '  case "$a" in',
  '    f:*) f="$HOME/.claude/projects/${a#f:}" ;;',
  '    d:*) f=$(ls -t "$HOME/.claude/projects/${a#d:}"/*.jsonl 2>/dev/null | head -n 1) ;;',
  "  esac",
  '  [ -n "$f" ] && [ -f "$f" ] || continue',
  '  printf "\\036%s\\n" "$a"',
  // An image the agent just read is one line of megabytes: look further back past it.
  "  for n in 400000 4000000 16000000; do",
  '    l=$(tail -c "$n" "$f" | grep \'"type":"assistant"\' | tail -n 1)',
  '    [ -n "$l" ] && break',
  "  done",
  '  printf "%s\\n" "$l"',
  "done",
].join("\n");

const isClaude = (r: Row) => r.program?.key === "claude" || /claude/i.test(r.program?.name ?? "");

/** Agent address → its reading. */
export async function readContexts(rows: Row[]): Promise<Map<string, Reading>> {
  const byMachine = new Map<string | null, Map<string, Row[]>>();
  const add = (r: Row, arg: string) => {
    const args = byMachine.get(r.machine) ?? new Map<string, Row[]>();
    args.set(arg, [...(args.get(arg) ?? []), r]);
    byMachine.set(r.machine, args);
  };
  // Claude agents per machine and folder: a folder's newest session is only a safe guess for
  // the one agent there, counting agents whose session is known.
  const here = new Map<string, number>();
  const where = (r: Row) => JSON.stringify([r.machine, r.job?.cwd ?? r.cwd]);
  for (const r of rows) if (r.job || isClaude(r)) here.set(where(r), (here.get(where(r)) ?? 0) + 1);
  for (const r of rows) {
    if (r.job?.sessionId && r.job.cwd) {
      add(r, `f:${claudeProjectDir(r.job.cwd)}/${r.job.sessionId}.jsonl`);
    } else if (isClaude(r) && r.cwd && here.get(where(r)) === 1) {
      add(r, `d:${claudeProjectDir(r.cwd)}`);
    }
  }
  const out = new Map<string, Reading>();
  await Promise.all(
    [...byMachine].map(async ([machine, args]) => {
      const usable = [...args];
      if (!usable.length) return;
      try {
        const r = await exec("sh", ["-c", READER, "sh", ...usable.map(([a]) => a)], {
          on: machine ?? undefined,
        });
        const lines = splitBlocks(r.stdout);
        for (const [arg, rs] of usable) {
          const usage = parseUsage(lines.get(arg) ?? "");
          if (usage) for (const row of rs) out.set(row.address, { ...usage, at: Date.now() });
        }
      } catch {
        // machine away: no reading
      }
    }),
  );
  return out;
}
