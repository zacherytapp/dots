// Generated from src/mods/mc-tabs/main.ts and its imports by `pnpm build:herdr`. Edit the sources, not this file.
// .config/herdr-app/src/mods/mc-tabs/main.ts
import { div as div2, View } from "gpui-kit";
import { h_flex as h_flex2 } from "gpui-base";
import {
  home,
  layout,
  nextCommand,
  openOverlay,
  panes,
  props,
  run,
  setShared,
  shared,
  spaces,
  theme as theme2,
  window,
} from "herdr";

// .config/herdr-app/src/shared/sources.ts
var SOURCES = [
  { id: "files", label: "Files", short: "Files", icon: "files" },
  { id: "changes", label: "Changes", short: "Changes", icon: "file-diff" },
  { id: "issues", label: "GitHub issues", short: "Issues", icon: "circle-dot" },
  { id: "pulls", label: "Pull requests", short: "PRs", icon: "git-pull-request" },
  { id: "branches", label: "Branches", short: "Branches", icon: "git-branch" },
  { id: "forgejo", label: "Forgejo issues", short: "Forgejo", icon: "forgejo" },
  { id: "jira", label: "Jira", short: "Jira", icon: "jira" },
  { id: "sessions", label: "Previous sessions", short: "Sessions", icon: "history" },
];
var NODES = {
  sidebar: "sidebar",
  spaces: "mc-spaces",
  agents: "mc-agents",
  panel: "panel",
  body: "panel-body",
};

// .config/herdr-app/src/shared/ui.ts
import { div, image, svg } from "gpui-kit";
import { h_flex, v_flex, Input } from "gpui-base";
import { theme } from "herdr";

// .config/herdr-app/src/shared/icons.ts
import { appHome, exec, readTextFile, writeTextFile } from "herdr";

// .config/herdr-app/src/assets/forgejo.svg
var forgejo_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="17.5" cy="5" r="2.2"/><circle cx="17.5" cy="13.5" r="2.2"/><circle cx="6.5" cy="19" r="2.2"/><path d="M6.5 16.8V11a6 6 0 0 1 6-6h2.8M6.5 16.8a3.3 3.3 0 0 1 3.3-3.3h5.5"/></svg>\n';

