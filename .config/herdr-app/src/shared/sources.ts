// The side panel's sources, in strip order. Each is a child of the layout's `panel-body`
// stack; the tab bar and the panel's navigation strip both draw them from this list.

import type { IconName } from "./icon-data.ts";

export interface Source {
  /** The `panel-body` child id. */
  id: string;
  label: string;
  short: string;
  /** Its icon (Lucide, or a brand mark). */
  icon: IconName;
}

export const SOURCES: Source[] = [
  { id: "files", label: "Files", short: "Files", icon: "files" },
  { id: "changes", label: "Changes", short: "Changes", icon: "file-diff" },
  { id: "issues", label: "GitHub issues", short: "Issues", icon: "circle-dot" },
  { id: "pulls", label: "Pull requests", short: "PRs", icon: "git-pull-request" },
  { id: "branches", label: "Branches", short: "Branches", icon: "git-branch" },
  { id: "forgejo", label: "Forgejo issues", short: "Forgejo", icon: "forgejo" },
  { id: "jira", label: "Jira", short: "Jira", icon: "jira" },
  { id: "sessions", label: "Previous sessions", short: "Sessions", icon: "history" },
];

/** Layout node ids the tab bar and the sidebar mods look for. */
export const NODES = {
  sidebar: "sidebar",
  spaces: "mc-spaces",
  agents: "mc-agents",
  panel: "panel",
  body: "panel-body",
} as const;

/** Shared-state keys (`shared()` / `setShared()`), one place so mods agree. */
export const KEYS = {
  agentsHeight: "mc.agents.height",
  agentsFolded: "mc.agents.folded",
  spacesFolded: "mc.spaces.folded",
  /** Per source: "space" or "all". */
  scope: (source: string) => `mc.${source}.scope`,
} as const;
