// The issue board's data: one card per tracker issue, grouped To do / In progress / Done.
// Pure, so tests cover grouping and filtering without the app.

export type Column = "todo" | "progress" | "done";

export const COLUMNS: { id: Column; label: string; tone: string }[] = [
  { id: "todo", label: "To do", tone: "dim" },
  { id: "progress", label: "In progress", tone: "working" },
  { id: "done", label: "Done", tone: "ansi4" },
];

export interface IssueBranch {
  name: string;
  /** The branch on the web, when the host is known. */
  url: string | null;
}

/** A pull request's checks (CI): GitHub's status rollup, Forgejo's combined commit status. */
export type PullChecks = "passing" | "failing" | "pending" | "none";

export interface IssuePull {
  number: number;
  title: string;
  url: string;
  draft: boolean;
  /** Its checks, when known. */
  checks?: PullChecks;
}

export interface BoardItem {
  /** Unique across sources and repos: "github:owner/repo#12", "jira:WEB-142". */
  id: string;
  /** What the card shows as its link: "#12", "WEB-142". */
  key: string;
  title: string;
  url: string;
  column: Column;
  /** The tracker's own state word ("Open", "In Review", "Closed"). */
  status: string;
  /** "owner/repo" or a Jira project, shown under the title in All spaces. */
  where: string;
  priority?: string | null;
  assignees?: string[];
  labels?: string[];
  /** The tracker's color for a label, "#rrggbb", where it has one (GitHub, Forgejo). */
  labelColors?: Record<string, string>;
  /** Comments on the issue, when the tracker says. */
  comments?: number;
  /** Open branches on the remote that name this issue, or that it is linked to (see work-model). */
  branches?: IssueBranch[];
  /** The milestone it is planned for, when the tracker has one. */
  milestone?: string | null;
  /** Open pull requests that close, mention or are built on this issue. */
  pulls?: IssuePull[];
  /** ms since the epoch. */
  updated: number;
  /** A git remote slug to find the space to start work in ("owner/repo"), if any. */
  repo?: string | null;
  /** Short name for a tab started on this card ("WEB-142", "dots#12"). */
  tabName: string;
  /** The first message for an agent started on this card. */
  task: string;
}

export type Filter = "all" | Column;

export function filterItems(items: BoardItem[], filter: Filter, query: string): BoardItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    if (filter !== "all" && item.column !== filter) return false;
    if (!words.length) return true;
    const hay = [
      item.key,
      item.title,
      item.where,
      item.status,
      ...(item.labels ?? []),
      ...(item.assignees ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

export function countByColumn(items: BoardItem[]): Record<Filter, number> {
  const counts: Record<Filter, number> = { all: items.length, todo: 0, progress: 0, done: 0 };
  for (const item of items) counts[item.column]++;
  return counts;
}

const PRIORITY_RANK: Record<string, number> = {
  highest: 0,
  critical: 0,
  blocker: 0,
  urgent: 0,
  high: 1,
  major: 1,
  medium: 2,
  normal: 2,
  low: 3,
  minor: 3,
  lowest: 4,
  trivial: 4,
};

/** Most urgent first, then most recently updated. */
export function sortItems(items: BoardItem[]): BoardItem[] {
  const rank = (p?: string | null) => PRIORITY_RANK[(p ?? "").toLowerCase()] ?? 2.5;
  return [...items].sort((a, b) => rank(a.priority) - rank(b.priority) || b.updated - a.updated);
}

/** In progress when assigned or labelled so; done when closed. Shared by GitHub and Forgejo. */
export function columnFor(open: boolean, assignees: string[], labels: string[]): Column {
  if (!open) return "done";
  const status = statusFromLabels(labels);
  if (status) return columnForStatus(status, open);
  if (labels.some((l) => /progress|doing|wip|started|review/i.test(l))) return "progress";
  return assignees.length ? "progress" : "todo";
}

/**
 * A status kept as a label, the way Forgejo's scoped labels and many GitHub repos do it:
 * "status/in-progress", "Status: Review", "state::blocked", "stage/QA". Null when none is.
 */
export function statusFromLabels(labels: string[]): string | null {
  for (const l of labels) {
    const m = /^(status|state|stage|workflow)\s*(?:\/|::?)\s*(.+)$/i.exec(l.trim());
    if (m) {
      const word = m[2].replace(/[-_]+/g, " ").trim();
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
  }
  return null;
}

/** Which column a status word means: a board's "In Review" is in progress, "Shipped" is done. */
export function columnForStatus(status: string, open: boolean): Column {
  if (
    /\b(done|complete[d]?|closed|shipped|released|merged|resolved|fixed|won.?t|not planned|duplicate)\b/i.test(
      status,
    )
  )
    return "done";
  if (!open) return "done";
  if (/\b(backlog|to ?do|todo|new|open|triage|ready|planned|icebox|later)\b/i.test(status))
    return "todo";
  return "progress";
}
