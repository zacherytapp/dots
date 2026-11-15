// What a tab pill says. Pure, so the naming rules are tested directly.

import type { PaneInfo, TabInfo } from "herdr";
import { baseName, cleanTitle } from "../../shared/util.ts";

export interface TabLabel {
  /** The big text: a name someone typed, else what the agent says it's doing, else the program. */
  name: string;
  /** The small text: folder, and branch when it isn't main/master. */
  detail: string;
  /** What a compact pill says beside the program icon, at most SHORT characters: the name, or
   *  the folder when the name would only repeat the program the icon already shows. */
  short: string;
  /** Full path, branch and panes, for the tooltip. */
  tooltip: string;
  /** The pane whose program and folder the pill shows. */
  lead: PaneInfo | null;
}

/** The pane a tab is best described by: its first agent, else its focused pane, else its first. */
export function leadPane(tab: TabInfo, all: PaneInfo[]): PaneInfo | null {
  const mine = all.filter((p) => p.tab === tab.id);
  return mine.find((p) => p.program?.agent) ?? mine.find((p) => p.focused) ?? mine[0] ?? null;
}

/** How many characters a compact pill shows. */
export const SHORT = 8;

/** Cuts text to `max` characters (by code point), the last one an ellipsis. */
export function clip(text: string, max = SHORT): string {
  const chars = [...text.trim()];
  return chars.length <= max
    ? chars.join("")
    : `${chars
        .slice(0, max - 1)
        .join("")
        .trimEnd()}…`;
}

const SHELL_TITLE = /^[\w.-]+@[\w.-]+[:\s]|^[~/]|^[A-Za-z]:\\/;

export function tabLabel(tab: TabInfo, all: PaneInfo[], home: string): TabLabel {
  const lead = leadPane(tab, all);
  const program = lead?.program;
  const title = cleanTitle(lead?.title);
  const telling =
    title &&
    !SHELL_TITLE.test(title) &&
    ![program?.name, program?.key].some((v) => v && v.toLowerCase() === title.toLowerCase()) &&
    !/^(claude(?: code)?|zsh|bash|fish|sh)$/i.test(title);
  const name = tab.named ? tab.name : telling ? title : (program?.name ?? `Tab ${tab.index}`);
  const folder = lead?.cwd ? (lead.cwd === home ? "~" : baseName(lead.cwd)) : "";
  const short = clip(tab.named || telling || !program?.icon ? name : folder || name);
  const branch = lead?.branch && !["main", "master"].includes(lead.branch) ? lead.branch : "";
  const detail = [folder, branch].filter(Boolean).join(" · ");
  const tooltip = [
    name,
    lead?.cwd ? lead.cwd.replace(home, "~") : null,
    lead?.branch ? `branch ${lead.branch}` : null,
    program?.name && program.name !== name ? program.name : null,
    tab.panes > 1 ? `${tab.panes} panes` : null,
  ]
    .filter(Boolean)
    .join("\n");
  return { name, detail: detail === name ? "" : detail, short, tooltip, lead };
}
