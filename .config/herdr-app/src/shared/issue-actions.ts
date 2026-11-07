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

/** "Review issue: homedge#12": the tab a button makes, and how a second click finds it. */
export function actionTabName(action: IssueAction, item: BoardItem): string {
  return `${action.label}: ${item.tabName}`;
}
