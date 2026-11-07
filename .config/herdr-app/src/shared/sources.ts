// The side panel's sources, in strip order. Each is a child of the layout's `panel-body`
// stack; the tab bar and the panel's navigation strip both draw them from this list.

export interface Source {
  /** The `panel-body` child id. */
  id: string;
  label: string;
  short: string;
  /** An icon path under ~/.config/herdr-app, or a src/assets name for `asset()`. */
  icon: string;
  /** True when `icon` names a src/assets file. */
  own: boolean;
}

export const SOURCES: Source[] = [
  { id: "files", label: "Files", short: "Files", icon: "mods/files/file.svg", own: false },
  {
    id: "changes",
    label: "Changes",
    short: "Changes",
    icon: "mods/changes/changes.svg",
    own: false,
  },
  { id: "issues", label: "GitHub issues", short: "Issues", icon: "issue", own: true },
  { id: "pulls", label: "Pull requests", short: "PRs", icon: "pull-request", own: true },
  {
    id: "branches",
    label: "Branches",
    short: "Branches",
    icon: "mods/workspace-chrome/git-branch.svg",
    own: false,
  },
  { id: "forgejo", label: "Forgejo issues", short: "Forgejo", icon: "forgejo", own: true },
  { id: "jira", label: "Jira", short: "Jira", icon: "jira", own: true },
  { id: "sessions", label: "Previous sessions", short: "Sessions", icon: "history", own: true },
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