// .config/herdr-app/src/assets/jira.svg
var jira_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.8 21.2 12 12 21.2 2.8 12z"/><path d="M12 8.2 15.8 12 12 15.8 8.2 12z"/></svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/arrow-down.svg
var arrow_down_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-arrow-down"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M12 5v14" />\n  <path d="m19 12-7 7-7-7" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/arrow-right.svg
var arrow_right_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-arrow-right"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M5 12h14" />\n  <path d="m12 5 7 7-7 7" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/arrow-up.svg
var arrow_up_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-arrow-up"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="m5 12 7-7 7 7" />\n  <path d="M12 19V5" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/battery-charging.svg
var battery_charging_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-battery-charging"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="m11 7-3 5h4l-3 5" />\n  <path d="M14.856 6H16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.935" />\n  <path d="M22 14v-4" />\n  <path d="M5.14 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2.936" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/battery-full.svg
var battery_full_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-battery-full"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M10 10v4" />\n  <path d="M14 10v4" />\n  <path d="M22 14v-4" />\n  <path d="M6 10v4" />\n  <rect x="2" y="6" width="16" height="12" rx="2" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/battery-low.svg
var battery_low_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-battery-low"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M22 14v-4" />\n  <path d="M6 14v-4" />\n  <rect x="2" y="6" width="16" height="12" rx="2" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/battery-medium.svg
var battery_medium_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-battery-medium"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M10 14v-4" />\n  <path d="M22 14v-4" />\n  <path d="M6 14v-4" />\n  <rect x="2" y="6" width="16" height="12" rx="2" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/battery-warning.svg
var battery_warning_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-battery-warning"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M10 16h.01" />\n  <path d="M10 8v4" />\n  <path d="M14 6h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2" />\n  <path d="M22 14v-4" />\n  <path d="M6 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/bot.svg
var bot_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-bot"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M12 8V4H8" />\n  <rect width="16" height="12" x="4" y="8" rx="2" />\n  <path d="M2 14h2" />\n  <path d="M20 14h2" />\n  <path d="M15 13v2" />\n  <path d="M9 13v2" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/check.svg
var check_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-check"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M20 6 9 17l-5-5" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/chevron-down.svg
var chevron_down_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-chevron-down"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="m6 9 6 6 6-6" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/chevron-right.svg
var chevron_right_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-chevron-right"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="m9 18 6-6-6-6" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/circle.svg
var circle_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-circle"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <circle cx="12" cy="12" r="10" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/circle-alert.svg
var circle_alert_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-circle-alert"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <circle cx="12" cy="12" r="10" />\n  <line x1="12" x2="12" y1="8" y2="12" />\n  <line x1="12" x2="12.01" y1="16" y2="16" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/circle-check.svg
var circle_check_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-circle-check"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <circle cx="12" cy="12" r="10" />\n  <path d="m16 9-5.5 5.5L8 12" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/circle-dot.svg
var circle_dot_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-circle-dot"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <circle cx="12" cy="12" r="1" />\n  <circle cx="12" cy="12" r="10" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/circle-x.svg
var circle_x_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-circle-x"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <circle cx="12" cy="12" r="10" />\n  <path d="m15 9-6 6" />\n  <path d="m9 9 6 6" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/clock.svg
var clock_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-clock"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <circle cx="12" cy="12" r="10" />\n  <path d="M12 6v6l4 2" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/cloud.svg
var cloud_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-cloud"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/copy.svg
var copy_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-copy"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />\n  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/corner-down-left.svg
var corner_down_left_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-corner-down-left"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M20 4v7a4 4 0 0 1-4 4H4" />\n  <path d="m9 10-5 5 5 5" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/cpu.svg
var cpu_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-cpu"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M12 20v2" />\n  <path d="M12 2v2" />\n  <path d="M17 20v2" />\n  <path d="M17 2v2" />\n  <path d="M2 12h2" />\n  <path d="M2 17h2" />\n  <path d="M2 7h2" />\n  <path d="M20 12h2" />\n  <path d="M20 17h2" />\n  <path d="M20 7h2" />\n  <path d="M7 20v2" />\n  <path d="M7 2v2" />\n  <rect x="4" y="4" width="16" height="16" rx="2" />\n  <rect x="8" y="8" width="8" height="8" rx="1" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/delete.svg
var delete_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-delete"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />\n  <path d="m12 9 6 6" />\n  <path d="m18 9-6 6" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/ellipsis.svg
var ellipsis_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-ellipsis"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <circle cx="12" cy="12" r="1" />\n  <circle cx="19" cy="12" r="1" />\n  <circle cx="5" cy="12" r="1" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/external-link.svg
var external_link_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-external-link"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M15 3h6v6" />\n  <path d="M10 14 21 3" />\n  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/eye.svg
var eye_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-eye"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />\n  <circle cx="12" cy="12" r="3" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/file-diff.svg
var file_diff_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-file-diff"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />\n  <path d="M9 10h6" />\n  <path d="M12 13V7" />\n  <path d="M9 17h6" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/files.svg
var files_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-files"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M15 2h-4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8" />\n  <path d="M16.706 2.706A2.4 2.4 0 0 0 15 2v5a1 1 0 0 0 1 1h5a2.4 2.4 0 0 0-.706-1.706z" />\n  <path d="M5 7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 1.732-1" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/folder.svg
var folder_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-folder"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/git-branch.svg
var git_branch_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-git-branch"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M15 6a9 9 0 0 0-9 9V3" />\n  <circle cx="18" cy="6" r="3" />\n  <circle cx="6" cy="18" r="3" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/git-compare.svg
var git_compare_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-git-compare"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <circle cx="18" cy="18" r="3" />\n  <circle cx="6" cy="6" r="3" />\n  <path d="M13 6h3a2 2 0 0 1 2 2v7" />\n  <path d="M11 18H8a2 2 0 0 1-2-2V9" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/git-merge.svg
var git_merge_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-git-merge"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <circle cx="18" cy="18" r="3" />\n  <circle cx="6" cy="6" r="3" />\n  <path d="M6 21V9a9 9 0 0 0 9 9" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/git-pull-request.svg
var git_pull_request_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-git-pull-request"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <circle cx="18" cy="18" r="3" />\n  <circle cx="6" cy="6" r="3" />\n  <path d="M13 6h3a2 2 0 0 1 2 2v7" />\n  <line x1="6" x2="6" y1="9" y2="21" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/git-pull-request-draft.svg
var git_pull_request_draft_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-git-pull-request-draft"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <circle cx="18" cy="18" r="3" />\n  <circle cx="6" cy="6" r="3" />\n  <path d="M18 6V5" />\n  <path d="M18 11v-1" />\n  <line x1="6" x2="6" y1="9" y2="21" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/history.svg
var history_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-history"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />\n  <path d="M3 3v5h5" />\n  <path d="M12 7v5l4 2" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/info.svg
var info_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-info"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <circle cx="12" cy="12" r="10" />\n  <path d="M12 16v-4" />\n  <path d="M12 8h.01" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/laptop.svg
var laptop_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-laptop"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z" />\n  <path d="M20.054 15.987H3.946" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/layers.svg
var layers_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-layers"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />\n  <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />\n  <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/loader-circle.svg
var loader_circle_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-loader-circle"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M21 12a9 9 0 1 1-6.219-8.56" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/maximize-2.svg
var maximize_2_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-maximize-2"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M15 3h6v6" />\n  <path d="m21 3-7 7" />\n  <path d="m3 21 7-7" />\n  <path d="M9 21H3v-6" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/message-square.svg
var message_square_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-message-square"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/milestone.svg
var milestone_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-milestone"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M12 13v8" />\n  <path d="M12 3v3" />\n  <path d="M18.172 6a2 2 0 0 1 1.414.586l2.06 2.06a1.207 1.207 0 0 1 0 1.708l-2.06 2.06a2 2 0 0 1-1.414.586H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/minimize-2.svg
var minimize_2_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-minimize-2"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="m14 10 7-7" />\n  <path d="M20 10h-6V4" />\n  <path d="m3 21 7-7" />\n  <path d="M4 14h6v6" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/minus.svg
var minus_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-minus"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M5 12h14" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/monitor.svg
var monitor_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-monitor"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <rect width="20" height="14" x="2" y="3" rx="2" />\n  <line x1="8" x2="16" y1="21" y2="21" />\n  <line x1="12" x2="12" y1="17" y2="21" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/pin.svg
var pin_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-pin"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M12 17v5" />\n  <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/pin-off.svg
var pin_off_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-pin-off"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M12 17v5" />\n  <path d="M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89" />\n  <path d="m2 2 20 20" />\n  <path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/plus.svg
var plus_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-plus"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M5 12h14" />\n  <path d="M12 5v14" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/refresh-cw.svg
var refresh_cw_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-refresh-cw"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />\n  <path d="M21 3v5h-5" />\n  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />\n  <path d="M8 16H3v5" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/search.svg
var search_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-search"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="m21 21-4.34-4.34" />\n  <circle cx="11" cy="11" r="8" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/server.svg
var server_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-server"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />\n  <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />\n  <line x1="6" x2="6.01" y1="6" y2="6" />\n  <line x1="6" x2="6.01" y1="18" y2="18" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/settings.svg
var settings_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-settings"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />\n  <circle cx="12" cy="12" r="3" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/square.svg
var square_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-square"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <rect width="18" height="18" x="3" y="3" rx="2" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/square-terminal.svg
var square_terminal_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-square-terminal"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="m7 11 2-2-2-2" />\n  <path d="M11 13h4" />\n  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/tag.svg
var tag_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-tag"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />\n  <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/terminal.svg
var terminal_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-terminal"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M12 19h8" />\n  <path d="m4 17 6-6-6-6" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/thermometer.svg
var thermometer_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-thermometer"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/triangle-alert.svg
var triangle_alert_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-triangle-alert"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />\n  <path d="M12 9v4" />\n  <path d="M12 17h.01" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/x.svg
var x_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-x"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M18 6 6 18" />\n  <path d="m6 6 12 12" />\n</svg>\n';

