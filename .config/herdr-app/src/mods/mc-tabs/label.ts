// What a tab pill says. Pure, so the naming rules are tested directly.

import type { PaneInfo, TabInfo } from "herdr";
import { baseName, cleanTitle } from "../../shared/util.ts";

export interface TabLabel {
  /** The big text: a name someone typed, else what the agent says it's doing, else the program. */
  name: string;
  /** The small text: folder, and branch when it isn't main/master. */
  detail: string;
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
  return { name, detail: detail === name ? "" : detail, tooltip, lead };
}
