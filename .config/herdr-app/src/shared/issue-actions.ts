// What an issue card's action buttons type into a new agent session. Pure, so tests cover it.

import type { BoardItem } from "./board-model.ts";
import type { AgentRunner, IssueAction } from "./config.ts";

/** Replaces {name} placeholders; unknown ones stay as they are. */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (all, name: string) => vars[name] ?? all);
}

/** The agent's command for a skill: "/review-issue" (Claude, opencode), "/skill:review-issue" (pi). */
export function skillCommand(runner: AgentRunner | undefined, skill: string): string {
  return fill(runner?.skill || "/{skill}", { skill });
}

/** The first message: the skill command and the issue link, or the action's own prompt. */
export function actionPrompt(
  action: IssueAction,
  runner: AgentRunner | undefined,
  item: BoardItem,
): string {
  const command = skillCommand(runner, action.skill);
  const vars = {
    skill: action.skill,
    command,
    url: item.url,
    key: item.key,
    title: item.title,
    repo: item.repo ?? item.where,
    pulls: (item.pulls ?? []).map((p) => p.url).join(" "),
  };
  return action.prompt ? fill(action.prompt, vars) : `${command} ${item.url}`;
}

/** Herdr's program keys to `agents` keys where they differ ("claude-code" → "claude"). */
export function agentKeyOf(program: string | null | undefined): string | null {
  if (!program) return null;
  const k = program.toLowerCase();
  if (k.startsWith("claude")) return "claude";
  if (k.startsWith("opencode")) return "opencode";
  if (k === "pi" || k.startsWith("pi-")) return "pi";
  return k;
}

/**
 * Which agent runs an action: the action's own, else the one in the main window, else the
 * default (`agent.argv`'s program).
 */
export function chooseAgent(
  action: IssueAction,
  main: string | null,
  fallbackArgv: string[],
): string {
  return (
    action.agent ||
    agentKeyOf(main) ||
    agentKeyOf((fallbackArgv[0] ?? "claude").split("/").pop()) ||
    "claude"
  );
}

/** Claude Code, which can run a session in the background (`claude --bg`) instead of in a tab. */
export function runsInBackground(argv: string[]): boolean {
  return agentKeyOf(argv[0]?.split("/").pop()) === "claude";
}

/** `claude --bg` named `name`, so its agent view and the Agents sidebar show it by that name. */
export function backgroundArgv(argv: string[], name: string, task: string): string[] {
  return [...argv, "--bg", "-n", name, task];
}

/** The short id in `claude --bg`'s "backgrounded · 8d1e1774 · name" line, or null. */
export function backgroundId(stdout: string): string | null {
  return /^backgrounded\W+([0-9a-f]{6,})\b/m.exec(stdout)?.[1] ?? null;
}

/** Whether `claude agents --json` lists a background session named `name` (a login shell may print first). */
export function hasBackgroundSession(stdout: string, name: string): boolean {
  const start = stdout.search(/^\[/m);
  if (start < 0) return false;
  try {
    const list = JSON.parse(stdout.slice(start)) as { kind?: string; name?: string }[];
    return list.some((s) => s.kind === "background" && s.name === name);
  } catch {
    return false;
  }
}

/** "Review issue: homedge#12": the tab a button makes, and how a second click finds it. */
export function actionTabName(action: IssueAction, item: BoardItem): string {
  return `${action.label}: ${item.tabName}`;
}