// node_modules/.pnpm/lucide-static@1.76.0/node_modules/lucide-static/icons/zoom-in.svg
var zoom_in_default =
  '<!-- @license lucide-static v1.76.0 - ISC -->\n<svg\n  class="lucide lucide-zoom-in"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <circle cx="11" cy="11" r="8" />\n  <line x1="21" x2="16.65" y1="21" y2="16.65" />\n  <line x1="11" x2="11" y1="8" y2="14" />\n  <line x1="8" x2="14" y1="11" y2="11" />\n</svg>\n';

// .config/herdr-app/src/shared/icon-data.ts
var ICONS = {
  forgejo: forgejo_default,
  jira: jira_default,
  "arrow-down": arrow_down_default,
  "arrow-right": arrow_right_default,
  "arrow-up": arrow_up_default,
  "battery-charging": battery_charging_default,
  "battery-full": battery_full_default,
  "battery-low": battery_low_default,
  "battery-medium": battery_medium_default,
  "battery-warning": battery_warning_default,
  bot: bot_default,
  check: check_default,
  "chevron-down": chevron_down_default,
  "chevron-right": chevron_right_default,
  circle: circle_default,
  "circle-alert": circle_alert_default,
  "circle-check": circle_check_default,
  "circle-dot": circle_dot_default,
  "circle-x": circle_x_default,
  clock: clock_default,
  cloud: cloud_default,
  copy: copy_default,
  "corner-down-left": corner_down_left_default,
  cpu: cpu_default,
  delete: delete_default,
  ellipsis: ellipsis_default,
  "external-link": external_link_default,
  eye: eye_default,
  "file-diff": file_diff_default,
  files: files_default,
  folder: folder_default,
  "git-branch": git_branch_default,
  "git-compare": git_compare_default,
  "git-merge": git_merge_default,
  "git-pull-request": git_pull_request_default,
  "git-pull-request-draft": git_pull_request_draft_default,
  history: history_default,
  info: info_default,
  laptop: laptop_default,
  layers: layers_default,
  "loader-circle": loader_circle_default,
  "maximize-2": maximize_2_default,
  "message-square": message_square_default,
  milestone: milestone_default,
  "minimize-2": minimize_2_default,
  minus: minus_default,
  monitor: monitor_default,
  pin: pin_default,
  "pin-off": pin_off_default,
  plus: plus_default,
  "refresh-cw": refresh_cw_default,
  search: search_default,
  server: server_default,
  settings: settings_default,
  square: square_default,
  "square-terminal": square_terminal_default,
  tag: tag_default,
  terminal: terminal_default,
  thermometer: thermometer_default,
  "triangle-alert": triangle_alert_default,
  x: x_default,
  "zoom-in": zoom_in_default,
};

