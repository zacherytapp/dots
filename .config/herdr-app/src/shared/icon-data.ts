// Every icon the mods draw, as SVG text: esbuild inlines them (loader "text"), and installIcons()
// writes them beside the mod, since Herdr will not draw an SVG that is a symlink out of its folder.
// UI icons are Lucide (lucide-static, the set shadcn/ui uses); src/assets holds only the brand marks
// Lucide doesn't ship. To add one: import it here and add it to ICONS under its Lucide name.

import forgejo from "../assets/forgejo.svg";
import jira from "../assets/jira.svg";
import arrowDown from "lucide-static/icons/arrow-down.svg";
import arrowRight from "lucide-static/icons/arrow-right.svg";
import arrowUp from "lucide-static/icons/arrow-up.svg";
import batteryCharging from "lucide-static/icons/battery-charging.svg";
import batteryFull from "lucide-static/icons/battery-full.svg";
import batteryLow from "lucide-static/icons/battery-low.svg";
import batteryMedium from "lucide-static/icons/battery-medium.svg";
import batteryWarning from "lucide-static/icons/battery-warning.svg";
import bot from "lucide-static/icons/bot.svg";
import check from "lucide-static/icons/check.svg";
import chevronDown from "lucide-static/icons/chevron-down.svg";
import chevronRight from "lucide-static/icons/chevron-right.svg";
import circle from "lucide-static/icons/circle.svg";
import circleAlert from "lucide-static/icons/circle-alert.svg";
import circleCheck from "lucide-static/icons/circle-check.svg";
import circleDot from "lucide-static/icons/circle-dot.svg";
import circleX from "lucide-static/icons/circle-x.svg";
import clock from "lucide-static/icons/clock.svg";
import cloud from "lucide-static/icons/cloud.svg";
import copy from "lucide-static/icons/copy.svg";
import cornerDownLeft from "lucide-static/icons/corner-down-left.svg";
import cpu from "lucide-static/icons/cpu.svg";
import deleteKey from "lucide-static/icons/delete.svg";
import ellipsis from "lucide-static/icons/ellipsis.svg";
import externalLink from "lucide-static/icons/external-link.svg";
import eye from "lucide-static/icons/eye.svg";
import fileDiff from "lucide-static/icons/file-diff.svg";
import files from "lucide-static/icons/files.svg";
import folder from "lucide-static/icons/folder.svg";
import gitBranch from "lucide-static/icons/git-branch.svg";
import gitCompare from "lucide-static/icons/git-compare.svg";
import gitMerge from "lucide-static/icons/git-merge.svg";
import gitPullRequest from "lucide-static/icons/git-pull-request.svg";
import gitPullRequestDraft from "lucide-static/icons/git-pull-request-draft.svg";
import history from "lucide-static/icons/history.svg";
import info from "lucide-static/icons/info.svg";
import laptop from "lucide-static/icons/laptop.svg";
import layers from "lucide-static/icons/layers.svg";
import loaderCircle from "lucide-static/icons/loader-circle.svg";
import maximize2 from "lucide-static/icons/maximize-2.svg";
import messageSquare from "lucide-static/icons/message-square.svg";
import milestone from "lucide-static/icons/milestone.svg";
import minimize2 from "lucide-static/icons/minimize-2.svg";
import minus from "lucide-static/icons/minus.svg";
import monitor from "lucide-static/icons/monitor.svg";
import pin from "lucide-static/icons/pin.svg";
import pinOff from "lucide-static/icons/pin-off.svg";
import plus from "lucide-static/icons/plus.svg";
import refreshCw from "lucide-static/icons/refresh-cw.svg";
import search from "lucide-static/icons/search.svg";
import server from "lucide-static/icons/server.svg";
import settings from "lucide-static/icons/settings.svg";
import square from "lucide-static/icons/square.svg";
import squareTerminal from "lucide-static/icons/square-terminal.svg";
import tag from "lucide-static/icons/tag.svg";
import terminal from "lucide-static/icons/terminal.svg";
import thermometer from "lucide-static/icons/thermometer.svg";
import triangleAlert from "lucide-static/icons/triangle-alert.svg";
import x from "lucide-static/icons/x.svg";
import zoomIn from "lucide-static/icons/zoom-in.svg";

export const ICONS = {
  forgejo,
  jira,
  "arrow-down": arrowDown,
  "arrow-right": arrowRight,
  "arrow-up": arrowUp,
  "battery-charging": batteryCharging,
  "battery-full": batteryFull,
  "battery-low": batteryLow,
  "battery-medium": batteryMedium,
  "battery-warning": batteryWarning,
  bot,
  check,
  "chevron-down": chevronDown,
  "chevron-right": chevronRight,
  circle,
  "circle-alert": circleAlert,
  "circle-check": circleCheck,
  "circle-dot": circleDot,
  "circle-x": circleX,
  clock,
  cloud,
  copy,
  "corner-down-left": cornerDownLeft,
  cpu,
  delete: deleteKey,
  ellipsis,
  "external-link": externalLink,
  eye,
  "file-diff": fileDiff,
  files,
  folder,
  "git-branch": gitBranch,
  "git-compare": gitCompare,
  "git-merge": gitMerge,
  "git-pull-request": gitPullRequest,
  "git-pull-request-draft": gitPullRequestDraft,
  history,
  info,
  laptop,
  layers,
  "loader-circle": loaderCircle,
  "maximize-2": maximize2,
  "message-square": messageSquare,
  milestone,
  "minimize-2": minimize2,
  minus,
  monitor,
  pin,
  "pin-off": pinOff,
  plus,
  "refresh-cw": refreshCw,
  search,
  server,
  settings,
  square,
  "square-terminal": squareTerminal,
  tag,
  terminal,
  thermometer,
  "triangle-alert": triangleAlert,
  x,
  "zoom-in": zoomIn,
} satisfies Record<string, string>;

/** A name in ICONS: a Lucide icon, or a brand mark from src/assets. */
export type IconName = keyof typeof ICONS;
