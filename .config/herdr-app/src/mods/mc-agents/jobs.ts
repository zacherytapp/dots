// Reads Claude Code's job records on one machine through Herdr's `exec({ on })`: open jobs,
// plus any changed in the last two days (so an agent's state follows it to done). Plain POSIX
// tools; remote machines need nothing installed. Each machine is read on its own, so a slow
// one can't hold back the others (main.ts watches this computer's and polls the rest).

import { exec, machines } from "herdr";
import { parseJobs, type Job } from "./jobs-model.ts";

const READER = [
  'cd "$HOME/.claude/jobs" 2>/dev/null || exit 0',
  '{ find . -mindepth 2 -maxdepth 2 -name state.json -mmin -2880; grep -LE \'"state":"(done|failed)"\' */state.json 2>/dev/null; } |',
  "  sed 's#^\\./##' | sort -u | while read -r f; do",
  '    [ -f "$f" ] || continue',
  '    printf "\\036%s\\n" "${f%%/*}"',
  '    cat "$f"',
  '    printf "\\n"',
  "  done",
].join("\n");

/** Connected machines to read jobs on (this computer is `null`, read separately). */
export function jobMachines(): string[] {
  return machines()
    .filter((m) => m.name && m.layout !== "unavailable")
    .map((m) => m.name as string);
}

/** One machine's job records; [] when it can't be reached. */
export async function readJobsOn(machine: string | null): Promise<Job[]> {
  try {
    const r = await exec("sh", ["-c", READER], { on: machine ?? undefined });
    return parseJobs(r.stdout, machine);
  } catch {
    return [];
  }
}