// .config/herdr-app/src/shared/icons.ts
var installing = null;
function install() {
  const dir = `${appHome()}/mods/mc-tabs/icons`;
  return (async () => {
    await exec("mkdir", ["-p", dir]);
    for (const [name, svg2] of Object.entries(ICONS)) {
      const path = `${dir}/${name}.svg`;
      const now = await readTextFile(path).catch(() => null);
      if (now !== svg2) await writeTextFile(path, svg2, now).catch(() => null);
    }
  })().catch(() => {
    installing = null;
  });
}
function asset(name) {
  installing ??= install();
  return `mods/mc-tabs/icons/${name}.svg`;
}
installing = install();

// .config/herdr-app/src/shared/ui.ts
var MONO = "Geist Mono";
var TEXT = { xs: 12, sm: 13, md: 14, lg: 16 };
var RADIUS = { sm: 6, md: 8, lg: 10, xl: 14, full: 9999 };
var ICON = { xs: 12, sm: 14, md: 16 };
var TRANSPARENT = "#00000000";
var alpha = (color, a) =>
  color && /^#[0-9a-f]{6}$/i.test(color) ? `${color}${a}` : (color ?? TRANSPARENT);
var stopPress = (_e, cx) => cx.stop_propagation();
function icon(name, size = ICON.md, color) {
  const el = svg(asset(name)).size(size).flex_none();
  return color ? el.text_color(color) : el;
}
function spinner(size = ICON.sm, color) {
  return icon("loader-circle", size, color).spin(900);
}
function programIcon(p, size, color) {
  if (!p?.icon) return null;
  return p.tint
    ? svg(p.icon).size(size).flex_none().text_color(color)
    : image(p.icon).w(size).h(size).flex_none();
}
function mono(text) {
  return div().font_family(MONO).child(text);
}
var BUTTON_SIZES = {
  default: { h: 32, px: 12, gap: 6, text: TEXT.sm, icon: ICON.md, square: false },
  sm: { h: 28, px: 10, gap: 6, text: TEXT.sm, icon: ICON.sm, square: false },
  xs: { h: 24, px: 8, gap: 4, text: TEXT.xs, icon: ICON.xs, square: false },
  icon: { h: 32, px: 0, gap: 0, text: TEXT.sm, icon: ICON.md, square: true },
  "icon-sm": { h: 28, px: 0, gap: 0, text: TEXT.sm, icon: ICON.md, square: true },
  "icon-xs": { h: 24, px: 0, gap: 0, text: TEXT.xs, icon: ICON.sm, square: true },
};
function button(id, o) {
  const t = theme();
  const variant = o.variant ?? "ghost";
  const s = BUTTON_SIZES[o.size ?? (o.label ? "sm" : "icon-sm")];
  const iconSize = o.iconSize ?? s.icon;
  const glyph =
    o.icon === void 0
      ? null
      : typeof o.icon === "string"
        ? icon(o.icon, iconSize).when(Boolean(o.spin), (el2) => el2.spin(900))
        : o.icon;
  let el = h_flex()
    .id(id)
    .h(s.h)
    .flex_none()
    .items_center()
    .justify_center()
    .gap(s.gap)
    .rounded(RADIUS.md)
    .text_size(s.text)
    .font_medium()
    .border(1)
    .border_color(TRANSPARENT);
  el = s.square ? el.w(s.h) : el.px(glyph && o.label ? s.px - 2 : s.px);
  const fg = o.tone ?? t.foreground;
  switch (variant) {
    case "default":
      el = el
        .bg(t.solid)
        .text_color(t.solid_foreground)
        .hover((h) => h.bg(alpha(t.solid, "e6")));
      break;
    case "secondary":
      el = el
        .bg(t.selected)
        .text_color(fg)
        .hover((h) => h.bg(t.input));
      break;
    case "outline":
      el = el
        .border_color(t.input)
        .bg(o.active ? t.selected : t.hover)
        .text_color(fg)
        .shadow_xs()
        .hover((h) => h.bg(t.selected));
      break;
    case "destructive":
      el = el
        .bg(alpha(t.blocked, "99"))
        .text_color(t.foreground)
        .hover((h) => h.bg(alpha(t.blocked, "cc")));
      break;
    case "link":
      el = el
        .px(0)
        .h_auto()
        .text_color(o.tone ?? t.accent)
        .hover((h) => h.underline());
      break;
    default:
      el = el
        .text_color(o.active ? fg : (o.tone ?? t.muted))
        .when(Boolean(o.active), (a) => a.bg(t.selected))
        .hover((h) => h.bg(t.selected).text_color(fg));
  }
  if (o.disabled) {
    el = el.opacity(0.5);
  } else {
    el = el.cursor_pointer().on_mouse_down("left", stopPress);
    if (o.onClick) el = el.on_click(o.onClick);
  }
  if (o.tooltip) el = el.tooltip(o.tooltip);
  if (glyph) el = el.child(glyph);
  if (o.label) el = el.child(o.label);
  return el;
}
function badge(label, o = {}) {
  const t = theme();
  const variant = o.variant ?? (o.tone ? "secondary" : "outline");
  let el = h_flex()
    .h(20)
    .px(label ? 8 : 4)
    .gap(4)
    .flex_none()
    .items_center()
    .rounded(RADIUS.full)
    .border(1)
    .border_color(TRANSPARENT)
    .text_size(TEXT.xs)
    .font_medium()
    .whitespace_nowrap();
  if (o.id) el = el.id(o.id);
  const tone = o.tone;
  switch (variant) {
    case "default":
      el = el.bg(tone ?? t.solid).text_color(tone ? t.accent_foreground : t.solid_foreground);
      break;
    case "secondary":
      el = el.bg(tone ? alpha(tone, "26") : t.selected).text_color(tone ?? t.foreground);
      break;
    case "destructive":
      el = el.bg(alpha(t.blocked, "26")).text_color(t.blocked);
      break;
    case "ghost":
      el = el.text_color(tone ?? t.muted);
      break;
    default:
      el = el.border_color(tone ? alpha(tone, "59") : t.border).text_color(tone ?? t.foreground);
  }
  if (o.onClick) {
    el = el
      .cursor_pointer()
      .hover((h) => h.bg(t.hover))
      .on_mouse_down("left", stopPress)
      .on_click(o.onClick);
  }
  if (o.tooltip) el = el.tooltip(o.tooltip);
  if (o.dot) el = el.child(dot(o.dot));
  if (o.icon) el = el.child(typeof o.icon === "string" ? icon(o.icon, ICON.xs) : o.icon);
  if (label) el = el.child(o.mono ? mono(label) : label);
  return el;
}
function dot(color, o = {}) {
  const size = o.size ?? 6;
  const el = div().size(size).flex_none().rounded(RADIUS.full);
  return o.ring ? el.border(1.5).border_color(color) : el.bg(color);
}
var SPACE_MARKS = {
  ansi6: "#22a99a",
  ansi3: "#e3814f",
  ansi4: "#5b8def",
  ansi5: "#8b7cf6",
  ansi2: "#3fae6a",
  ansi1: "#d9649a",
};
function spaceFill(t, color) {
  if (color.startsWith("#")) return color;
  return SPACE_MARKS[color] ?? t[color] ?? t.accent;
}
function avatar(label, fill, size = 20) {
  const t = theme();
  return div()
    .size(size)
    .flex_none()
    .flex()
    .items_center()
    .justify_center()
    .rounded(size >= 28 ? RADIUS.md : RADIUS.sm)
    .bg(fill)
    .text_size(size >= 28 ? TEXT.sm : 11)
    .font_semibold()
    .text_color(t.accent_foreground)
    .child(label.slice(0, 1).toUpperCase());
}
function separator(vertical = false, length = 16) {
  const t = theme();
  return vertical
    ? div().w(1).h(length).flex_none().bg(t.border)
    : div().h(1).w_full().flex_none().bg(t.border);
}
function statusMark(status, compact = false) {
  const t = theme();
  const box = () => div().size(ICON.sm).flex_none().flex().items_center().justify_center();
  if (status === "working") return box().child(spinner(ICON.sm, t.working));
  if (status === "blocked") {
    return compact
      ? box().child(icon("circle-alert", ICON.sm, t.blocked))
      : badge("Needs you", { variant: "destructive" });
  }
  if (status === "done") return box().child(dot(t.done, { size: 7 }));
  if (status === "idle") return box().child(dot(t.idle ?? t.dim, { size: 7, ring: true }));
  return box();
}

