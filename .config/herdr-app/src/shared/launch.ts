// Starting work: an agent in the right space for a card, resuming a session, opening links.

import {
  exec,
  focused,
  home,
  knownAgents,
  notify,
  panes,
  run,
  setShared,
  shared,
  spaces,
  type PaneInfo,
  type Program,
  type SpaceInfo,
} from "herdr";
import type { BoardItem } from "./board-model.ts";
import { loadConfig, type IssueAction } from "./config.ts";
import {
  actionPrompt,
  actionTabName,
  agentKeyOf,
  backgroundArgv,
  backgroundId,
  chooseAgent,
  hasBackgroundSession,
  runsInBackground,
} from "./issue-actions.ts";
import { activeSpace, repoOf, spaceFolder, spacesForSlug } from "./repo.ts";

/** The tab already named `name`, in any space. */
export function findTab(name: string): { space: SpaceInfo; tab: string } | null {
  for (const space of spaces()) {
    const tab = space.tabs.find((t) => t.named && t.name === name);
    if (tab) return { space, tab: tab.id };
  }
  return null;
}

/** Every named tab's name, in every space: one look per render instead of one per button. */
export function namedTabs(): Set<string> {
  return new Set(spaces().flatMap((s) => s.tabs.filter((t) => t.named).map((t) => t.name)));
}

/**
 * The names of Claude Code's background sessions on every machine (its job records: what its
 * agent view lists until `claude rm`). mc-agents publishes them as it reads the jobs; a start
 * from here adds its own at once.
 */
export const SESSIONS_KEY = "mc.agents.sessions";

export function backgroundSessions(): Set<string> {
  const v = shared(SESSIONS_KEY);
  return new Set(Array.isArray(v) ? v.filter((n): n is string => typeof n === "string") : []);
}

/** Publishes the session names, only when they changed (every mod re-renders on a change). */
export function publishSessions(names: Iterable<string>): void {
  const next = [...new Set(names)].sort();
  const now = [...backgroundSessions()].sort();
  if (next.join("\n") !== now.join("\n")) setShared(SESSIONS_KEY, next);
}

export interface Work {
  /** The session's (or tab's) name, which is also how a second click finds it ("WEB-142"). */
  name: string;
  task: string;
  /** "owner/repo" to choose the space by; else the shown space. */
  repo?: string | null;
  /** The agent to start; else `agent.argv` from the settings. */
  argv?: string[];
}

/**
 * Starts an agent on a piece of work, in a space checked out at its repo (the shown one when
 * it is, else the first), or in the shown space. Claude Code runs as a background session, with
 * no tab: its agent view and the Agents sidebar list it, and the sidebar opens it. Other agents
 * get a tab. A second click shows the tab already open for it, or says it is already running.
 */
export async function startWork(work: Work): Promise<void> {
  const existing = findTab(work.name);
  if (existing) {
    run("space.select", { id: existing.space.id });
    run("tab.select", { id: existing.tab });
    return;
  }
  if (backgroundSessions().has(work.name)) {
    alreadyRunning(work.name);
    return;
  }
  const config = await loadConfig();
  let space = activeSpace();
  if (work.repo) {
    const candidates = await spacesForSlug(work.repo);
    space = candidates.find((s) => s.active) ?? candidates[0] ?? space;
  }
  const argv = work.argv?.length ? work.argv : config.agent.argv;
  if (runsInBackground(argv)) {
    await startInBackground(space, argv, work);
    return;
  }
  if (space && !space.active) run("space.select", { id: space.id });
  run("tab.new", {
    name: work.name,
    ...(space ? { space: space.id } : {}),
    argv,
    task: work.task,
  });
}

function alreadyRunning(name: string): void {
  notify({
    title: "Already started",
    body: `${name}: open it from Agents, or remove it in \`claude agents\` to start again.`,
    level: "info",
    timeout: 5000,
  });
}

/**
 * Runs argv in the interactive login shell on a space's machine, as Herdr's own launcher does,
 * so it finds what a terminal there would (~/.local/bin is often added only by ~/.zshrc). The
 * shell's own startup chatter (zle, prompt plugins) is dropped; the command's stderr is kept.
 */
function inLoginShell(argv: string[], cwd: string, machine: string | null) {
  const script = `exec "\${SHELL:-/bin/sh}" -lic 'exec "$@" 2>&3' "$0" "$@" 3>&2 2>/dev/null </dev/null`;
  return exec("sh", ["-c", script, "sh", ...argv], {
    ...(cwd ? { cwd } : {}),
    on: machine ?? undefined,
  });
}

