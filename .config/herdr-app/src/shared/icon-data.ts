// The icons in src/assets, as text: esbuild inlines them (loader "text"), and installIcons()
// writes them beside the mod, since Herdr will not draw an SVG that is a symlink out of its folder.

import agent from "../assets/agent.svg";
import close from "../assets/close.svg";
import comment from "../assets/comment.svg";
import expand from "../assets/expand.svg";
import external from "../assets/external.svg";
import eye from "../assets/eye.svg";
import forgejo from "../assets/forgejo.svg";
import history from "../assets/history.svg";
import issue from "../assets/issue.svg";
import jira from "../assets/jira.svg";
import more from "../assets/more.svg";
import pullRequest from "../assets/pull-request.svg";
import refresh from "../assets/refresh.svg";
import shrink from "../assets/shrink.svg";
import terminal from "../assets/terminal.svg";

export const ICONS: Record<string, string> = {
  agent,
  close,
  comment,
  expand,
  external,
  eye,
  forgejo,
  history,
  issue,
  jira,
  more,
  "pull-request": pullRequest,
  refresh,
  shrink,
  terminal,
};