// .config/herdr-app/src/shared/util.ts
function findNode(node, id) {
  const n = node;
  if (!n) return null;
  if (n.id === id) return n;
  for (const child of n.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}
function cleanTitle(s) {
  return (s ?? "")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim();
}
function baseName(path) {
  const trimmed = (path ?? "").replace(/\/+$/, "");
  return trimmed.split("/").pop() || trimmed || "/";
}
function duration(ms) {
  const m = Math.floor(Math.max(0, ms) / 6e4);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 60 ? `${d}d` : `${Math.floor(d / 30)}mo`;
}
function parseJson(text, fallback) {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

// .config/herdr-app/src/mods/mc-tabs/label.ts
function leadPane(tab, all) {
  const mine = all.filter((p) => p.tab === tab.id);
  return mine.find((p) => p.program?.agent) ?? mine.find((p) => p.focused) ?? mine[0] ?? null;
}
var SHORT = 8;
function clip(text, max = SHORT) {
  const chars = [...text.trim()];
  return chars.length <= max
    ? chars.join("")
    : `${chars
        .slice(0, max - 1)
        .join("")
        .trimEnd()}…`;
}
var SHELL_TITLE = /^[\w.-]+@[\w.-]+[:\s]|^[~/]|^[A-Za-z]:\\/;
function tabLabel(tab, all, home2) {
  const lead = leadPane(tab, all);
  const program = lead?.program;
  const title = cleanTitle(lead?.title);
  const telling =
    title &&
    !SHELL_TITLE.test(title) &&
    ![program?.name, program?.key].some((v) => v && v.toLowerCase() === title.toLowerCase()) &&
    !/^(claude(?: code)?|zsh|bash|fish|sh)$/i.test(title);
  const name = tab.named ? tab.name : telling ? title : (program?.name ?? `Tab ${tab.index}`);
  const folder = lead?.cwd ? (lead.cwd === home2 ? "~" : baseName(lead.cwd)) : "";
  const short = clip(tab.named || telling || !program?.icon ? name : folder || name);
  const branch = lead?.branch && !["main", "master"].includes(lead.branch) ? lead.branch : "";
  const detail = [folder, branch].filter(Boolean).join(" · ");
  const tooltip = [
    name,
    lead?.cwd ? lead.cwd.replace(home2, "~") : null,
    lead?.branch ? `branch ${lead.branch}` : null,
    program?.name && program.name !== name ? program.name : null,
    tab.panes > 1 ? `${tab.panes} panes` : null,
  ]
    .filter(Boolean)
    .join("\n");
  return { name, detail: detail === name ? "" : detail, short, tooltip, lead };
}

// .config/herdr-app/src/mods/mc-tabs/main.ts
var WINDOW_WIDTH = "mc.window.width";
function panel(root = layout()) {
  const node = findNode(root, NODES.panel);
  const body = findNode(root, NODES.body);
  const ids = new Set((body?.children ?? []).map((c) => c.id));
  return {
    node,
    open: Boolean(node && !node.hidden),
    active: body?.active ?? null,
    available: SOURCES.filter((s) => ids.has(s.id)),
  };
}
function showSource(id) {
  run("layout.select", { stack: NODES.body, child: id });
  run("layout.show", { id: NODES.panel });
}
function toggleSource(id) {
  const p = panel();
  if (p.open && p.active === id) run("layout.hide", { id: NODES.panel });
  else showSource(id);
}
var Tabs = class extends View {
  init(_props, cx) {
    this.pressed = null;
    this.panels = parseJson(localStorage.getItem("panels"), {});
    this.space = void 0;
    this.pending = null;
    this.width = 0;
    this.normalWidth = Number(localStorage.getItem("normalWidth")) || 440;
    if (this.view() !== "topbar") return;
    cx.timer.every(6e4, (cx2) => {
      if (spaces().some((s) => s.active && s.tabs.some((t) => t.status === "working")))
        cx2.notify();
    });
    cx.spawn(async (cx2) => {
      for (;;) {
        const c = await nextCommand();
        const p = panel();
        if (c === "panel") {
          if (p.open) run("layout.hide", { id: NODES.panel });
          else showSource(p.active ?? p.available[0]?.id ?? "files");
        } else if (c === "expand") this.expand();
        else if (c.startsWith("source-")) toggleSource(c.slice(7));
        cx2.notify();
      }
    });
  }
  view() {
    return props()?.view === "navigation" ? "navigation" : "topbar";
  }
  /** Widens the panel to most of the window, or back to the width it had. */
  expand() {
    const p = panel();
    const windowWidth = Number(shared(WINDOW_WIDTH)) || 1600;
    const wide = Math.round(windowWidth * 0.62);
    const now = p.node?.size?.px ?? this.normalWidth;
    if (!p.open) showSource(p.active ?? "files");
    if (now >= wide - 4) {
      run("layout.resize", { id: NODES.panel, px: this.normalWidth });
    } else {
      this.normalWidth = now;
      localStorage.setItem("normalWidth", String(now));
      run("layout.resize", { id: NODES.panel, px: wide });
    }
  }
  /** Each space remembers its open source; switching space restores it. */
  syncPanel(p, space) {
    if (!space || !p.node) return;
    const now = p.open ? p.active : null;
    if (space.id !== this.space) {
      const first = this.space === void 0;
      this.space = space.id;
      this.pending = null;
      if (!(first && !(space.id in this.panels))) {
        const stored = this.panels[space.id] ?? null;
        const want = p.available.some((s) => s.id === stored) ? stored : null;
        if (want !== now) {
          this.pending = { want, until: Date.now() + 1e3 };
          if (want) showSource(want);
          else run("layout.hide", { id: NODES.panel });
          return;
        }
      }
    }
    if (this.pending) {
      if (this.pending.want !== now && Date.now() < this.pending.until) return;
      this.pending = null;
    }
    if (this.panels[space.id] === now) return;
    this.panels[space.id] = now;
    localStorage.setItem("panels", JSON.stringify(this.panels));
  }
  render() {
    const t = theme2();
    return this.view() === "navigation" ? this.navigation(t) : this.topbar(t);
  }
  // ---- topbar ---------------------------------------------------------------------------
  spaceChip(t, space, sidebarWidth) {
    const colors = shared("space.colors") ?? {};
    const color = space ? (colors[space.id] ?? "ansi6") : "ansi6";
    const fill = spaceFill(t, color);
    return h_flex2()
      .id("space-chip")
      .flex_none()
      .when(sidebarWidth > 0, (el) => el.w(sidebarWidth - 10))
      .h(32)
      .ml(-5)
      .px(8)
      .gap(8)
      .items_center()
      .rounded(RADIUS.md)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .on_mouse_down("left", stopPress)
      .on_click(() => run("mod.open", { name: "picker" }))
      .tooltip("Switch space")
      .when(Boolean(space), (el) =>
        el
          .child(avatar(space?.name ?? "?", fill, 20))
          .child(
            div2()
              .min_w(0)
              .truncate()
              .text_size(TEXT.sm)
              .font_medium()
              .text_color(t.foreground)
              .child(space?.name ?? ""),
          )
          .when(Boolean(space?.machine), (e) =>
            e.child(
              h_flex2()
                .flex_none()
                .gap(4)
                .items_center()
                .text_size(TEXT.xs)
                .text_color(t.muted)
                .child(icon("server", ICON.xs))
                .child(space?.machine ?? ""),
            ),
          ),
      );
  }
  /** A compact pill: its number, the program's icon and a few characters; the rest is in its tooltip. */
  pill(t, space, tabIndex, live, homeDir) {
    const tabs = space?.tabs ?? [];
    const tab = tabs[tabIndex];
    const label = tabLabel(tab, live, homeDir);
    const program = label.lead?.program;
    const active = tab.active;
    const working = tab.status === "working" && tab.working_since;
    const tooltip = [
      label.tooltip,
      working ? `working for ${duration(Date.now() - tab.working_since)}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    return h_flex2()
      .id(`tab-${tab.id}`)
      .h(32)
      .pl(8)
      .pr(active ? 3 : 8)
      .gap(6)
      .items_center()
      .flex_none()
      .rounded(RADIUS.md)
      .text_size(TEXT.sm)
      .font_medium()
      .border(1)
      .cursor_pointer()
      .when(active, (el) =>
        el.bg(t.selected).border_color(t.input).text_color(t.foreground).shadow_sm(),
      )
      .when(!active, (el) =>
        el
          .border_color(TRANSPARENT)
          .text_color(t.muted)
          .hover((s) => s.text_color(t.foreground)),
      )
      .tooltip(tooltip)
      .on_mouse_down("left", (e, cx) => {
        cx.stop_propagation();
        this.pressed = tabIndex;
        if (e.click_count === 2) run("tab.rename", { id: tab.id });
      })
      .on_mouse_up("left", () => {
        const from = this.pressed;
        this.pressed = null;
        if (from !== null && from !== tabIndex)
          run("tab.move", { id: tabs[from].id, index: tabIndex + 1 });
        else run("tab.select", { id: tab.id });
      })
      .on_mouse_down("right", (_e, cx) => {
        cx.stop_propagation();
        openOverlay({
          mod: "menu",
          kind: "popup",
          width: 200,
          props: { tab: "tab", target: { id: tab.id, space: space?.id } },
        });
      })
      .child(
        div2()
          .flex_none()
          .font_family(MONO)
          .text_size(TEXT.xs)
          .text_color(t.muted)
          .child(String(tab.index)),
      )
      .when(Boolean(program?.icon), (el) =>
        el.child(programIcon(program, ICON.sm, active ? t.foreground : t.muted)),
      )
      .child(div2().flex_none().child(label.short))
      .when(tab.zoomed, (el) => el.child(icon("zoom-in", ICON.xs, t.accent)))
      .when(Boolean(working), (el) => el.child(spinner(ICON.sm, t.working)))
      .when(tab.status === "blocked" || tab.status === "done", (el) =>
        el.child(statusMark(tab.status, true)),
      )
      .when(active, (el) =>
        el.child(
          button(`close-${tab.id}`, {
            icon: "x",
            size: "icon-xs",
            iconSize: ICON.xs,
            tooltip: "Close tab",
            onClick: (_e, cx) => {
              cx.stop_propagation();
              run("tab.close", { id: tab.id });
            },
          }),
        ),
      );
  }
  sourceButtons(_t, p) {
    return p.available.map((s) => {
      const on = p.open && p.active === s.id;
      return button(`src-${s.id}`, {
        icon: s.icon,
        size: "icon-sm",
        iconSize: ICON.sm,
        active: on,
        tooltip: on ? `Hide ${s.label}` : s.label,
        onClick: () => toggleSource(s.id),
      });
    });
  }
  topbar(t) {
    const space = spaces().find((s) => s.active);
    const tabs = space?.tabs ?? [];
    const root = layout();
    const live = panes();
    const homeDir = home();
    const p = panel(root);
    this.syncPanel(p, space);
    const sidebar = findNode(root, NODES.sidebar);
    const sidebarWidth = sidebar && !sidebar.hidden ? (sidebar.size?.px ?? 0) : 0;
    const w = window();
    return h_flex2()
      .id("root")
      .size_full()
      .min_w(0)
      .pl(10)
      .pr(6)
      .gap(4)
      .items_center()
      .bg(t.chrome)
      .border_b(1)
      .border_color(t.border)
      .on_size_change((size) => {
        const width = Math.round(size.width / 16) * 16;
        if (shared(WINDOW_WIDTH) !== width) setShared(WINDOW_WIDTH, width);
      })
      .on_mouse_up("left", () => {
        this.pressed = null;
      })
      .on_scroll_wheel((e) => {
        if (Math.abs(e.delta.y) >= 1) run(e.delta.y > 0 ? "tab.prev" : "tab.next");
      })
      .child(this.spaceChip(t, space, sidebarWidth))
      .child(
        h_flex2()
          .id("tab-scroll")
          .flex_1()
          .min_w(0)
          .h_full()
          .items_center()
          .gap(4)
          .overflow_x_scrollbar()
          .children(tabs.map((_tab, i) => this.pill(t, space, i, live, homeDir))),
      )
      .child(
        button("tab-new", {
          icon: "plus",
          size: "icon-sm",
          tooltip: "New tab",
          onClick: () => openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 }),
        }),
      )
      .child(separator(true, 16))
      .children(this.sourceButtons(t, p))
      .when(Boolean(w?.buttons), (el) =>
        el
          .child(separator(true, 16))
          .child(
            button("minimize", {
              icon: "minus",
              size: "icon-sm",
              tooltip: "Minimize",
              onClick: () => run("window.minimize"),
            }),
          )
          .child(
            button("maximize", {
              icon: "square",
              size: "icon-sm",
              iconSize: ICON.sm,
              tooltip: w?.maximized ? "Restore" : "Maximize",
              onClick: () => run("window.maximize"),
            }),
          )
          .child(
            button("close-window", {
              icon: "x",
              size: "icon-sm",
              tooltip: "Close window",
              onClick: () => run("window.close"),
            }),
          ),
      );
  }
  // ---- navigation strip -----------------------------------------------------------------
  navigation(t) {
    const p = panel();
    const windowWidth = Number(shared(WINDOW_WIDTH)) || 1600;
    const wide = (p.node?.size?.px ?? 0) >= Math.round(windowWidth * 0.62) - 4;
    const need = (labels) => labels.reduce((n, l) => n + l.length * 7 + 34, 0) + 80;
    const mode =
      this.width >= need(p.available.map((s) => s.label))
        ? "label"
        : this.width >= need(p.available.map((s) => s.short))
          ? "short"
          : "icon";
    return h_flex2()
      .id("root")
      .size_full()
      .min_w(0)
      .px(8)
      .gap(4)
      .items_center()
      .bg(t.chrome)
      .border_b(1)
      .border_color(t.border)
      .on_size_change((size, cx) => {
        if (Math.abs(size.width - this.width) >= 1) {
          this.width = size.width;
          cx.notify();
        }
      })
      .children(
        p.available.map((s) => {
          const on = p.active === s.id;
          const text =
            on || mode === "label"
              ? mode === "label"
                ? s.label
                : s.short
              : mode === "short"
                ? s.short
                : "";
          return h_flex2()
            .id(`nav-${s.id}`)
            .h(28)
            .px(8)
            .gap(6)
            .flex_none()
            .items_center()
            .rounded(RADIUS.md)
            .text_size(TEXT.sm)
            .font_medium()
            .cursor_pointer()
            .when(on, (el) => el.bg(t.selected).text_color(t.foreground))
            .when(!on, (el) =>
              el.text_color(t.muted).hover((st) => st.bg(t.hover).text_color(t.foreground)),
            )
            .on_click(() => showSource(s.id))
            .tooltip(s.label)
            .child(icon(s.icon, ICON.sm))
            .when(Boolean(text), (el) => el.child(text));
        }),
      )
      .child(div2().flex_1())
      .child(
        button("nav-expand", {
          icon: wide ? "minimize-2" : "maximize-2",
          size: "icon-sm",
          iconSize: ICON.sm,
          tooltip: wide ? "Narrow the panel" : "Widen the panel",
          onClick: () => this.expand(),
        }),
      )
      .child(
        button("nav-close", {
          icon: "x",
          size: "icon-sm",
          tooltip: "Hide the panel",
          onClick: () => run("layout.hide", { id: NODES.panel }),
        }),
      );
  }
};
export { Tabs as default };