/** `claude --bg` in the space's repo (else its folder), on its machine; reports how it went. */
async function startInBackground(
  space: SpaceInfo | null,
  argv: string[],
  work: Work,
): Promise<void> {
  const machine = space?.machine ?? null;
  const cwd = space
    ? ((await repoOf(space).catch(() => null))?.root ?? spaceFolder(space))
    : home();
  try {
    const listed = await inLoginShell([argv[0], "agents", "--json"], cwd, machine);
    if (hasBackgroundSession(listed.stdout, work.name)) {
      alreadyRunning(work.name);
      return;
    }
    const r = await inLoginShell(backgroundArgv(argv, work.name, work.task), cwd, machine);
    if (r.code !== 0) throw new Error(r.stderr.trim() || r.stdout.trim() || `exit ${r.code}`);
    const id = backgroundId(r.stdout);
    publishSessions([...backgroundSessions(), work.name]);
    notify({
      title: "Started in the background",
      body: `${work.name}${id ? ` (${id})` : ""}: in Agents and \`claude agents\`.`,
      level: "success",
      timeout: 4000,
    });
  } catch (e) {
    notify({
      title: `Couldn't start ${work.name}`,
      body: String((e as Error)?.message ?? e).slice(-300),
      level: "error",
    });
  }
}

/** Opens a link in the default browser on this computer. */
export async function openUrl(url: string): Promise<void> {
  try {
    const r = await exec("xdg-open", [url]);
    if (r.code !== 0) throw new Error(r.stderr || `xdg-open exited ${r.code}`);
  } catch (e) {
    notify({
      title: "Couldn't open link",
      body: String((e as Error)?.message ?? e).slice(0, 200),
      level: "error",
    });
  }
}

/** Copies text to the clipboard on this computer (Wayland, then X11). */
export async function copyText(text: string): Promise<void> {
  const tries: [string, string[]][] = [
    ["wl-copy", [text]],
    ["sh", ["-c", 'printf %s "$1" | xclip -selection clipboard', "sh", text]],
  ];
  for (const [cmd, args] of tries) {
    try {
      if ((await exec(cmd, args)).code === 0) {
        notify({ title: "Copied", body: text.slice(0, 120), level: "success", timeout: 2000 });
        return;
      }
    } catch {
      // try the next one
    }
  }
  notify({ title: "Couldn't copy", body: "Neither wl-copy nor xclip worked.", level: "error" });
}

/**
 * The agent the main window shows: the focused pane's, else one in the shown tab, else one in
 * the shown space. Null when no agent is open there.
 */
export function mainWindowAgent(): Program | null {
  const all = panes();
  const f = focused();
  const isAgent = (p: PaneInfo | undefined) => Boolean(p?.program?.agent || p?.app);
  const focusedPane = all.find((p) => p.pane === f?.pane);
  if (focusedPane && isAgent(focusedPane)) return focusedPane.program;
  const inTab = all.find((p) => p.tab === f?.tab && isAgent(p));
  if (inTab) return inTab.program;
  const space = spaces().find((s) => s.id === f?.space) ?? spaces().find((s) => s.active);
  const tabs = new Set(space?.tabs.map((t) => t.id) ?? []);
  return all.find((p) => tabs.has(p.tab) && isAgent(p))?.program ?? null;
}

/** The agent an action will start, for its button's tooltip and icon. */
export async function actionAgent(
  action: IssueAction,
): Promise<{ key: string; argv: string[]; program: Program | null }> {
  const config = await loadConfig();
  const main = mainWindowAgent();
  const key = chooseAgent(action, main?.key ?? null, config.agent.argv);
  const known = await knownAgents().catch(() => []);
  const entry = known.find((a) => agentKeyOf(a.key) === key);
  const argv = config.agents[key]?.argv?.length
    ? (config.agents[key].argv as string[])
    : (entry?.run ?? [key]);
  const program = agentKeyOf(main?.key) === key ? main : (entry ?? null);
  return { key, argv, program };
}

/** Runs an issue card's action: a new session of the main window's agent, given the skill and the link. */
export async function runIssueAction(action: IssueAction, item: BoardItem): Promise<void> {
  const config = await loadConfig();
  const { key, argv } = await actionAgent(action);
  await startWork({
    name: actionTabName(action, item),
    task: actionPrompt(action, config.agents[key], item),
    repo: item.repo,
    argv,
  });
}
