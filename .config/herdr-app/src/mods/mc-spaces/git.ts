// A space's git state for its row: commits to pull and to push, and uncommitted changes. Read
// on the space's own machine in its first terminal's folder; "behind" is as of the last fetch,
// which mc-spaces runs in the background every few minutes. Pure parsing here, so it is tested.

export interface GitState {
  /** The checked-out branch, or null when detached. */
  branch: string | null;
  /** Its upstream (`origin/main`), or null when it has none. */
  upstream: string | null;
  /** Commits to push: ahead of the upstream, or with no upstream, on no remote at all. */
  ahead: number;
  /** Commits to pull from the upstream (as of the last fetch). */
  behind: number;
  /** Changed (staged, unstaged or conflicted) tracked files. */
  changed: number;
  untracked: number;
}

/**
 * Prints `git status --porcelain=v2 --branch`, then for a branch with no upstream in a repo with
 * remotes, `# local.unpushed <n>`: the commits no remote has. Never takes git's index lock.
 */
export const STATUS_SCRIPT = [
  "git --no-optional-locks status --porcelain=v2 --branch || exit 1",
  'if ! git rev-parse -q --verify "@{u}" >/dev/null 2>&1 && [ -n "$(git remote)" ] &&',
  "  git symbolic-ref -q HEAD >/dev/null; then",
  '  printf "# local.unpushed %s\\n" "$(git rev-list --count HEAD --not --remotes 2>/dev/null)"',
  "fi",
].join("\n");

/** Fetches the branch's remote without ever asking for a password or passphrase. */
export const FETCH_SCRIPT =
  'GIT_TERMINAL_PROMPT=0 GIT_SSH_COMMAND="ssh -o BatchMode=yes -o ConnectTimeout=8" git fetch --quiet --no-tags';

export function parseStatus(stdout: string): GitState {
  const s: GitState = {
    branch: null,
    upstream: null,
    ahead: 0,
    behind: 0,
    changed: 0,
    untracked: 0,
  };
  for (const line of stdout.split("\n")) {
    if (line.startsWith("# branch.head ")) {
      const head = line.slice(14).trim();
      s.branch = head === "(detached)" ? null : head;
    } else if (line.startsWith("# branch.upstream ")) {
      s.upstream = line.slice(18).trim() || null;
    } else if (line.startsWith("# branch.ab ")) {
      const m = /\+(\d+) -(\d+)/.exec(line);
      if (m) {
        s.ahead = Number(m[1]);
        s.behind = Number(m[2]);
      }
    } else if (line.startsWith("# local.unpushed ")) {
      if (!s.upstream) s.ahead = Number(line.slice(17).trim()) || 0;
    } else if (/^[12u] /.test(line)) {
      s.changed += 1;
    } else if (line.startsWith("? ")) {
      s.untracked += 1;
    }
  }
  return s;
}

/** What the row's git chips say, for their tooltip. */
export function describe(s: GitState): string {
  const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;
  const lines: string[] = [];
  if (s.behind) lines.push(`${plural(s.behind, "commit")} to pull from ${s.upstream}`);
  if (s.ahead)
    lines.push(
      s.upstream
        ? `${plural(s.ahead, "commit")} to push to ${s.upstream}`
        : `${plural(s.ahead, "commit")} on no remote (${s.branch ?? "HEAD"} has no upstream)`,
    );
  if (s.changed) lines.push(`${plural(s.changed, "changed file")}, not committed`);
  if (s.untracked) lines.push(`${plural(s.untracked, "untracked file")}`);
  return lines.join("\n");
}

/**
 * Reads several folders in one process (one ssh round trip per machine): prints `@@@ <index>`
 * before each folder's status. A folder that isn't a repo prints nothing after its marker.
 */
export const BATCH_SCRIPT = [
  "i=0",
  'for d in "$@"; do',
  '  printf "@@@ %s\\n" "$i"',
  '  ( cd "$d" 2>/dev/null && {',
  STATUS_SCRIPT,
  "  } ) 2>/dev/null",
  "  i=$((i + 1))",
  "done",
].join("\n");

/** Splits BATCH_SCRIPT's output into one state per folder; null for a folder outside a repo. */
export function parseBatch(stdout: string, count: number): (GitState | null)[] {
  const parts: string[] = Array.from({ length: count }, () => "");
  let at = -1;
  for (const line of stdout.split("\n")) {
    const m = /^@@@ (\d+)$/.exec(line);
    if (m) at = Number(m[1]);
    else if (at >= 0 && at < count) parts[at] += `${line}\n`;
  }
  return parts.map((p) => (p.includes("# branch.head ") ? parseStatus(p) : null));
}

/** How long to leave an unreachable machine alone after `failures` failed reads in a row. */
export function backoff(failures: number, base = 15000, max = 5 * 60000): number {
  if (failures <= 0) return 0;
  return Math.min(max, base * 2 ** (failures - 1));
}
