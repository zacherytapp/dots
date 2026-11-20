// Generated from src/mods/mc-agents/main.ts and its imports by `pnpm build:herdr`. Edit the sources, not this file.
// .config/herdr-app/src/mods/mc-agents/main.ts
import { div as div2, View } from "gpui-kit";
import { h_flex as h_flex2, v_flex as v_flex2, InputState } from "gpui-base";
import {
  agents,
  home as home2,
  layout,
  nextCommand,
  notify as notify2,
  panes as panes3,
  playSound,
  run as run2,
  setAgentOrder,
  setShared as setShared3,
  shared as shared3,
  spaces as spaces3,
  terminals,
  theme as theme2,
  watchFolder,
} from "herdr";

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

// .config/herdr-app/src/shared/launch.ts
import {
  exec as exec3,
  focused,
  home,
  knownAgents,
  notify,
  panes as panes2,
  run,
  setShared,
  shared,
  spaces as spaces2,
} from "herdr";

// .config/herdr-app/src/shared/config.ts
import { appHome, exec, readTextFile, writeTextFile } from "herdr";

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
function duration(ms) {
  const m = Math.floor(Math.max(0, ms) / 6e4);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 60 ? `${d}d` : `${Math.floor(d / 30)}mo`;
}
function compactNumber(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}k`;
  return String(n);
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
function claudeProjectDir(cwd) {
  return cwd.replace(/[^A-Za-z0-9]/g, "-");
}
function parseJson(text, fallback) {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

// .config/herdr-app/src/shared/config.ts
var MISS_MS = 5 * 6e4;

// .config/herdr-app/src/shared/repo.ts
import { exec as exec2, panes, spaces } from "herdr";
var TTL = 5 * 6e4;
function spaceFolders(space) {
  const tabs = new Set(space.tabs.map((t) => t.id));
  const all = panes()
    .filter((p) => tabs.has(p.tab) && p.cwd)
    .map((p) => p.cwd);
  if (space.folder) all.push(space.folder);
  return [...new Set(all)];
}

// .config/herdr-app/src/shared/launch.ts
function findTab(name) {
  for (const space of spaces2()) {
    const tab = space.tabs.find((t) => t.named && t.name === name);
    if (tab) return { space, tab: tab.id };
  }
  return null;
}
var SESSIONS_KEY = "mc.agents.sessions";
function backgroundSessions() {
  const v = shared(SESSIONS_KEY);
  return new Set(Array.isArray(v) ? v.filter((n) => typeof n === "string") : []);
}
function publishSessions(names) {
  const next = [...new Set(names)].sort();
  const now = [...backgroundSessions()].sort();
  if (next.join("\n") !== now.join("\n")) setShared(SESSIONS_KEY, next);
}

// .config/herdr-app/src/shared/space-agents.ts
import { setShared as setShared2, shared as shared2 } from "herdr";

// .config/herdr-app/src/shared/space-agents-model.ts
var WEEK = 7 * 864e5;
var inside = (folder, path) => {
  const f = folder.replace(/\/+$/, "");
  return path === f || path.startsWith(`${f}/`);
};
function placeOf(row, places) {
  const cwd = row.job?.cwd ?? row.cwd;
  if (!cwd) return null;
  let best = null;
  for (const p of places) {
    if ((p.machine ?? null) !== (row.machine ?? null)) continue;
    for (const f of p.folders) {
      if (f && inside(f, cwd) && (!best || f.length > best.len)) best = { id: p.id, len: f.length };
    }
  }
  return best?.id ?? null;
}
function countBySpace(rows, places, now = Date.now()) {
  const out = {};
  for (const r of rows) {
    if (r.depth > 0) continue;
    if (r.job && now - r.job.updated > WEEK) continue;
    const id = r.space ?? (r.job ? placeOf(r, places) : null);
    if (!id) continue;
    const c = (out[id] ??= { working: 0, blocked: 0, done: 0, idle: 0 });
    c[r.status] += 1;
  }
  return out;
}

// .config/herdr-app/src/shared/space-agents.ts
var SPACE_AGENTS_KEY = "mc.agents.bySpace";
function publishSpaceAgents(counts) {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  if (JSON.stringify(shared2(SPACE_AGENTS_KEY)) === JSON.stringify(sorted)) return;
  setShared2(SPACE_AGENTS_KEY, sorted);
}

// .config/herdr-app/src/shared/ui.ts
import { div, image, svg } from "gpui-kit";
import { h_flex, v_flex, Input } from "gpui-base";
import { theme } from "herdr";

// .config/herdr-app/src/shared/icons.ts
import {
  appHome as appHome2,
  exec as exec4,
  readTextFile as readTextFile2,
  writeTextFile as writeTextFile2,
} from "herdr";

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
  const dir = `${appHome2()}/mods/mc-agents/icons`;
  return (async () => {
    await exec4("mkdir", ["-p", dir]);
    for (const [name, svg2] of Object.entries(ICONS)) {
      const path = `${dir}/${name}.svg`;
      const now = await readTextFile2(path).catch(() => null);
      if (now !== svg2) await writeTextFile2(path, svg2, now).catch(() => null);
    }
  })().catch(() => {
    installing = null;
  });
}
function asset(name) {
  installing ??= install();
  return `mods/mc-agents/icons/${name}.svg`;
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
function agentIcon(p, size, color) {
  return programIcon(p, size, color) ?? icon("bot", size, color);
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
function separator(vertical = false, length = 16) {
  const t = theme();
  return vertical
    ? div().w(1).h(length).flex_none().bg(t.border)
    : div().h(1).w_full().flex_none().bg(t.border);
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

// .config/herdr-app/src/mods/mc-agents/context.ts
import { exec as exec5 } from "herdr";

// .config/herdr-app/src/mods/mc-agents/usage.ts
function parseUsage(line) {
  const text = line.trim();
  if (!text) return null;
  try {
    const row = JSON.parse(text);
    const u = row.message?.usage;
    if (row.type !== "assistant" || !u) return null;
    const tokens =
      (u.input_tokens ?? 0) +
      (u.cache_creation_input_tokens ?? 0) +
      (u.cache_read_input_tokens ?? 0);
    const effort = typeof row.effort === "string" && row.effort ? row.effort : null;
    return tokens > 0 ? { tokens, model: row.message?.model ?? null, effort } : null;
  } catch {
    const num = (k) => Number(new RegExp(`"${k}":(\\d+)`).exec(text)?.[1] ?? 0);
    const tokens =
      num("input_tokens") + num("cache_creation_input_tokens") + num("cache_read_input_tokens");
    const model = /"model":"([^"]+)"/.exec(text)?.[1] ?? null;
    const efforts = [...text.matchAll(/"effort":"([a-z]+)"/g)];
    const effort = efforts.at(-1)?.[1] ?? null;
    return tokens > 0 ? { tokens, model, effort } : null;
  }
}
function shortModel(model) {
  if (!model) return "";
  const m = /claude-([a-z]+)-(\d+)(?:-(\d+))?/.exec(model);
  return m ? `${m[1]} ${m[2]}${m[3] && m[3].length <= 2 ? `.${m[3]}` : ""}` : model;
}
function splitBlocks(stdout) {
  const out = /* @__PURE__ */ new Map();
  for (const block of stdout.split("").slice(1)) {
    const nl = block.indexOf("\n");
    if (nl < 0) continue;
    out.set(block.slice(0, nl), block.slice(nl + 1));
  }
  return out;
}
function contextKey(rows) {
  return rows
    .map((r) => `${r.address}|${r.machine}|${r.job?.sessionId ?? ""}|${r.job?.updated ?? 0}`)
    .join("\n");
}
function sameReadings(a, b) {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) {
    const w = b.get(k);
    if (!w || w.tokens !== v.tokens || w.model !== v.model || w.effort !== v.effort) return false;
  }
  return true;
}

// .config/herdr-app/src/mods/mc-agents/context.ts
var READER = [
  'for a in "$@"; do',
  "  f=",
  '  case "$a" in',
  '    f:*) f="$HOME/.claude/projects/${a#f:}" ;;',
  '    d:*) f=$(ls -t "$HOME/.claude/projects/${a#d:}"/*.jsonl 2>/dev/null | head -n 1) ;;',
  "  esac",
  '  [ -n "$f" ] && [ -f "$f" ] || continue',
  '  printf "\\036%s\\n" "$a"',
  // An image the agent just read is one line of megabytes: look further back past it.
  "  for n in 400000 4000000 16000000; do",
  `    l=$(tail -c "$n" "$f" | grep '"type":"assistant"' | tail -n 1)`,
  '    [ -n "$l" ] && break',
  "  done",
  '  printf "%s\\n" "$l"',
  "done",
].join("\n");
var isClaude = (r) => r.program?.key === "claude" || /claude/i.test(r.program?.name ?? "");
async function readContexts(rows) {
  const byMachine = /* @__PURE__ */ new Map();
  const add = (r, arg) => {
    const args = byMachine.get(r.machine) ?? /* @__PURE__ */ new Map();
    args.set(arg, [...(args.get(arg) ?? []), r]);
    byMachine.set(r.machine, args);
  };
  const here = /* @__PURE__ */ new Map();
  const where = (r) => JSON.stringify([r.machine, r.job?.cwd ?? r.cwd]);
  for (const r of rows) if (r.job || isClaude(r)) here.set(where(r), (here.get(where(r)) ?? 0) + 1);
  for (const r of rows) {
    if (r.job?.sessionId && r.job.cwd) {
      add(r, `f:${claudeProjectDir(r.job.cwd)}/${r.job.sessionId}.jsonl`);
    } else if (isClaude(r) && r.cwd && here.get(where(r)) === 1) {
      add(r, `d:${claudeProjectDir(r.cwd)}`);
    }
  }
  const out = /* @__PURE__ */ new Map();
  await Promise.all(
    [...byMachine].map(async ([machine, args]) => {
      const usable = [...args];
      if (!usable.length) return;
      try {
        const r = await exec5("sh", ["-c", READER, "sh", ...usable.map(([a]) => a)], {
          on: machine ?? void 0,
        });
        const lines = splitBlocks(r.stdout);
        for (const [arg, rs] of usable) {
          const usage = parseUsage(lines.get(arg) ?? "");
          if (usage) for (const row of rs) out.set(row.address, { ...usage, at: Date.now() });
        }
      } catch {}
    }),
  );
  return out;
}

// .config/herdr-app/src/mods/mc-agents/jobs.ts
import { exec as exec6, machines } from "herdr";

// .config/herdr-app/src/mods/mc-agents/jobs-model.ts
var CLOSED = /* @__PURE__ */ new Set(["done", "failed"]);
function parseJobs(stdout, machine) {
  const jobs = [];
  for (const block of stdout.split("").slice(1)) {
    const nl = block.indexOf("\n");
    if (nl <= 0) continue;
    const id = block.slice(0, nl).trim();
    try {
      const s = JSON.parse(block.slice(nl + 1));
      const str = (k) => (typeof s[k] === "string" ? s[k] : "");
      const updated = Date.parse(str("updatedAt") || str("createdAt"));
      jobs.push({
        id,
        machine,
        state: str("state") || "unknown",
        detail: str("detail").replace(/\s+/g, " ").trim(),
        name: str("name") || str("intent").slice(0, 60) || id,
        cwd: str("cwd"),
        sessionId: str("sessionId") || str("resumeSessionId"),
        updated: Number.isFinite(updated) ? updated : 0,
        tokens: typeof s.tokens === "number" ? s.tokens : null,
      });
    } catch {}
  }
  return jobs;
}
function touchesState(paths, root) {
  const base = root.replace(/\/+$/, "");
  return paths.some((p) => p.replace(/\/+$/, "") === base || p.endsWith("/state.json"));
}
var STALE_WORKING = 60 * 6e4;
function jobStatus(job, now) {
  if (job.state === "working") return now - job.updated < STALE_WORKING ? "working" : "idle";
  if (job.state === "blocked") return "blocked";
  return "idle";
}
var norm = (s) =>
  s
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim()
    .toLowerCase();
function related(a, b) {
  const x = a.replace(/\/+$/, "") || "/";
  const y = b.replace(/\/+$/, "") || "/";
  return x === y || x.startsWith(`${y}/`) || y.startsWith(`${x}/`);
}
function matchJob(jobs, machine, cwd, titles, taken, fallback = false) {
  if (!cwd) return null;
  const names = new Set(
    (Array.isArray(titles) ? titles : [titles]).map((t) => norm(t ?? "")).filter(Boolean),
  );
  const near = jobs.filter(
    (j) => j.machine === machine && !taken.has(j.id) && j.cwd && related(j.cwd, cwd),
  );
  const named = near
    .filter((j) => names.has(norm(j.name)))
    .sort((a, b) => Number(b.cwd === cwd) - Number(a.cwd === cwd) || b.updated - a.updated);
  if (named.length) return named[0];
  if (!fallback) return null;
  const open = near.filter((j) => j.cwd === cwd && !CLOSED.has(j.state));
  return open.length === 1 ? open[0] : null;
}
function skipAfterFailures(fails) {
  return fails <= 0 ? 0 : Math.min(2 ** fails - 1, 11);
}
function jobsKey(jobs) {
  return jobs.map((j) => `${j.machine}/${j.id}/${j.state}/${j.detail}/${j.updated}`).join("\n");
}

// .config/herdr-app/src/mods/mc-agents/jobs.ts
var READER2 = [
  'cd "$HOME/.claude/jobs" 2>/dev/null || exit 0',
  `{ find . -mindepth 2 -maxdepth 2 -name state.json -mmin -2880; grep -LE '"state":"(done|failed)"' */state.json 2>/dev/null; } |`,
  "  sed 's#^\\./##' | sort -u | while read -r f; do",
  '    [ -f "$f" ] || continue',
  '    printf "\\036%s\\n" "${f%%/*}"',
  '    cat "$f"',
  '    printf "\\n"',
  "  done",
].join("\n");
function jobMachines() {
  return machines()
    .filter((m) => m.name && m.layout !== "unavailable")
    .map((m) => m.name);
}
async function readJobsOn(machine) {
  try {
    const r = await exec6("sh", ["-c", READER2], { on: machine ?? void 0, timeout: 15e3 });
    return parseJobs(r.stdout, machine);
  } catch {
    return null;
  }
}

// .config/herdr-app/src/mods/mc-agents/model.ts
var RANK = { blocked: 4, done: 3, working: 2, idle: 1 };
var SECTIONS = [
  { rank: 4, label: "Needs you", tone: "blocked" },
  { rank: 3, label: "Done", tone: "done" },
  { rank: 2, label: "Working", tone: "working" },
  { rank: 1, label: "Idle", tone: null },
];
function machineOf(address) {
  const slash = address.indexOf("/");
  return slash > 0 ? address.slice(0, slash) : null;
}
function normalStatus(s) {
  if (s === "error") return "blocked";
  return s === "blocked" || s === "done" || s === "working" ? s : "idle";
}
function titleStatus(title) {
  return titleMark(title) ?? "idle";
}
function titleMark(title) {
  const t = title ?? "";
  if (/^\s*[\u25d0-\u25d3\u2800-\u28ff]/.test(t)) return "working";
  return /^\s*\u2733/.test(t) ? "idle" : null;
}
function liveStatus(title, job, now = Date.now()) {
  if (job?.state === "blocked") return "blocked";
  return titleMark(title) ?? (job ? jobStatus(job, now) : "idle");
}
function trackFinished(rows, before, finished, seen) {
  const next = /* @__PURE__ */ new Set();
  for (const r of rows) {
    if (!r.guessed || !r.pane || r.depth > 0) continue;
    if ((r.status !== "idle" && r.status !== "done") || seen(r)) continue;
    if (finished.has(r.address) || before?.get(r.address) === "working") next.add(r.address);
  }
  return next;
}
function meaningful(title, program) {
  const t = cleanTitle(title);
  if (!t || /^\d+$/.test(t) || /^[~/]/.test(t) || t.includes("@")) return null;
  const lower = t.toLowerCase();
  if (
    [program?.name, program?.key, "terminal", "agent", "claude code", "claude"].some(
      (v) => v && lower === v.toLowerCase(),
    )
  )
    return null;
  return t;
}
function buildModel(input) {
  const byAddress = new Map(input.terminals.map((t) => [t.address, t]));
  const spaceById = new Map(input.spaces.map((s) => [s.id, s]));
  const listed = new Set(input.agents.map((a) => a.address));
  const rawTitle = new Map(input.agents.map((a) => [a.address, a.title]));
  const nativeRows = input.agents.map((a) => {
    const space = spaceById.get(a.space);
    const tab = space?.tabs.find((t) => t.id === a.tab);
    const title =
      (tab?.named ? tab.name : null) ??
      meaningful(a.title, a.program) ??
      meaningful(a.tab_name, a.program) ??
      a.program?.name ??
      "Agent";
    return {
      address: a.address,
      pane: a.pane,
      native: true,
      machine: space?.machine ?? machineOf(a.address),
      space: a.space,
      spaceName: a.space_name || space?.name || "",
      tabName: tab?.name ?? a.tab_name,
      title,
      status: normalStatus(a.status),
      program: a.program ?? null,
      pinned: a.pinned,
      focused: a.focused,
      cwd: byAddress.get(a.address)?.cwd ?? null,
      depth: 0,
      kids: 0,
      guessed: false,
      detail: null,
      job: null,
    };
  });
  const spaceOfTab = new Map(input.spaces.flatMap((s) => s.tabs.map((t) => [t.id, s])));
  for (const p of input.panes) {
    if (!p.terminal || listed.has(p.terminal) || !(p.program?.agent || p.app)) continue;
    const space = spaceOfTab.get(p.tab);
    const tab = space?.tabs.find((t) => t.id === p.tab);
    listed.add(p.terminal);
    rawTitle.set(p.terminal, p.title);
    nativeRows.push({
      address: p.terminal,
      pane: p.pane,
      native: true,
      machine: space?.machine ?? machineOf(p.terminal),
      space: space?.id ?? null,
      spaceName: space?.name ?? "",
      tabName: tab?.name ?? "",
      title:
        (tab?.named ? tab.name : null) ??
        meaningful(p.title, p.program) ??
        p.program?.name ??
        "Agent",
      status: p.status ? normalStatus(p.status) : titleStatus(p.title),
      program: p.program ?? null,
      pinned: false,
      focused: p.focused,
      cwd: p.cwd ?? byAddress.get(p.terminal)?.cwd ?? null,
      depth: 0,
      kids: 0,
      guessed: !p.status,
      detail: null,
      job: null,
    });
  }
  const jobs = input.jobs ?? [];
  const now = input.now ?? Date.now();
  const taken = /* @__PURE__ */ new Set();
  const attach = (r, job) => {
    if (!job) return;
    taken.add(job.id);
    r.job = job;
    r.detail = job.detail || null;
    if (r.guessed) r.status = liveStatus(rawTitle.get(r.address), job, now);
  };
  const titles = (r) => [rawTitle.get(r.address), r.title];
  for (const r of nativeRows) attach(r, matchJob(jobs, r.machine, r.cwd, titles(r), taken));
  const left = nativeRows.filter((r) => !r.job && r.cwd);
  for (const r of left) {
    const alone = left.filter((o) => o.machine === r.machine && o.cwd === r.cwd).length === 1;
    if (alone) attach(r, matchJob(jobs, r.machine, r.cwd, titles(r), taken, true));
  }
  for (const r of nativeRows)
    if (r.guessed && r.status === "idle" && input.finished?.has(r.address)) r.status = "done";
  const isAgent = (t) =>
    t.state === "live" && (t.program?.agent === true || (t.status != null && t.status !== ""));
  const extraRow = (t, depth) => {
    const [spaceName = "", tabName = ""] = (t.where ?? "").split(" / ");
    return {
      address: t.address,
      pane: null,
      native: false,
      machine: machineOf(t.address),
      space: null,
      spaceName: spaceName.trim(),
      tabName: tabName.trim(),
      title:
        meaningful(t.name, t.program) ??
        meaningful(t.title, t.program) ??
        t.program?.name ??
        t.agent ??
        t.address,
      status: depth > 0 && t.status === "done" ? "idle" : normalStatus(t.status),
      program: t.program ?? null,
      pinned: false,
      focused: false,
      cwd: t.cwd ?? null,
      depth,
      kids: 0,
      guessed: !t.status,
      detail: null,
      job: null,
    };
  };
  const children = /* @__PURE__ */ new Map();
  for (const t of input.terminals) {
    if (t.parent && t.state === "live" && !listed.has(t.address)) {
      const list = children.get(t.parent) ?? [];
      list.push(t);
      children.set(t.parent, list);
    }
  }
  const tree = (address, depth, seen2) =>
    (children.get(address) ?? []).flatMap((k) => {
      if (seen2.has(k.address)) return [];
      seen2.add(k.address);
      return [extraRow(k, depth), ...tree(k.address, depth + 1, seen2)];
    });
  const seen = new Set(listed);
  const withKids = (row) => {
    const kids = tree(row.address, 1, seen);
    row.kids = kids.length;
    for (const k of kids) if (RANK[k.status] > RANK[row.status]) row.status = k.status;
    return input.folded.has(row.address) ? [row] : [row, ...kids];
  };
  const inPane = new Set(input.panes.map((p) => p.terminal).filter(Boolean));
  const outside = input.terminals.filter(
    (t) =>
      isAgent(t) &&
      !listed.has(t.address) &&
      !inPane.has(t.address) &&
      !(t.parent && byAddress.has(t.parent)),
  );
  const claude = nativeRows.find((r) => r.program?.key === "claude")?.program ?? null;
  const shown = new Set(nativeRows.map((r) => r.job).filter(Boolean));
  const jobRow = (j) => ({
    address: `job:${j.machine ?? ""}/${j.id}`,
    pane: null,
    native: false,
    machine: j.machine,
    space: null,
    spaceName: j.cwd.split("/").filter(Boolean).pop() ?? "",
    tabName: "",
    title: j.name,
    status: jobStatus(j, now),
    program: claude,
    pinned: false,
    focused: false,
    cwd: j.cwd,
    depth: 0,
    kids: 0,
    guessed: true,
    detail: j.detail || (j.state === "stopped" ? "Stopped" : null),
    job: j,
  });
  const WEEK2 = 7 * 864e5;
  const openJobs = jobs.filter((j) => !CLOSED.has(j.state) && !shown.has(j));
  const recent = (j) => now - j.updated < WEEK2;
  const activeJobs = openJobs.filter((j) => recent(j) && j.state !== "stopped").map(jobRow);
  const stoppedJobs = openJobs.filter((j) => recent(j) && j.state === "stopped").map(jobRow);
  const oldJobs = openJobs.filter((j) => !recent(j)).map(jobRow);
  const keep = (r) =>
    matches(
      input.query,
      r.title,
      r.detail,
      r.spaceName,
      r.tabName,
      r.machine ?? "this computer",
      r.program?.name,
    );
  const native = [
    ...nativeRows.filter(keep),
    ...(input.mode === "priority" ? activeJobs.filter(keep) : []),
  ];
  const extras = outside.map((t) => extraRow(t, 0)).filter(keep);
  const groups = [];
  const byUrgency = (a, b) =>
    RANK[b.status] - RANK[a.status] || (b.job?.updated ?? 0) - (a.job?.updated ?? 0);
  const pinned = native.filter((r) => r.pinned);
  if (pinned.length)
    groups.push({ id: "pinned", label: "Pinned", tone: null, rows: pinned, count: 0 });
  const rest = native.filter((r) => !r.pinned);
  if (input.mode === "priority") {
    const expanded = rest.map((r) => withKids(r));
    for (const s of SECTIONS) {
      const mine = expanded.filter((rows) => RANK[rows[0].status] === s.rank).flat();
      if (mine.length)
        groups.push({ id: `rank-${s.rank}`, label: s.label, tone: s.tone, rows: mine, count: 0 });
    }
  } else {
    const order2 = new Map(input.spaces.map((s, i) => [s.id, i]));
    const bySpace = /* @__PURE__ */ new Map();
    for (const r of [...rest].sort(
      (a, b) => (order2.get(a.space ?? "") ?? 1e9) - (order2.get(b.space ?? "") ?? 1e9),
    )) {
      const key = r.space ?? "";
      bySpace.set(key, [...(bySpace.get(key) ?? []), ...withKids(r)]);
    }
    for (const [id, rows] of bySpace) {
      const head = rows[0];
      const label = head.machine ? `${head.spaceName} · ${head.machine}` : head.spaceName;
      groups.push({ id: `space-${id}`, label: label || "Space", tone: null, rows, count: 0 });
    }
    const bg = activeJobs.filter(keep).sort(byUrgency);
    if (bg.length)
      groups.push({ id: "jobs", label: "Background jobs", tone: null, rows: bg, count: 0 });
  }
  for (const r of pinned) {
    const i = groups[0].rows.indexOf(r);
    groups[0].rows.splice(i + 1, 0, ...withKids(r).slice(1));
  }
  if (extras.length) {
    const rows = extras.sort((a, b) => RANK[b.status] - RANK[a.status]).flatMap(withKids);
    groups.push({ id: "outside", label: "Outside spaces", tone: null, rows, count: 0 });
  }
  const stopped = stoppedJobs.filter(keep).sort(byUrgency);
  if (stopped.length)
    groups.push({ id: "jobs-stopped", label: "Stopped jobs", tone: null, rows: stopped, count: 0 });
  const old = oldJobs.filter(keep).sort(byUrgency);
  if (old.length)
    groups.push({
      id: "jobs-old",
      label: "Jobs older than a week",
      tone: null,
      rows: old,
      count: 0,
    });
  const all = groups.flatMap((g) => g.rows).filter((r) => r.depth === 0);
  for (const g of groups) {
    g.count = g.rows.length;
    if (input.folded.has(g.id)) g.rows = [];
  }
  const order = groups
    .flatMap((g) => g.rows)
    .filter((r) => r.native)
    .map((r) => r.address);
  for (const a of input.agents) if (!order.includes(a.address)) order.push(a.address);
  const stale = new Set([...stoppedJobs, ...oldJobs].map((r) => r.address));
  const needsYou = all.filter((r) => r.status === "blocked" && !stale.has(r.address));
  return {
    groups,
    order,
    all,
    needsYou,
    total: nativeRows.length + outside.length + openJobs.length,
  };
}

// .config/herdr-app/src/mods/mc-agents/main.ts
var narrow = () => (findNode(layout(), NODES.sidebar)?.size?.px ?? Infinity) < 160;
var REMOTE_JOBS_MS = 3e3;
var LOCAL_JOBS_MS = 15e3;
var FOLDED_AT_FIRST = ["jobs-stopped", "jobs-old"];
function attachJob(job) {
  const existing = findTab(job.name);
  if (existing) {
    run2("space.select", { id: existing.space.id });
    run2("tab.select", { id: existing.tab });
    return;
  }
  const argv = ["claude", "attach", job.id];
  const inside2 = (f) => job.cwd === f || job.cwd.startsWith(`${f.replace(/\/+$/, "")}/`);
  const space = spaces3().find(
    (s) => (s.machine ?? null) === job.machine && spaceFolders(s).some(inside2),
  );
  if (space) {
    run2("space.select", { id: space.id });
    run2("tab.new", { space: space.id, folder: job.cwd, name: job.name, argv });
  } else {
    run2("space.new", { machine: job.machine ?? "", folder: job.cwd, argv });
  }
}
var Agents = class extends View {
  init(_props, cx) {
    this.search = InputState.new({ placeholder: "Find an agent" });
    this.search.on("change", (_e, cx2) => cx2.notify());
    this.folded = new Set(parseJson(localStorage.getItem("folded.v2"), FOLDED_AT_FIRST));
    this.hovered = null;
    this.readings = /* @__PURE__ */ new Map();
    this.changed = parseJson(localStorage.getItem("changed"), {});
    this.rows = [];
    this.reading = false;
    this.jobs = [];
    this.jobsBy = /* @__PURE__ */ new Map();
    this.jobsBusy = /* @__PURE__ */ new Set();
    this.jobsAgain = /* @__PURE__ */ new Set();
    this.jobsFails = /* @__PURE__ */ new Map();
    this.contextSeen = { key: "", at: 0 };
    this.lastStatus = null;
    this.finished = /* @__PURE__ */ new Set();
    this.drawnKey = "";
    this.orderKey = null;
    this.cursor = null;
    this.urgent = [];
    this.navRows = [];
    cx.spawn(async (cx2) => {
      for (;;) {
        const c = await nextCommand();
        try {
          if (c === "next") this.step(1);
          else if (c === "prev") this.step(-1);
          else if (c === "needs-you") this.nextNeedingYou();
        } catch {}
        cx2.notify();
      }
    });
    cx.timer.every(1e3, (cx2) => {
      if (this.liveKey() !== this.drawnKey) cx2.notify();
    });
    this.readJobs(null, cx, true);
    this.readRemoteJobs(cx);
    this.watchJobs(cx);
    cx.timer.every(LOCAL_JOBS_MS, (cx2) => this.readJobs(null, cx2, true));
    cx.timer.every(REMOTE_JOBS_MS, (cx2) => this.readRemoteJobs(cx2));
    cx.timer.every(15e3, (cx2) => this.readContext(cx2));
    cx.timer.after(1500, (cx2) => this.readContext(cx2));
  }
  /**
   * What each pane's state is read from: its reported status, else its title's spinner or still
   * mark. A title change alone may not redraw a mod, so a 1 s look compares this to what was drawn
   * and redraws only when an agent would change state (and then notifies at once if it waits).
   */
  liveKey(paneList = panes3()) {
    return paneList.map((p) => `${p.terminal}:${p.status ?? titleMark(p.title) ?? ""}`).join("|");
  }
  mode() {
    return shared3("mc.agents.mode") === "spaces" ? "spaces" : "priority";
  }
  open() {
    return shared3(KEYS.agentsFolded) !== true;
  }
  readContext(cx) {
    if (this.reading || !this.open()) return;
    const rows = this.rows.filter((r) => r.depth === 0);
    const key = contextKey(rows);
    const now = Date.now();
    const working = rows.some((r) => r.status === "working");
    if (key === this.contextSeen.key && !working && now - this.contextSeen.at < 12e4) return;
    this.contextSeen = { key, at: now };
    this.reading = true;
    cx.spawn(async (cx2) => {
      try {
        const next = await readContexts(rows);
        if (!sameReadings(next, this.readings)) {
          this.readings = next;
          cx2.notify();
        }
      } finally {
        this.reading = false;
      }
    });
  }
  /** Reads this computer's jobs the moment Claude Code writes one (state.json). */
  watchJobs(cx) {
    const dir = `${home2()}/.claude/jobs`;
    cx.spawn(async (cx2) => {
      for (;;) {
        let paths;
        try {
          paths = await watchFolder(dir);
        } catch {
          return;
        }
        if (touchesState(paths, dir)) this.readJobs(null, cx2);
      }
    });
  }
  readRemoteJobs(cx) {
    const live = jobMachines();
    for (const key of [...this.jobsBy.keys()])
      if (key && !live.includes(key)) {
        this.jobsBy.delete(key);
        this.jobsFails.delete(key);
        this.publishJobs(cx);
      }
    for (const m of live) {
      const f = this.jobsFails.get(m);
      if (f && f.wait > 0) {
        f.wait--;
        continue;
      }
      this.readJobs(m, cx, true);
    }
  }
  /**
   * Reads one machine's jobs. A read asked for by a timer while one is running is dropped (a slow
   * machine never stacks requests); one asked for by a change on disk runs again right after.
   */
  readJobs(machine, cx, timer = false) {
    const key = machine ?? "";
    if (this.jobsBusy.has(key)) {
      if (!timer) this.jobsAgain.add(key);
      return;
    }
    this.jobsBusy.add(key);
    cx.spawn(async (cx2) => {
      try {
        do {
          this.jobsAgain.delete(key);
          const jobs = await readJobsOn(machine);
          const was = this.jobsFails.get(key);
          const wasLoaded = this.jobsBy.has(key);
          if (jobs) {
            this.jobsBy.set(key, jobs);
            this.jobsFails.delete(key);
          } else if (machine) {
            const fails = (was?.fails ?? 0) + 1;
            this.jobsFails.set(key, { fails, wait: skipAfterFailures(fails) });
            if (!this.jobsBy.has(key)) this.jobsBy.set(key, []);
          }
          const flipped =
            Boolean(was) !== Boolean(this.jobsFails.get(key)) || (machine !== null && !wasLoaded);
          if (!this.publishJobs(cx2) && flipped) cx2.notify();
        } while (this.jobsAgain.has(key));
      } finally {
        this.jobsBusy.delete(key);
      }
    });
  }
  /** Machines not read yet (loading) and those that can't be reached, for the list to show. */
  machineNotes() {
    const live = jobMachines();
    return {
      loading: live.filter((m) => !this.jobsBy.has(m)),
      away: live.filter((m) => this.jobsFails.has(m)),
    };
  }
  /** Redraws only when a job's state, detail or time changed. */
  publishJobs(cx) {
    const jobs = [...this.jobsBy.values()].flat();
    if (jobsKey(jobs) === jobsKey(this.jobs)) {
      return false;
    }
    this.jobs = jobs;
    publishSessions(jobs.map((j) => j.name));
    cx.notify();
    return true;
  }
  /**
   * Posts a notification when an agent starts waiting for you. Herdr already does this for agents
   * that report their status, so only rows whose state comes from a job or a title do it here.
   */
  alert(rows) {
    const now = new Map(rows.map((r) => [r.address, r.status]));
    const before = this.lastStatus;
    this.lastStatus = now;
    if (!before) return;
    for (const r of rows) {
      if (r.status !== "blocked" || before.get(r.address) === "blocked" || !r.guessed) continue;
      if (!before.has(r.address) && r.job && Date.now() - r.job.updated > 12e4) continue;
      const where = [r.spaceName, r.machine].filter(Boolean).join(" · ");
      notify2({
        title: `${r.title} needs you`,
        body: [r.detail, where].filter(Boolean).join("\n"),
        level: "warning",
        action: r.pane ? { name: "pane.focus", args: { pane: r.pane } } : void 0,
      });
      playSound("blocked");
    }
  }
  fold(id, cx) {
    if (this.folded.has(id)) this.folded.delete(id);
    else this.folded.add(id);
    localStorage.setItem("folded.v2", JSON.stringify([...this.folded]));
    cx.notify();
  }
  /** Remembers when each agent's state last changed (done and idle count as one). */
  track(rows) {
    const now = Date.now();
    let dirty = false;
    for (const r of rows) {
      const s = r.status === "done" ? "idle" : r.status;
      if (this.changed[r.address]?.s === s) continue;
      this.changed[r.address] = { s, at: now };
      dirty = true;
    }
    if (!dirty) return;
    const live = new Set(rows.map((r) => r.address));
    for (const [k, v] of Object.entries(this.changed))
      if (!live.has(k) && now - v.at > 7 * 864e5) delete this.changed[k];
    localStorage.setItem("changed", JSON.stringify(this.changed));
  }
  focus(r) {
    this.cursor = r.address;
    if (r.native && r.pane) run2("pane.focus", { pane: r.pane });
    else if (r.job) attachJob(r.job);
    else run2("terminal.peek", { terminal: r.address });
  }
  /** The agent being looked at: the focused pane in the shown tab, else where the keys last went. */
  current() {
    const tab = spaces3()
      .find((s) => s.active)
      ?.tabs.find((t) => t.active)?.id;
    return panes3().find((p) => p.tab === tab && p.focused)?.terminal ?? this.cursor;
  }
  /**
   * Shows the next (or previous) agent in a pane, in the order this list draws them. Background
   * jobs without a tab are skipped: stepping past one shouldn't open a tab for it.
   */
  step(step) {
    const list = this.navRows.filter((r) => r.depth === 0 && r.native && r.pane);
    const here = this.current();
    const next = stepIn(
      list,
      list.findIndex((r) => r.address === here),
      step,
    );
    if (next) this.focus(next);
  }
  /** Shows the next agent waiting for you after the current one (a background job opens in a tab). */
  nextNeedingYou() {
    const here = this.current();
    const next = stepIn(
      this.urgent,
      this.urgent.findIndex((r) => r.address === here),
      1,
    );
    if (next) this.focus(next);
  }
  row(t, r) {
    const pic =
      programIcon(r.program, ICON.md, t.foreground) ??
      (r.job ? icon("bot", ICON.md, t.muted) : null);
    if (r.depth > 0) {
      return h_flex2()
        .w_full()
        .flex_none()
        .pl(14 + (r.depth - 1) * 14)
        .child(
          h_flex2()
            .flex_1()
            .min_w(0)
            .pl(10)
            .border_l(1)
            .border_color(t.border)
            .child(
              menuButton(`ag-${r.address}`, { size: "sm", onClick: () => this.focus(r) })
                .child(r.program ? agentIcon(r.program, ICON.xs, t.foreground) : div2().w(ICON.xs))
                .child(div2().flex_1().min_w(0).truncate().text_color(t.muted).child(r.title))
                .child(statusMark(r.status, true)),
            ),
        );
    }
    const since = r.job && !r.pane ? r.job.updated : this.changed[r.address]?.at;
    const reading = this.readings.get(r.address);
    const hovered = this.hovered === r.address;
    const where =
      [r.spaceName, r.machine, r.job && !r.pane ? "background" : null]
        .filter(Boolean)
        .join(" · ") || "Outside spaces";
    const idle = r.status === "idle" && !r.focused;
    return menuButton(`ag-${r.address}`, {
      active: r.focused,
      size: "auto",
      onClick: () => this.focus(r),
    })
      .relative()
      .flex_col()
      .items_stretch()
      .flex_none()
      .gap(2)
      .on_hover((over, cx) => {
        if (over) this.hovered = r.address;
        else if (this.hovered === r.address) this.hovered = null;
        cx.notify();
      })
      .child(
        h_flex2()
          .gap(8)
          .items_center()
          .child(pic ? div2().w(ICON.md).flex_none().child(pic) : div2().w(ICON.md).flex_none())
          .child(
            div2()
              .flex_1()
              .min_w(0)
              .truncate()
              .text_color(idle ? t.muted : t.foreground)
              .child(r.title),
          )
          .when(r.kids > 0, (el) =>
            el.child(
              button(`kids-${r.address}`, {
                label: String(r.kids),
                icon: this.folded.has(r.address) ? "chevron-right" : "chevron-down",
                size: "xs",
                tooltip: this.folded.has(r.address) ? "Show sub-agents" : "Hide sub-agents",
                onClick: (_e, cx) => {
                  cx.stop_propagation();
                  this.fold(r.address, cx);
                },
              }),
            ),
          )
          .child(statusMark(r.status, true)),
      )
      .child(
        h_flex2()
          .pl(24)
          .gap(6)
          .items_center()
          .text_size(TEXT.xs)
          .text_color(t.muted)
          .child(div2().flex_1().min_w(0).truncate().child(where))
          .when(Boolean(since), (el) =>
            el.child(
              div2()
                .flex_none()
                .font_family(MONO)
                .child(duration(Date.now() - since)),
            ),
          ),
      )
      .when(Boolean(r.detail), (el) =>
        el.child(
          div2()
            .pl(24)
            .min_w(0)
            .truncate()
            .text_size(TEXT.xs)
            .text_color(r.status === "blocked" ? t.blocked : t.muted)
            .tooltip(r.detail)
            .child(r.detail),
        ),
      )
      .when(Boolean(reading), (el) => {
        const { tokens, model, effort } = reading;
        const runsOn = [shortModel(model), effort ? `${effort} effort` : ""].filter(Boolean);
        return el.child(
          h_flex2()
            .pl(24)
            .gap(5)
            .min_w(0)
            .text_size(TEXT.xs)
            .text_color(t.muted)
            .child(div2().flex_none().child("Context"))
            .child(
              div2()
                .flex_none()
                .font_family(MONO)
                .text_color(t.foreground)
                .child(compactNumber(tokens)),
            )
            .when(runsOn.length > 0, (e) =>
              e.child(
                div2()
                  .flex_1()
                  .min_w(0)
                  .truncate()
                  .tooltip(runsOn.join(" · "))
                  .child(`· ${runsOn.join(" · ")}`),
              ),
            ),
        );
      })
      .when(hovered && r.native, (el) =>
        el.child(
          // Over the title line's right edge (left of the status mark), so nothing shifts on hover.
          h_flex2()
            .absolute()
            .right(28)
            .top(4)
            .rounded(RADIUS.md)
            .bg(r.focused ? t.selected : t.hover)
            .child(
              button(`pin-${r.address}`, {
                icon: r.pinned ? "pin-off" : "pin",
                tooltip: r.pinned ? "Unpin" : "Pin to the top",
                size: "icon-xs",
                onClick: (_e, cx) => {
                  cx.stop_propagation();
                  run2("terminal.pin", { terminal: r.address, pinned: !r.pinned });
                  this.hovered = null;
                  cx.notify();
                },
              }),
            ),
        ),
      );
  }
  groupHeader(t, g) {
    return groupLabel(`group-${g.id}`, g.label, {
      count: g.count,
      open: !this.folded.has(g.id),
      tone: g.tone ? t[g.tone] : void 0,
      onToggle: (cx) => this.fold(g.id, cx),
    }).mt(4);
  }
  /** A line per machine still being read (spinner) or unreachable, so it isn't silently empty. */
  machineNotes_(t) {
    const { loading, away } = this.machineNotes();
    const line = (key, mark, text) =>
      h_flex2()
        .id(`note-${key}`)
        .flex_none()
        .px(8)
        .py(4)
        .gap(8)
        .items_center()
        .text_size(TEXT.xs)
        .text_color(t.muted)
        .child(mark ?? div2().w(ICON.sm).flex_none())
        .child(div2().flex_1().min_w(0).truncate().child(text));
    return [
      ...loading.map((m) => line(`l-${m}`, statusMark("working"), `Reading ${m}…`)),
      ...away.map((m) => line(`a-${m}`, null, `${m} is unreachable; showing what was last seen`)),
    ];
  }
  compact(t, rows) {
    return v_flex2()
      .size_full()
      .bg(t.chrome)
      .child(div2().px(4).child(separator()))
      .child(
        v_flex2()
          .p(4)
          .gap(2)
          .children(
            rows
              .filter((r) => r.depth === 0)
              .map((r) =>
                h_flex2()
                  .id(`ag-${r.address}`)
                  .h(32)
                  .flex_none()
                  .justify_center()
                  .items_center()
                  .gap(4)
                  .rounded(RADIUS.md)
                  .cursor_pointer()
                  .when(r.focused, (el) => el.bg(t.selected))
                  .when(!r.focused, (el) => el.hover((s) => s.bg(t.hover)))
                  .on_click(() => this.focus(r))
                  .tooltip(`${r.title} · ${r.status}`)
                  .child(agentIcon(r.program, ICON.md, t.foreground))
                  .child(statusMark(r.status, true)),
              ),
          ),
      );
  }
  /** An agent you can see: focused, or in the shown tab. */
  seen(spaceList, paneList) {
    const tab = spaceList.find((s) => s.active)?.tabs.find((t) => t.active)?.id;
    const shown = new Set(paneList.filter((p) => p.tab === tab).map((p) => p.pane));
    return (r) => r.focused || (r.pane !== null && shown.has(r.pane));
  }
  /**
   * The agents list as drawn, and every agent regardless of the search (what the Spaces rows,
   * the finished marks and the notifications go by). Agents that just finished unseen show as done.
   */
  models(input) {
    const seen = this.seen(input.spaces, input.panes);
    const build = (finished) => {
      const model = buildModel({ ...input, finished });
      const full = input.query ? buildModel({ ...input, finished, query: "" }) : model;
      return { model, full };
    };
    let built = build(this.finished);
    const next = trackFinished(built.full.all, this.lastStatus, this.finished, seen);
    if (next.size !== this.finished.size || [...next].some((a) => !this.finished.has(a))) {
      this.finished = next;
      built = build(next);
    }
    return built;
  }
  /** Tells mc-spaces how many agents in each space work, wait for you or finished. */
  publishSpaces(rows, spaceList) {
    const places = spaceList.map((s) => ({
      id: s.id,
      machine: s.machine ?? null,
      folders: spaceFolders(s),
    }));
    publishSpaceAgents(countBySpace(rows, places));
  }
  render() {
    const t = theme2();
    const open = this.open();
    const mode = this.mode();
    const spaceList = spaces3();
    const paneList = panes3();
    this.drawnKey = this.liveKey(paneList);
    const { model, full } = this.models({
      agents: agents(),
      terminals: terminals(),
      spaces: spaceList,
      panes: paneList,
      mode,
      query: this.search.value(),
      folded: this.folded,
      jobs: this.jobs,
    });
    this.alert(full.all);
    this.publishSpaces(full.all, spaceList);
    const order = model.order.join("\n");
    if (order !== this.orderKey) {
      this.orderKey = order;
      setAgentOrder(model.order);
    }
    const rows = model.groups.flatMap((g) => g.rows);
    this.rows = rows;
    this.track(rows.filter((r) => r.depth === 0));
    if (narrow()) return this.compact(t, rows);
    this.urgent = full.needsYou;
    this.navRows = full.groups.flatMap((g) => g.rows);
    const urgent2 = full.needsYou.length;
    const needsYou = badge(`${urgent2} need${urgent2 === 1 ? "s" : ""} you`, {
      id: "needs-you",
      variant: "destructive",
      tooltip:
        urgent2 === 1 ? "Show the agent waiting for you" : "Show the next agent waiting for you",
      onClick: (_e, cx) => {
        cx.stop_propagation();
        this.nextNeedingYou();
      },
    });
    const toggle = (m, iconName, label) =>
      button(`mode-${m}`, {
        icon: iconName,
        tooltip: label,
        size: "icon-xs",
        active: mode === m,
        onClick: () => setShared3("mc.agents.mode", m),
      });
    return v_flex2()
      .id("root")
      .size_full()
      .min_h(0)
      .bg(t.chrome)
      .text_size(TEXT.sm)
      .on_size_change((size) => {
        const h = Math.round(size.height);
        if (shared3(KEYS.agentsHeight) !== h) setShared3(KEYS.agentsHeight, h);
      })
      .child(div2().px(8).child(separator()))
      .child(
        div2()
          .flex_none()
          .px(8)
          .child(
            groupLabel("agents-header", "Agents", {
              count: model.total,
              open,
              onToggle: () => setShared3(KEYS.agentsFolded, open),
              trailing: [
                ...(urgent2 ? [needsYou] : []),
                ...(open
                  ? [
                      toggle("priority", "clock", "Sort by priority"),
                      toggle("spaces", "layers", "Group by space"),
                    ]
                  : []),
              ],
            }),
          ),
      )
      .when(open, (el) =>
        el
          .child(
            h_flex2().flex_none().h(40).px(8).pb(8).child(searchBox("agent-search", this.search)),
          )
          .child(
            v_flex2()
              .id("agent-list")
              .flex_1()
              .min_h(0)
              .px(8)
              .pb(8)
              .gap(2)
              .overflow_y_scrollbar()
              .children(this.machineNotes_(t))
              .when(model.total === 0, (e) =>
                e.child(
                  div2()
                    .px(8)
                    .py(6)
                    .text_size(TEXT.xs)
                    .text_color(t.muted)
                    .child(
                      "No agents running. Agents show up here, from every machine, once they report their status.",
                    ),
                ),
              )
              .children(
                model.groups.flatMap((g) => [
                  this.groupHeader(t, g),
                  ...g.rows.map((r) => this.row(t, r)),
                ]),
              ),
          ),
      );
  }
};
export { Agents as default };
