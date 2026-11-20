// Generated from src/mods/mc-spaces/main.ts and its imports by `pnpm build:herdr`. Edit the sources, not this file.
// .config/herdr-app/src/mods/mc-spaces/main.ts
import { div as div2, View } from "gpui-kit";
import { h_flex as h_flex2, v_flex as v_flex2, InputState } from "gpui-base";
import {
  exec as exec2,
  hc,
  layout,
  machines,
  nextCommand,
  openOverlay,
  panes,
  run,
  setShared as setShared2,
  shared as shared2,
  spaces,
  theme as theme2,
} from "herdr";

// .config/herdr-app/src/shared/space-agents.ts
import { setShared, shared } from "herdr";

// .config/herdr-app/src/shared/space-agents-model.ts
var WEEK = 7 * 864e5;
function urgent(c) {
  if (!c) return null;
  if (c.blocked) return "blocked";
  if (c.done) return "done";
  if (c.working) return "working";
  return c.idle ? "idle" : null;
}

// .config/herdr-app/src/shared/space-agents.ts
var SPACE_AGENTS_KEY = "mc.agents.bySpace";
function spaceAgents() {
  const v = shared(SPACE_AGENTS_KEY);
  return v && typeof v === "object" ? v : null;
}

// .config/herdr-app/src/shared/sources.ts
var NODES = {
  sidebar: "sidebar",
  spaces: "mc-spaces",
  agents: "mc-agents",
  panel: "panel",
  body: "panel-body",
};
var KEYS = {
  agentsHeight: "mc.agents.height",
  agentsFolded: "mc.agents.folded",
  spacesFolded: "mc.spaces.folded",
  /** Per source: "space" or "all". */
  scope: (source) => `mc.${source}.scope`,
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
  const dir = `${appHome()}/mods/mc-spaces/icons`;
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
  return `mods/mc-spaces/icons/${name}.svg`;
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
function searchBox(id, state, o = {}) {
  const t = theme();
  return h_flex()
    .id(id)
    .h(o.height ?? 32)
    .px(10)
    .gap(8)
    .flex_1()
    .min_w(0)
    .items_center()
    .rounded(RADIUS.md)
    .border(1)
    .border_color(t.input)
    .bg(t.hover)
    .shadow_xs()
    .cursor_text()
    .on_mouse_down("left", stopPress)
    .child(icon(o.icon ?? "search", ICON.md, t.muted))
    .child(Input.new(state).flex_1().min_w(0).h_full().text_size(TEXT.sm).text_color(t.foreground));
}
function groupLabel(id, label, o = {}) {
  const t = theme();
  const foldable = Boolean(o.onToggle);
  return h_flex()
    .id(id)
    .h(o.height ?? 32)
    .flex_none()
    .px(8)
    .gap(4)
    .items_center()
    .text_size(TEXT.xs)
    .font_medium()
    .child(
      h_flex()
        .id(`${id}-fold`)
        .flex_1()
        .min_w(0)
        .h_full()
        .gap(6)
        .items_center()
        .text_color(o.tone ?? t.muted)
        .when(foldable, (el) =>
          el
            .cursor_pointer()
            .hover((s) => s.text_color(t.foreground))
            .on_click((_e, cx) => o.onToggle?.(cx)),
        )
        .when(Boolean(o.leading), (el) => el.child(o.leading))
        .child(div().min_w(0).truncate().child(label))
        .when(o.count !== void 0 && o.count !== null, (el) =>
          el.child(div().font_family(MONO).text_color(t.dim).child(String(o.count))),
        )
        .when(foldable, (el) =>
          el.child(
            icon(o.open === false ? "chevron-right" : "chevron-down", ICON.sm, t.dim).ml_auto(),
          ),
        ),
    )
    .children(o.trailing ?? []);
}
function menuButton(id, o) {
  const t = theme();
  const size = o.size ?? "default";
  let el = h_flex()
    .id(id)
    .w_full()
    .min_w(0)
    .px(8)
    .gap(8)
    .items_center()
    .rounded(RADIUS.md)
    .text_size(size === "sm" ? TEXT.xs : TEXT.sm)
    .cursor_pointer();
  el = size === "auto" ? el.py(6) : el.h(size === "sm" ? 28 : 32);
  el = o.active
    ? el.bg(t.selected).font_medium().text_color(t.foreground)
    : el.text_color(t.foreground).hover((s) => s.bg(t.hover));
  if (o.onClick) el = el.on_click(o.onClick);
  return el;
}
function menuBadge(text, color, iconName) {
  const t = theme();
  return h_flex()
    .h(20)
    .min_w(20)
    .px(4)
    .gap(2)
    .flex_none()
    .items_center()
    .justify_center()
    .rounded(RADIUS.sm)
    .font_family(MONO)
    .text_size(TEXT.xs)
    .font_medium()
    .text_color(color ?? t.muted)
    .when(Boolean(iconName), (el) => el.child(icon(iconName, ICON.xs)))
    .child(text);
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
function matches(query, ...hay) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = hay.filter(Boolean).join(" ").toLowerCase();
  return words.every((w) => text.includes(w));
}
function stepIn(list, current, step) {
  if (!list.length) return null;
  if (current < 0 || current >= list.length) return list[step === 1 ? 0 : list.length - 1];
  return list[(current + step + list.length) % list.length];
}
function parseJson(text, fallback) {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

// .config/herdr-app/src/mods/mc-spaces/git.ts
var STATUS_SCRIPT = [
  "git --no-optional-locks status --porcelain=v2 --branch || exit 1",
  'if ! git rev-parse -q --verify "@{u}" >/dev/null 2>&1 && [ -n "$(git remote)" ] &&',
  "  git symbolic-ref -q HEAD >/dev/null; then",
  '  printf "# local.unpushed %s\\n" "$(git rev-list --count HEAD --not --remotes 2>/dev/null)"',
  "fi",
].join("\n");
var FETCH_SCRIPT =
  'GIT_TERMINAL_PROMPT=0 GIT_SSH_COMMAND="ssh -o BatchMode=yes -o ConnectTimeout=8" git fetch --quiet --no-tags';
function parseStatus(stdout) {
  const s = {
    branch: null,
    upstream: null,
    ahead: 0,
    behind: 0,
    changed: 0,
    untracked: 0,
  };
  for (const line of stdout.split("\n")) {
    if (line.startsWith("# branch.head ")) {
      const head = line.slice(14).trim();
      s.branch = head === "(detached)" ? null : head;
    } else if (line.startsWith("# branch.upstream ")) {
      s.upstream = line.slice(18).trim() || null;
    } else if (line.startsWith("# branch.ab ")) {
      const m = /\+(\d+) -(\d+)/.exec(line);
      if (m) {
        s.ahead = Number(m[1]);
        s.behind = Number(m[2]);
      }
    } else if (line.startsWith("# local.unpushed ")) {
      if (!s.upstream) s.ahead = Number(line.slice(17).trim()) || 0;
    } else if (/^[12u] /.test(line)) {
      s.changed += 1;
    } else if (line.startsWith("? ")) {
      s.untracked += 1;
    }
  }
  return s;
}
function describe(s) {
  const plural = (n, one) => `${n} ${one}${n === 1 ? "" : "s"}`;
  const lines = [];
  if (s.behind) lines.push(`${plural(s.behind, "commit")} to pull from ${s.upstream}`);
  if (s.ahead)
    lines.push(
      s.upstream
        ? `${plural(s.ahead, "commit")} to push to ${s.upstream}`
        : `${plural(s.ahead, "commit")} on no remote (${s.branch ?? "HEAD"} has no upstream)`,
    );
  if (s.changed) lines.push(`${plural(s.changed, "changed file")}, not committed`);
  if (s.untracked) lines.push(`${plural(s.untracked, "untracked file")}`);
  return lines.join("\n");
}
var BATCH_SCRIPT = [
  "i=0",
  'for d in "$@"; do',
  '  printf "@@@ %s\\n" "$i"',
  '  ( cd "$d" 2>/dev/null && {',
  STATUS_SCRIPT,
  "  } ) 2>/dev/null",
  "  i=$((i + 1))",
  "done",
].join("\n");
function parseBatch(stdout, count) {
  const parts = Array.from({ length: count }, () => "");
  let at = -1;
  for (const line of stdout.split("\n")) {
    const m = /^@@@ (\d+)$/.exec(line);
    if (m) at = Number(m[1]);
    else if (at >= 0 && at < count)
      parts[at] += `${line}
`;
  }
  return parts.map((p) => (p.includes("# branch.head ") ? parseStatus(p) : null));
}
function backoff(failures, base = 15e3, max = 5 * 6e4) {
  if (failures <= 0) return 0;
  return Math.min(max, base * 2 ** (failures - 1));
}

// .config/herdr-app/src/mods/mc-spaces/size.ts
var HEADER = 32;
var SEARCH = 40;
var ROW = 32;
var GROUP = 32;
var GAP = 2;
var PAD = 8;
var AGENTS_MIN = 220;
var FIRST_MAX = 360;
function contentHeight(rows, groups, searching) {
  const items = rows + groups;
  return (
    HEADER +
    (searching ? SEARCH : 0) +
    rows * ROW +
    groups * GROUP +
    Math.max(0, items - 1) * GAP +
    PAD
  );
}
function targetHeight(input) {
  if (input.spacesFolded) return HEADER;
  const content = contentHeight(input.rows, input.groups, input.searching);
  if (input.available === null) return Math.min(content, FIRST_MAX);
  if (input.agentsFolded) return Math.max(HEADER, input.available - HEADER);
  return Math.max(HEADER, Math.min(content, input.available - AGENTS_MIN));
}

// .config/herdr-app/src/mods/mc-spaces/main.ts
var GIT_MS = 15e3;
var FETCH_MS = 5 * 6e4;
function checkouts(all, live) {
  const cwdOfTab = /* @__PURE__ */ new Map();
  for (const p of live) if (p.cwd && !cwdOfTab.has(p.tab)) cwdOfTab.set(p.tab, p.cwd);
  const by = /* @__PURE__ */ new Map();
  for (const s of all) {
    const cwd =
      s.tabs.map((t) => cwdOfTab.get(t.id)).find(Boolean) ||
      live.find((p) => s.tabs.some((t) => t.id === p.tab) && p.cwd)?.cwd ||
      s.folder ||
      "";
    if (!cwd) continue;
    const machine = s.machine ?? null;
    const key = JSON.stringify([machine, cwd]);
    const c = by.get(key) ?? { key, machine, cwd, spaces: [] };
    c.spaces.push(s.id);
    by.set(key, c);
  }
  return [...by.values()];
}
async function readGitBatch(machine, list) {
  const r = await exec2("sh", ["-c", BATCH_SCRIPT, "sh", ...list.map((c) => c.cwd)], {
    on: machine ?? void 0,
  });
  if (r.code !== 0) throw new Error(`git status failed on ${machine ?? "this computer"}`);
  return parseBatch(r.stdout, list.length);
}
async function readGit(c) {
  return (await readGitBatch(c.machine, [c]))[0] ?? null;
}
var PALETTE = Object.keys(SPACE_MARKS);
var narrow = (root) => (findNode(root, NODES.sidebar)?.size?.px ?? Infinity) < 160;
var Spaces = class extends View {
  init(_props, cx) {
    this.search = InputState.new({ placeholder: "Find a space" });
    this.search.on("change", (_e, cx2) => cx2.notify());
    this.machineList = [];
    this.folded = new Set(parseJson(localStorage.getItem("machines.folded"), []));
    this.hovered = null;
    this.pressed = null;
    this.over = null;
    this.height = 0;
    this.lastResize = null;
    this.git = /* @__PURE__ */ new Map();
    this.fetched = /* @__PURE__ */ new Map();
    this.reading = false;
    this.fetching = false;
    this.listing = false;
    this.down = /* @__PURE__ */ new Map();
    this.loadingGit = /* @__PURE__ */ new Set();
    this.refreshMachines(cx);
    cx.timer.every(3e4, (cx2) => this.refreshMachines(cx2));
    cx.timer.after(800, (cx2) => this.refreshGit(cx2));
    cx.timer.every(GIT_MS, (cx2) => this.refreshGit(cx2));
    cx.spawn(async (cx2) => {
      for (;;) {
        const c = await nextCommand();
        try {
          if (c === "next") this.step(1);
          else if (c === "prev") this.step(-1);
          else if (c === "move-up") this.move(-1);
          else if (c === "move-down") this.move(1);
        } catch {}
        cx2.notify();
      }
    });
  }
  /**
   * Spaces in the order this list draws them, so the keys walk what you see: grouped by machine,
   * without folded machines (unless that leaves none). The search box doesn't narrow it.
   */
  ordered() {
    const all = spaces();
    if (narrow(layout())) return all;
    const groups = this.groups(all);
    const grouped = groups.length > 1;
    const shown = groups
      .filter((g) => !(grouped && this.folded.has(g.machine ?? "")))
      .flatMap((g) => g.spaces);
    return shown.length ? shown : all;
  }
  /** Shows the next (or previous) space in list order, wrapping at the ends. */
  step(step) {
    const list = this.ordered();
    const next = stepIn(
      list,
      list.findIndex((s) => s.active),
      step,
    );
    if (next && !next.active) run("space.select", { id: next.id });
  }
  /** Moves the shown space one place up or down among its machine's spaces, as dragging it would. */
  move(step) {
    const all = spaces();
    const space = all.find((s) => s.active);
    if (!space) return;
    const same = all.filter((s) => (s.machine ?? null) === (space.machine ?? null));
    const target = same[same.indexOf(space) + step];
    if (target) run("space.move", { id: space.id, index: all.indexOf(target) + 1 });
  }
  /** Whether this checkout is worth reading now: shown, and its machine isn't known to be away. */
  worthReading(c, now) {
    if (!c.machine) return true;
    if (this.folded.has(c.machine)) return false;
    const state = this.machineList.find((m) => m.name === c.machine)?.state;
    if (state && state !== "connected") return false;
    return now >= (this.down.get(c.machine)?.until ?? 0);
  }
  /**
   * Reads the git state of every shown space, one process per machine (all machines at once, never
   * overlapping a run still in flight); redraws only when one changed. Then fetches stale ones.
   * Nothing runs while the Spaces section is folded, and folded or unreachable machines are
   * skipped (an unreachable one is retried with a growing delay).
   */
  refreshGit(cx) {
    if (this.reading || this.spacesFolded()) return;
    this.reading = true;
    cx.spawn(async (cx2) => {
      const list = checkouts(spaces(), panes());
      const now = Date.now();
      const active = list.filter((c) => this.worthReading(c, now));
      const next = /* @__PURE__ */ new Map();
      for (const c of list) {
        const old = c.spaces.map((id) => this.git.get(id)).find(Boolean);
        if (old) for (const id of c.spaces) next.set(id, old);
      }
      const byMachine = /* @__PURE__ */ new Map();
      for (const c of active) {
        const k = c.machine ?? "";
        byMachine.set(k, [...(byMachine.get(k) ?? []), c]);
      }
      const first = [...byMachine]
        .filter(([k, cs]) => k && cs.some((c) => c.spaces.some((id) => !this.git.has(id))))
        .map(([k]) => k);
      if (first.length) {
        for (const k of first) this.loadingGit.add(k);
        cx2.notify();
      }
      try {
        await Promise.all(
          [...byMachine].map(async ([k, cs]) => {
            try {
              const states = await readGitBatch(k || null, cs);
              this.down.delete(k);
              cs.forEach((c, i) => {
                for (const id of c.spaces) {
                  const st = states[i];
                  if (st) next.set(id, st);
                  else next.delete(id);
                }
              });
            } catch {
              const failures = (this.down.get(k)?.failures ?? 0) + 1;
              this.down.set(k, { failures, until: Date.now() + backoff(failures) });
            }
          }),
        );
      } finally {
        this.reading = false;
      }
      const hadLoading = this.loadingGit.size > 0;
      this.loadingGit.clear();
      const flat = (m) => JSON.stringify([...m].sort());
      if (flat(next) !== flat(this.git)) {
        this.git = next;
        cx2.notify();
      } else if (hadLoading) cx2.notify();
      const at = Date.now();
      this.fetchGit(
        active.filter(
          (c) =>
            c.spaces.some((id) => next.get(id)?.upstream) &&
            at - (this.fetched.get(c.key) ?? 0) > FETCH_MS,
        ),
        cx2,
      );
    });
  }
  /** Fetches each checkout's remote, one at a time, and reads it again: so "behind" is current. */
  fetchGit(list, cx) {
    if (this.fetching || !list.length) return;
    this.fetching = true;
    cx.spawn(async (cx2) => {
      try {
        for (const c of list) {
          this.fetched.set(c.key, Date.now());
          try {
            const on = c.machine ?? void 0;
            const r = await exec2("sh", ["-c", FETCH_SCRIPT], { cwd: c.cwd, on });
            if (r.code !== 0) continue;
            const state = await readGit(c);
            if (!state) continue;
            const before = JSON.stringify(this.git.get(c.spaces[0]));
            for (const id of c.spaces) this.git.set(id, state);
            if (JSON.stringify(state) !== before) cx2.notify();
          } catch {}
        }
      } finally {
        this.fetching = false;
      }
    });
  }
  /** The git badges on a row: arrow-down to pull, arrow-up to push, a dot for uncommitted changes. */
  gitChips(t, s) {
    const g = this.git.get(s.id);
    if (!g) return null;
    const dirty = g.changed + g.untracked;
    if (!g.ahead && !g.behind && !dirty) return null;
    return h_flex2()
      .id(`space-git-${s.id}`)
      .flex_none()
      .gap(2)
      .items_center()
      .tooltip(describe(g))
      .when(g.behind > 0, (el) =>
        el.child(menuBadge(String(g.behind), t.ansi4 ?? t.accent, "arrow-down")),
      )
      .when(g.ahead > 0, (el) =>
        el.child(menuBadge(String(g.ahead), t.ansi2 ?? t.done, "arrow-up")),
      )
      .when(dirty > 0, (el) => el.child(dot(t.ansi3 ?? t.working)));
  }
  /**
   * The row's agent marks: working, waiting for you and finished, each with a count past one;
   * a ring when its agents are all idle. Herdr's own space status when mc-agents publishes none.
   */
  agentMarks(t, s, counts) {
    if (!counts) {
      const st = s.status;
      return st === "working" || st === "blocked" || st === "done" ? statusMark(st, true) : null;
    }
    const marks = [
      ["blocked", counts.blocked, "needs you"],
      ["done", counts.done, "finished"],
      ["working", counts.working, "working"],
    ];
    const shown = marks.filter(([, n]) => n > 0);
    if (!shown.length && !counts.idle) return null;
    const tip = [...marks, ["idle", counts.idle, "idle"]]
      .filter(([, n]) => n > 0)
      .map(([, n, label]) => `${n} ${label}`)
      .join(" · ");
    return h_flex2()
      .id(`space-agents-${s.id}`)
      .flex_none()
      .gap(4)
      .items_center()
      .tooltip(`Agents: ${tip}`)
      .when(!shown.length, (el) => el.child(statusMark("idle", true)))
      .children(
        shown.map(([status, n]) =>
          h_flex2()
            .flex_none()
            .items_center()
            .child(statusMark(status, true))
            .when(n > 1, (el) =>
              el.child(
                div2()
                  .font_family(MONO)
                  .text_size(TEXT.xs)
                  .text_color(t[status] ?? t.muted)
                  .child(String(n)),
              ),
            ),
        ),
      );
  }
  refreshMachines(cx) {
    if (this.listing) return;
    this.listing = true;
    cx.spawn(async (cx2) => {
      try {
        const r = await hc(["machine", "ls", "--json"]);
        if (r.code === 0) {
          const list = parseJson(r.stdout, {}).machines ?? [];
          const next = list.filter((m) => !m.temporary);
          if (JSON.stringify(next) !== JSON.stringify(this.machineList)) {
            this.machineList = next;
            cx2.notify();
          }
        }
      } catch {
      } finally {
        this.listing = false;
      }
    });
  }
  spacesFolded() {
    return shared2(KEYS.spacesFolded) === true;
  }
  /** Gives each space a stable avatar color, shared with Herdr's own sidebar. */
  colors(list) {
    const stored = shared2("space.colors") ?? {};
    const ids = new Set(list.map((s) => s.id));
    const kept = Object.fromEntries(Object.entries(stored).filter(([id]) => ids.has(id)));
    let changed = Object.keys(kept).length !== Object.keys(stored).length;
    for (const s of list) {
      if (kept[s.id]) continue;
      const uses = (c) => Object.values(kept).filter((v) => v === c).length;
      kept[s.id] = PALETTE.reduce((best, c) => (uses(c) < uses(best) ? c : best));
      changed = true;
    }
    if (changed) setShared2("space.colors", kept);
    return kept;
  }
  /** Machines in Herdr's order: this computer, then the others by name. */
  groups(list) {
    const names = /* @__PURE__ */ new Set();
    for (const s of list) if (s.machine) names.add(s.machine);
    for (const m of this.machineList) names.add(m.name);
    const remote = [...names].sort();
    if (!remote.length) return [{ machine: null, spaces: list }];
    return [null, ...remote].map((machine) => ({
      machine,
      spaces: list.filter((s) => (s.machine ?? null) === machine),
    }));
  }
  /** Sizes this block to its rows, leaving Agents the rest (see size.ts). */
  autosize(root, rows, groups) {
    const node = findNode(root, NODES.spaces);
    const current = node?.size?.px;
    if (current === void 0) return;
    const agentsHeight = shared2(KEYS.agentsHeight);
    const want = targetHeight({
      rows,
      groups,
      searching: !this.spacesFolded(),
      spacesFolded: this.spacesFolded(),
      agentsFolded: shared2(KEYS.agentsFolded) === true,
      available:
        typeof agentsHeight === "number" && this.height > 0 ? this.height + agentsHeight : null,
    });
    if (Math.abs(want - current) < 2) return;
    if (this.lastResize?.px === want && Date.now() - this.lastResize.at < 1e3) return;
    this.lastResize = { px: want, at: Date.now() };
    run("layout.resize", { id: NODES.spaces, px: want });
  }
  menu(space) {
    openOverlay({
      mod: "menu",
      kind: "popup",
      width: 200,
      height: 260,
      props: { tab: "space", target: { id: space.id } },
    });
  }
  row(t, s, color, counts, all) {
    const on = s.active;
    const fill = spaceFill(t, color);
    const sameMachine = (id) =>
      (all.find((x) => x.id === id)?.machine ?? null) === (s.machine ?? null);
    const dragging = this.pressed !== null && this.pressed !== s.id && this.over === s.id;
    const from = dragging ? all.findIndex((x) => x.id === this.pressed) : -1;
    const index = all.findIndex((x) => x.id === s.id);
    const branch = s.branch && !["main", "master", s.name].includes(s.branch) ? s.branch : "";
    const hovered = this.hovered === s.id;
    return menuButton(`space-${s.id}`, { active: on })
      .relative()
      .h(ROW)
      .flex_none()
      .when(this.pressed === s.id && this.over !== s.id, (el) => el.opacity(0.5))
      .when(dragging, (el) =>
        el.child(
          div2()
            .absolute()
            .left(0)
            .right(0)
            .h(2)
            .bg(t.accent)
            .when(from < index, (l) => l.bottom(0))
            .when(from > index, (l) => l.top(0)),
        ),
      )
      .on_hover((over, cx) => {
        if (over) this.hovered = s.id;
        else if (this.hovered === s.id) this.hovered = null;
        cx.notify();
      })
      .on_mouse_down("left", () => {
        this.pressed = s.id;
        this.over = s.id;
      })
      .on_mouse_move((_e, cx) => {
        const over = this.pressed !== null && sameMachine(this.pressed) ? s.id : null;
        if (this.pressed !== null && this.over !== over) {
          this.over = over;
          cx.notify();
        }
      })
      .on_mouse_up("left", (_e, cx) => {
        const pressed = this.pressed;
        const over = this.over;
        this.pressed = null;
        this.over = null;
        if (pressed !== null && over === s.id && pressed !== s.id)
          run("space.move", { id: pressed, index: index + 1 });
        else if (pressed === s.id) run("space.select", { id: s.id });
        cx.notify();
      })
      .on_mouse_down("right", () => this.menu(s))
      .child(avatar([...s.name][0] ?? "?", fill))
      .child(div2().min_w(0).max_w(150).truncate().child(s.name))
      .child(
        div2()
          .flex_1()
          .min_w(0)
          .truncate()
          .font_family(MONO)
          .font_normal()
          .text_size(TEXT.xs)
          .text_color(t.muted)
          .when(Boolean(branch), (el) => el.child(branch)),
      )
      .children([this.gitChips(t, s), this.agentMarks(t, s, counts)].filter((e) => e !== null))
      .when(hovered, (el) =>
        el.child(
          // Over the row's right edge, so the content doesn't shift on hover.
          h_flex2()
            .absolute()
            .right(4)
            .top(3)
            .rounded(RADIUS.md)
            .bg(on ? t.selected : t.hover)
            .child(
              button(`space-more-${s.id}`, {
                icon: "ellipsis",
                tooltip: "Space menu",
                size: "icon-xs",
                onClick: (_e, cx) => {
                  cx.stop_propagation();
                  this.menu(s);
                },
              }),
            ),
        ),
      );
  }
  machineHeader(t, machine, count, layoutState) {
    const key = machine ?? "";
    const info = this.machineList.find((m) => m.name === machine);
    const connected = !machine || info?.state === "connected";
    const folded = this.folded.has(key);
    const state = (info?.state ?? "offline").replace(/_/g, " ");
    const note = (text) => div2().flex_none().text_color(t.muted).child(text);
    return groupLabel(`machine-${machine ?? "local"}`, machine ?? "This computer", {
      count,
      open: !folded,
      leading: icon(machine ? "server" : "monitor", ICON.sm),
      onToggle: (cx) => {
        if (folded) {
          this.folded.delete(key);
          this.refreshGit(cx);
        } else this.folded.add(key);
        localStorage.setItem("machines.folded", JSON.stringify([...this.folded]));
        cx.notify();
      },
      trailing: [
        ...(!connected ? [note(state)] : []),
        ...(connected && layoutState === "loading" ? [note("loading…")] : []),
        ...(connected && this.loadingGit.has(key) ? [spinner(ICON.xs, t.muted)] : []),
        ...(connected
          ? [
              button(`machine-new-${machine ?? "local"}`, {
                icon: "plus",
                tooltip: `New space on ${machine ?? "this computer"}`,
                size: "icon-xs",
                onClick: (_e, cx) => {
                  cx.stop_propagation();
                  run("space.new", { machine: machine ?? "" });
                },
              }),
            ]
          : []),
        dot(connected ? (t.ansi2 ?? t.done) : t.muted)
          .id(`machine-state-${machine ?? "local"}`)
          .tooltip(connected ? (machine ? "Connected" : "This computer") : state),
      ],
    });
  }
  compact(t, list, colors, counts) {
    return v_flex2()
      .size_full()
      .bg(t.chrome)
      .p(4)
      .gap(2)
      .children(
        list.map((s) =>
          h_flex2()
            .id(`space-${s.id}`)
            .h(32)
            .flex_none()
            .justify_center()
            .items_center()
            .gap(4)
            .rounded(RADIUS.md)
            .cursor_pointer()
            .when(s.active, (el) => el.bg(t.selected))
            .when(!s.active, (el) => el.hover((st) => st.bg(t.hover)))
            .on_click(() => run("space.select", { id: s.id }))
            .tooltip(s.machine ? `${s.name} · ${s.machine}` : s.name)
            .child(avatar([...s.name][0] ?? "?", spaceFill(t, colors[s.id] ?? "ansi6")))
            .child(statusMark(counts ? urgent(counts[s.id]) : s.status, true)),
        ),
      );
  }
  render() {
    const t = theme2();
    const all = spaces();
    const root = layout();
    const colors = this.colors(all);
    const agentCounts = spaceAgents();
    const countsOf = (id) =>
      agentCounts ? (agentCounts[id] ?? { working: 0, blocked: 0, done: 0, idle: 0 }) : null;
    if (narrow(root)) return this.compact(t, all, colors, agentCounts);
    const open = !this.spacesFolded();
    const query = this.search.value();
    const shown = all.filter((s) => matches(query, s.name, s.branch, s.machine ?? "this computer"));
    const groups = this.groups(shown);
    const grouped = groups.length > 1;
    const layoutOf = new Map(machines().map((m) => [m.name, m.layout]));
    const rows = [];
    let rowCount = 0;
    for (const g of groups) {
      if (grouped)
        rows.push(this.machineHeader(t, g.machine, g.spaces.length, layoutOf.get(g.machine)));
      if (grouped && this.folded.has(g.machine ?? "")) continue;
      for (const s of g.spaces)
        rows.push(this.row(t, s, colors[s.id] ?? "ansi6", countsOf(s.id), all));
      rowCount += g.spaces.length;
    }
    if (!shown.length) {
      rows.push(
        div2()
          .px(8)
          .py(6)
          .text_size(TEXT.xs)
          .text_color(t.muted)
          .child(query ? "No space matches." : "No spaces yet."),
      );
      rowCount += 1;
    }
    this.autosize(root, rowCount, grouped ? groups.length : 0);
    return v_flex2()
      .id("root")
      .size_full()
      .min_h(0)
      .bg(t.chrome)
      .text_size(TEXT.sm)
      .on_size_change((size, cx) => {
        if (Math.abs(size.height - this.height) >= 1) {
          this.height = size.height;
          cx.notify();
        }
      })
      .on_mouse_up("left", (_e, cx) => {
        this.pressed = null;
        this.over = null;
        cx.notify();
      })
      .child(
        div2()
          .flex_none()
          .px(8)
          .child(
            groupLabel("spaces-header", "Spaces", {
              count: all.length,
              open,
              onToggle: (cx) => {
                setShared2(KEYS.spacesFolded, open);
                if (!open) cx.timer.after(50, (cx2) => this.refreshGit(cx2));
              },
              trailing: [
                button("space-new", {
                  icon: "plus",
                  tooltip: "New space",
                  size: "icon-xs",
                  onClick: () => run("space.new"),
                }),
              ],
            }),
          ),
      )
      .when(open, (el) =>
        el
          .child(
            h_flex2()
              .flex_none()
              .h(SEARCH)
              .px(8)
              .pb(8)
              .child(searchBox("space-search", this.search)),
          )
          .child(
            v_flex2()
              .id("space-list")
              .flex_1()
              .min_h(0)
              .px(8)
              .pb(PAD)
              .gap(2)
              .overflow_y_scrollbar()
              .children(rows),
          ),
      );
  }
};
export { Spaces as default };
