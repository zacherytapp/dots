// Generated from src/mods/mc-pulls/main.ts and its imports by `pnpm build:herdr`. Edit the sources, not this file.
// .config/herdr-app/src/mods/mc-pulls/main.ts
import { div as div4 } from "gpui-kit";
import { h_flex as h_flex4, v_flex as v_flex4 } from "gpui-base";

// .config/herdr-app/src/shared/board.ts
import { div as div3 } from "gpui-kit";
import { h_flex as h_flex3, v_flex as v_flex3 } from "gpui-base";
import { knownAgents as knownAgents2 } from "herdr";

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
function duration(ms) {
  const m = Math.floor(Math.max(0, ms) / 6e4);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 60 ? `${d}d` : `${Math.floor(d / 30)}mo`;
}
function ago(when, now = Date.now()) {
  const t = typeof when === "string" ? Date.parse(when) : (when ?? NaN);
  if (!Number.isFinite(t)) return "";
  const ms = now - t;
  if (ms < 6e4) return "just now";
  return `${duration(ms)} ago`;
}
function matches(query, ...hay) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = hay.filter(Boolean).join(" ").toLowerCase();
  return words.every((w) => text.includes(w));
}
function parseJson(text, fallback) {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, worker));
  return out;
}

// .config/herdr-app/src/shared/config.ts
var CONFIG_FILE = "mission-control.json";
var DEFAULTS = {
  agent: { argv: ["claude"], resume: ["claude", "--resume"] },
  issueActions: [
    { label: "Review issue", skill: "review-issue" },
    { label: "Implement", skill: "implement" },
    { label: "Review code", skill: "review-code" },
  ],
  agents: {
    claude: { argv: ["claude"], skill: "/{skill}" },
    opencode: { argv: ["opencode"], skill: "/{skill}" },
    pi: { argv: ["pi"], skill: "/skill:{skill}" },
  },
  github: { closedDays: 14, limit: 50 },
  forgejo: {
    url: "",
    sshHosts: [],
    tokenEnv: "FORGEJO_TOKEN",
    tokenCommand: null,
    closedDays: 14,
    limit: 50,
  },
  jira: {
    site: "",
    auth: "basic",
    email: "",
    tokenEnv: "JIRA_API_TOKEN",
    tokenCommand: null,
    jql: "assignee = currentUser() AND (statusCategory != Done OR resolved >= -14d) ORDER BY updated DESC",
    projects: {},
    limit: 50,
  },
  sessions: { days: 30, limit: 80 },
};
var cache = null;
function configPath() {
  return `${appHome()}/${CONFIG_FILE}`;
}
async function loadConfig() {
  if (cache && Date.now() - cache.at < 1e4) return cache.config;
  const raw = parseJson(await readTextFile(configPath()).catch(() => null), {});
  const config = Object.fromEntries(
    Object.entries(DEFAULTS).map(([k, v]) => {
      const mine = raw[k];
      if (Array.isArray(v)) return [k, Array.isArray(mine) ? mine : v];
      return [k, { ...v, ...(mine ?? {}) }];
    }),
  );
  cache = { at: Date.now(), config };
  return config;
}
var secrets = /* @__PURE__ */ new Map();
var missing = /* @__PURE__ */ new Map();
var MISS_MS = 5 * 6e4;
var ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
function tokenPath(service) {
  return `${appHome()}/mission-control/${service}.token`;
}
async function loginEnv(name) {
  if (!ENV_NAME.test(name)) return "";
  const shell = (await exec("printenv", ["SHELL"]).catch(() => null))?.stdout.trim() || "/bin/sh";
  const r = await exec(shell, ["-lic", `printf "\\036%s\\036" "$${name}"`]).catch(() => null);
  return /\x1e([^\x1e]*)\x1e/.exec(r?.stdout ?? "")?.[1].trim() ?? "";
}
async function readSecret(spec, service) {
  const known = secrets.get(service);
  if (known !== void 0) return known;
  if (Date.now() - (missing.get(service) ?? 0) < MISS_MS) return "";
  let value = "";
  if (spec.tokenCommand?.length) {
    const [cmd, ...args] = spec.tokenCommand;
    const r = await exec(cmd, args).catch(() => null);
    if (r?.code === 0) value = r.stdout.trim();
  }
  if (!value && spec.tokenEnv) {
    const r = await exec("printenv", [spec.tokenEnv]).catch(() => null);
    value = (r?.code === 0 ? r.stdout.trim() : "") || (await loginEnv(spec.tokenEnv));
  }
  if (!value) value = ((await readTextFile(tokenPath(service)).catch(() => null)) ?? "").trim();
  if (value) secrets.set(service, value);
  else missing.set(service, Date.now());
  return value;
}
function forgetSecret(service) {
  secrets.delete(service);
  missing.delete(service);
}
async function saveToken(service, token) {
  const path = tokenPath(service);
  const dir = path.slice(0, path.lastIndexOf("/"));
  const made = await exec("mkdir", ["-p", "-m", "700", dir]);
  if (made.code !== 0) throw new Error(made.stderr || `Couldn't make ${dir}`);
  await exec("chmod", ["700", dir]);
  const now = await readTextFile(path).catch(() => null);
  await writeTextFile(
    path,
    `${token.trim()}
`,
    now,
  );
  await exec("chmod", ["600", path]);
  forgetSecret(service);
}
function editConfigArgs() {
  return { name: "mission-control.json", argv: ["nvim", configPath()] };
}

// .config/herdr-app/src/shared/issue-actions.ts
function agentKeyOf(program) {
  if (!program) return null;
  const k = program.toLowerCase();
  if (k.startsWith("claude")) return "claude";
  if (k.startsWith("opencode")) return "opencode";
  if (k === "pi" || k.startsWith("pi-")) return "pi";
  return k;
}
function runsInBackground(argv) {
  return agentKeyOf(argv[0]?.split("/").pop()) === "claude";
}
function backgroundArgv(argv, name, task) {
  return [...argv, "--bg", "-n", name, task];
}
function backgroundId(stdout) {
  return /^backgrounded\W+([0-9a-f]{6,})\b/m.exec(stdout)?.[1] ?? null;
}
function hasBackgroundSession(stdout, name) {
  const start = stdout.search(/^\[/m);
  if (start < 0) return false;
  try {
    const list = JSON.parse(stdout.slice(start));
    return list.some((s) => s.kind === "background" && s.name === name);
  } catch {
    return false;
  }
}

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

// .config/herdr-app/src/shared/repo.ts
import { exec as exec2, panes, spaces } from "herdr";

// .config/herdr-app/src/shared/remote.ts
function parseRemote(url) {
  const raw = (url ?? "").trim();
  if (!raw) return null;
  let host = "";
  let port = null;
  let path = "";
  const scp = /^(?:[\w.-]+@)?([\w.-]+):(?!\/\/)(.+)$/.exec(raw);
  if (scp && !/^[a-z][\w+.-]*:\/\//i.test(raw)) {
    host = scp[1];
    path = scp[2];
  } else {
    const u = /^[a-z][\w+.-]*:\/\/(?:[^@/]*@)?([^:/?#]+)(?::(\d+))?(\/[^?#]*)?/i.exec(raw);
    if (!u) return null;
    host = u[1];
    port = u[2] ?? null;
    path = u[3] ?? "";
  }
  const parts = path
    .replace(/\.git\/?$/, "")
    .split("/")
    .filter(Boolean);
  if (parts.length < 2 || !host) return null;
  const owner = parts[parts.length - 2];
  const name = parts[parts.length - 1];
  return { host: host.toLowerCase(), port, owner, name, slug: `${owner}/${name}` };
}
function onHost(remote, ...hosts) {
  if (!remote) return false;
  return hosts.some((h) => Boolean(h) && hostOf(h) === remote.host);
}
function hostOf(urlOrHost) {
  return urlOrHost
    .trim()
    .toLowerCase()
    .replace(/^[a-z][\w+.-]*:\/\//, "")
    .replace(/^[^@/]*@/, "")
    .split(/[/?#]/)[0]
    .replace(/:\d+$/, "");
}

// .config/herdr-app/src/shared/repo.ts
var TTL = 5 * 6e4;
var cache2 = /* @__PURE__ */ new Map();
function spaceFolder(space) {
  const tabs2 = new Set(space.tabs.map((t) => t.id));
  return panes().find((p) => tabs2.has(p.tab) && p.cwd)?.cwd || space.folder || "";
}
function activeSpace() {
  return spaces().find((s) => s.active) ?? null;
}
function repoOf(space) {
  return repoAt(space.machine ?? null, spaceFolder(space));
}
function repoAt(machine, cwd) {
  const key = JSON.stringify([machine, cwd]);
  const hit = cache2.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const value = ask(machine, cwd);
  cache2.set(key, { at: Date.now(), value });
  value.catch(() => cache2.delete(key));
  return value;
}
var SEP = "";
async function ask(machine, cwd) {
  const none = { machine, cwd, root: null, remotes: [] };
  if (!cwd) return none;
  const r = await exec2(
    "sh",
    ["-c", `git rev-parse --show-toplevel && printf '${SEP}\\n' && git remote -v`],
    { cwd, on: machine ?? void 0 },
  );
  const cut = r.stdout.indexOf(SEP);
  if (r.code !== 0 || cut < 0) return none;
  const urls = /* @__PURE__ */ new Map();
  for (const line of r.stdout.slice(cut + 1).split("\n")) {
    const [name, url] = line.split(/\s+/);
    if (name && url && !urls.has(name)) urls.set(name, url);
  }
  const names = [...urls.keys()].sort((a, b) => (a === "origin" ? -1 : b === "origin" ? 1 : 0));
  const remotes = names
    .map((n) => {
      const r2 = parseRemote(urls.get(n));
      return r2 ? { ...r2, remoteName: n } : null;
    })
    .filter((r2) => r2 !== null);
  return { machine, cwd, root: r.stdout.slice(0, cut).trim(), remotes };
}
async function spacesForSlug(slug) {
  const want = slug.toLowerCase();
  const all = spaces();
  const repos = await Promise.all(all.map((space) => repoOf(space).catch(() => null)));
  return all.filter((_, i) => repos[i]?.remotes.some((r) => r.slug.toLowerCase() === want));
}

// .config/herdr-app/src/shared/launch.ts
var pending = /* @__PURE__ */ new Set();
function isPending(name) {
  return pending.has(name);
}
function trackPending(name, cx, task) {
  if (pending.has(name)) return;
  pending.add(name);
  cx.notify();
  cx.spawn(async (cx2) => {
    try {
      await task();
    } catch (e) {
      notify({
        title: `Couldn't start ${name}`,
        body: String(e?.message ?? e).slice(-300),
        level: "error",
      });
    } finally {
      pending.delete(name);
      cx2.notify();
    }
  });
}
function findTab(name) {
  for (const space of spaces2()) {
    const tab = space.tabs.find((t) => t.named && t.name === name);
    if (tab) return { space, tab: tab.id };
  }
  return null;
}
function namedTabs() {
  return new Set(spaces2().flatMap((s) => s.tabs.filter((t) => t.named).map((t) => t.name)));
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
async function startWork(work) {
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
function alreadyRunning(name) {
  notify({
    title: "Already started",
    body: `${name}: open it from Agents, or remove it in \`claude agents\` to start again.`,
    level: "info",
    timeout: 5e3,
  });
}
function inLoginShell(argv, cwd, machine) {
  const script = `exec "\${SHELL:-/bin/sh}" -lic 'exec "$@" 2>&3' "$0" "$@" 3>&2 2>/dev/null </dev/null`;
  return exec3("sh", ["-c", script, "sh", ...argv], {
    ...(cwd ? { cwd } : {}),
    on: machine ?? void 0,
  });
}
async function startInBackground(space, argv, work) {
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
      timeout: 4e3,
    });
  } catch (e) {
    notify({
      title: `Couldn't start ${work.name}`,
      body: String(e?.message ?? e).slice(-300),
      level: "error",
    });
  }
}
async function openUrl(url) {
  try {
    const r = await exec3("xdg-open", [url]);
    if (r.code !== 0) throw new Error(r.stderr || `xdg-open exited ${r.code}`);
  } catch (e) {
    notify({
      title: "Couldn't open link",
      body: String(e?.message ?? e).slice(0, 200),
      level: "error",
    });
  }
}
async function copyText(text) {
  const tries = [
    ["wl-copy", [text]],
    ["sh", ["-c", 'printf %s "$1" | xclip -selection clipboard', "sh", text]],
  ];
  for (const [cmd, args] of tries) {
    try {
      if ((await exec3(cmd, args)).code === 0) {
        notify({ title: "Copied", body: text.slice(0, 120), level: "success", timeout: 2e3 });
        return;
      }
    } catch {}
  }
  notify({ title: "Couldn't copy", body: "Neither wl-copy nor xclip worked.", level: "error" });
}

// .config/herdr-app/src/shared/list-view.ts
import { div as div2, View } from "gpui-kit";
import { h_flex as h_flex2, v_flex as v_flex2, InputState } from "gpui-base";
import {
  layout,
  run as run2,
  setShared as setShared2,
  shared as shared2,
  theme as theme2,
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
  const dir = `${appHome2()}/mods/mc-pulls/icons`;
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
  return `mods/mc-pulls/icons/${name}.svg`;
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
function skeleton(w, h) {
  const t = theme();
  const el = div().h(h).flex_none().rounded(RADIUS.md).bg(t.selected);
  return w === null ? el.w_full() : el.w(w);
}
function tabsList(children) {
  const t = theme();
  return h_flex()
    .h(32)
    .p(3)
    .gap(2)
    .flex_none()
    .items_center()
    .rounded(RADIUS.lg)
    .bg(t.hover)
    .children(children);
}
function tabsTrigger(id, o) {
  const t = theme();
  return h_flex()
    .id(id)
    .h_full()
    .px(8)
    .gap(6)
    .flex_none()
    .items_center()
    .justify_center()
    .rounded(RADIUS.md)
    .border(1)
    .text_size(TEXT.sm)
    .font_medium()
    .cursor_pointer()
    .when(o.active, (el) =>
      el.bg(t.selected).border_color(t.input).text_color(t.foreground).shadow_sm(),
    )
    .when(!o.active, (el) =>
      el
        .border_color(TRANSPARENT)
        .text_color(t.muted)
        .hover((s) => s.text_color(t.foreground)),
    )
    .on_mouse_down("left", stopPress)
    .on_click((_e, cx) => o.onClick(cx))
    .when(Boolean(o.tooltip), (el) => el.tooltip(o.tooltip))
    .when(Boolean(o.icon), (el) => el.child(icon(o.icon, ICON.sm)))
    .child(o.label)
    .when(o.count !== void 0, (el) =>
      el.child(
        div()
          .font_family(MONO)
          .text_size(TEXT.xs)
          .text_color(o.active ? t.muted : t.dim)
          .child(String(o.count)),
      ),
    );
}
function tabs(id, options, value, onChange) {
  return tabsList(
    options.map((o) =>
      tabsTrigger(`${id}-${o.value}`, {
        label: o.label,
        icon: o.icon,
        count: o.count,
        active: o.value === value,
        onClick: (cx) => onChange(o.value, cx),
      }),
    ),
  );
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
function card() {
  const t = theme();
  return v_flex()
    .p(12)
    .gap(8)
    .rounded(RADIUS.lg)
    .border(1)
    .border_color(t.border)
    .bg(t.surface)
    .shadow_xs();
}
function alert(body, o = {}) {
  const t = theme();
  const bad = o.variant === "destructive";
  const color = bad ? t.blocked : t.foreground;
  return h_flex()
    .items_start()
    .gap(10)
    .px(12)
    .py(10)
    .rounded(RADIUS.lg)
    .border(1)
    .border_color(bad ? alpha(t.blocked, "59") : t.border)
    .bg(t.surface)
    .text_size(TEXT.sm)
    .child(
      div()
        .pt(2)
        .child(icon(o.icon ?? (bad ? "circle-alert" : "info"), ICON.md, color)),
    )
    .child(
      v_flex()
        .flex_1()
        .min_w(0)
        .gap(2)
        .when(Boolean(o.title), (el) =>
          el.child(div().font_medium().text_color(color).child(o.title)),
        )
        .child(
          div()
            .text_color(bad ? alpha(t.blocked, "e6") : t.muted)
            .child(body),
        ),
    );
}
function emptyState(title, body, actions = [], iconName) {
  const t = theme();
  return v_flex()
    .flex_1()
    .min_h(0)
    .items_center()
    .justify_center()
    .gap(8)
    .p(24)
    .when(Boolean(iconName), (el) =>
      el.child(
        div()
          .size(36)
          .mb(4)
          .flex()
          .items_center()
          .justify_center()
          .rounded(RADIUS.md)
          .bg(t.selected)
          .child(icon(iconName, ICON.md + 2, t.foreground)),
      ),
    )
    .child(div().text_size(TEXT.md).font_medium().text_color(t.foreground).child(title))
    .when(Boolean(body), (el) =>
      el.child(div().max_w(420).text_size(TEXT.sm).text_color(t.muted).text_center().child(body)),
    )
    .when(actions.length > 0, (el) => el.child(h_flex().pt(8).gap(8).children(actions)));
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

// .config/herdr-app/src/shared/list-view.ts
var FRESH_MS = 3e4;
var SCOPES = [
  { value: "space", label: "This space" },
  { value: "all", label: "All spaces" },
];
var ListView = class extends View {
  // ---- for subclasses -------------------------------------------------------------------
  /** The source id (`issues`, `pulls`, ...): names the shared scope key. */
  source() {
    return "list";
  }
  placeholder() {
    return "Search";
  }
  /** Noun for the footer count: "issues", "pull requests". */
  noun() {
    return "items";
  }
  /** How often to look again on its own, ms. */
  interval() {
    return 5 * 6e4;
  }
  async fetch(_scope, _space) {
    return { items: [] };
  }
  /** Drawn between the toolbar and the body (filter chips). */
  subbar(_t, _items) {
    return null;
  }
  body(_t, _items, _cx) {
    return div2();
  }
  /** Rows matching the search. */
  visible(items, _query) {
    return items;
  }
  /** Extra toolbar buttons before refresh. */
  tools(_t) {
    return [];
  }
  hasSettings() {
    return true;
  }
  // ---- shared behavior ------------------------------------------------------------------
  init(_props, cx) {
    this.snap = { items: [], caption: "", note: "", setup: null, token: null, warning: "", at: 0 };
    this.cache = /* @__PURE__ */ new Map();
    this.loading = false;
    this.busy = false;
    this.error = null;
    this.width = 0;
    this.seq = 0;
    this.loadedKey = "";
    this.search = InputState.new({ placeholder: this.placeholder() });
    this.search.on("change", (_e, cx2) => cx2.notify());
    this.saving = false;
    this.tokenInput = InputState.new({ placeholder: "Paste an access token" });
    this.tokenInput.set_masked(true);
    this.tokenInput.on("submit", (_e, cx2) => this.saveToken(cx2));
    this.tried = 0;
    this.memo = null;
    cx.timer.every(Math.min(this.interval(), 6e4), (cx2) => {
      if (this.shown() && this.due()) this.reload(cx2, true);
    });
  }
  /**
   * Whether this copy is on screen: the panel is open and its stack shows this source. Copies stay
   * alive while hidden (another source, panel closed), so they skip loading and drawing then.
   * True when it isn't in the panel at all.
   */
  shown() {
    const root = layout();
    const body = findNode(root, NODES.body);
    if (!body?.children?.some((c) => c.id === this.source())) return true;
    return !findNode(root, NODES.panel)?.hidden && body.active === this.source();
  }
  /** Time to look again: never loaded, or `interval()` since the last try. */
  due() {
    return !this.busy && Date.now() - this.tried >= this.interval();
  }
  /** Saves the pasted token for the service the panel asked about, then loads again. */
  saveToken(cx) {
    const ask2 = this.snap.token;
    const token = this.tokenInput.value().trim();
    if (!ask2 || !token || this.saving) return;
    this.saving = true;
    cx.notify();
    cx.spawn(async (cx2) => {
      try {
        await saveToken(ask2.service, token);
        this.tokenInput.set_value("");
        this.cache.clear();
        this.reload(cx2);
      } catch (e) {
        this.error = `Couldn't save the token: ${String(e?.message ?? e)}`;
      } finally {
        this.saving = false;
        cx2.notify();
      }
    });
  }
  tokenForm(t, ask2, compact) {
    const buttons = h_flex2()
      .gap(8)
      .child(
        button("token-save", {
          label: this.saving ? "Saving…" : "Save token",
          variant: "default",
          size: "sm",
          onClick: (_e, cx) => this.saveToken(cx),
        }),
      )
      .when(Boolean(ask2.createUrl), (el) =>
        el.child(
          button("token-create", {
            label: "Create a token",
            variant: "outline",
            size: "sm",
            onClick: () => void openUrl(ask2.createUrl),
          }),
        ),
      );
    const field = h_flex2().w_full().max_w(420).child(searchBox("token-input", this.tokenInput));
    if (compact) {
      return card()
        .flex_none()
        .mx(12)
        .mb(8)
        .child(div2().text_size(TEXT.sm).font_medium().text_color(t.foreground).child(ask2.title))
        .child(div2().text_size(TEXT.xs).text_color(t.muted).child(ask2.body))
        .child(field)
        .child(buttons);
    }
    return emptyState(ask2.title, ask2.body, [
      v_flex2()
        .gap(8)
        .items_center()
        .w_full()
        .max_w(420)
        .child(field)
        .child(buttons)
        .when(Boolean(this.error), (el) =>
          el.child(
            h_flex2()
              .w_full()
              .child(alert(this.error, { variant: "destructive" })),
          ),
        )
        .child(
          div2()
            .text_size(TEXT.xs)
            .text_color(t.muted)
            .text_center()
            .child(
              "Saved in ~/.config/herdr-app/mission-control/, readable only by you and never in the dots repo.",
            ),
        ),
    ]);
  }
  /** Placeholder cards while the first load runs. */
  skeletons() {
    return v_flex2()
      .flex_1()
      .min_h(0)
      .p(12)
      .gap(8)
      .children(
        [0, 1, 2].map(() =>
          card()
            .flex_none()
            .child(skeleton(120, 12))
            .child(skeleton(null, 14))
            .child(skeleton(180, 12)),
        ),
      );
  }
  scope() {
    return shared2(KEYS.scope(this.source())) === "all" ? "all" : "space";
  }
  key() {
    return this.scope() === "all" ? "all" : `space:${activeSpace()?.id ?? ""}`;
  }
  setScope(scope, cx) {
    setShared2(KEYS.scope(this.source()), scope);
    this.switchTo(cx, this.key());
    cx.notify();
  }
  /** Loads again now and redraws (from a handler or a task, never from render). */
  reload(cx, quiet = false) {
    this.load(cx, quiet);
    cx.notify();
  }
  /**
   * Shows another scope (a space switch, This space / All spaces): what it had last time at once,
   * then asks again unless that was moments ago. No redraw, so render may call it.
   */
  switchTo(cx, key) {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < FRESH_MS) {
      this.seq++;
      this.snap = hit;
      this.loadedKey = key;
      this.tried = hit.at;
      this.error = null;
      this.loading = this.busy = false;
      return;
    }
    this.load(cx, Boolean(hit), key);
  }
  /** Starts a load without asking for a redraw, so render may call it: render draws the result. */
  load(cx, quiet = false, key = this.key()) {
    const seq = ++this.seq;
    this.tried = Date.now();
    if (key !== this.loadedKey) {
      this.snap = this.cache.get(key) ?? {
        items: [],
        caption: "",
        note: "",
        setup: null,
        token: null,
        warning: "",
        at: 0,
      };
      this.error = null;
    }
    this.loadedKey = key;
    this.loading = !quiet;
    this.busy = true;
    cx.spawn(async (cx2) => {
      try {
        const r = await this.fetch(this.scope(), activeSpace());
        if (seq !== this.seq) return;
        this.snap = {
          items: r.items ?? [],
          caption: r.caption ?? "",
          note: r.note ?? "",
          setup: r.setup ?? null,
          token: r.token ?? null,
          warning: r.warning ?? "",
          at: Date.now(),
        };
        this.cache.set(key, this.snap);
        this.error = null;
      } catch (e) {
        if (seq !== this.seq) return;
        this.error =
          String(e?.message ?? e)
            .trim()
            .slice(0, 400) || "Couldn't load.";
      } finally {
        if (seq === this.seq) {
          this.loading = false;
          this.busy = false;
          cx2.notify();
        }
      }
    });
  }
  toolbar(t) {
    const narrow = this.width > 0 && this.width < 460;
    const scope = tabs("scope", SCOPES, this.scope(), (s, cx) => this.setScope(s, cx));
    const buttons = h_flex2()
      .flex_none()
      .gap(2)
      .items_center()
      .children(this.tools(t))
      .child(
        button("refresh", {
          icon: "refresh-cw",
          tooltip: this.busy ? "Loading…" : "Refresh",
          size: "icon-sm",
          active: this.busy,
          spin: this.busy,
          onClick: (_e, cx) => this.reload(cx),
        }),
      )
      .when(this.hasSettings(), (el) =>
        el.child(
          button("settings", {
            icon: "settings",
            tooltip: "Edit mission-control.json",
            size: "icon-sm",
            onClick: () => run2("tab.new", editConfigArgs()),
          }),
        ),
      );
    const search = searchBox("search", this.search);
    const bar = narrow
      ? v_flex2()
          .flex_none()
          .px(12)
          .py(8)
          .gap(8)
          .child(h_flex2().items_center().gap(8).child(scope).child(div2().flex_1()).child(buttons))
          .child(h_flex2().child(search))
      : h_flex2()
          .flex_none()
          .px(12)
          .py(8)
          .gap(8)
          .items_center()
          .child(scope)
          .child(search)
          .child(buttons);
    return v_flex2().flex_none().child(bar).child(separator());
  }
  footer(t, shown) {
    const total = this.snap.items.length;
    const explained =
      total === 0 && Boolean(this.snap.setup || this.snap.token || this.snap.note || this.error);
    const count = explained
      ? ""
      : shown === total
        ? `${total} ${this.noun()}`
        : `${shown} of ${total} ${this.noun()}`;
    const when = this.loading
      ? "Loading…"
      : this.busy
        ? "Refreshing…"
        : this.snap.at
          ? `Updated ${ago(this.snap.at)}`
          : "";
    return h_flex2()
      .flex_none()
      .h(32)
      .px(12)
      .gap(8)
      .items_center()
      .border_t(1)
      .border_color(t.border)
      .text_size(TEXT.xs)
      .text_color(t.muted)
      .child(div2().flex_none().child([count, when].filter(Boolean).join(" · ")))
      .when(Boolean(this.error && total > 0) || Boolean(this.snap.warning), (el) => {
        const text = (this.error && total > 0 ? this.error : "") || this.snap.warning;
        return el.child(div2().min_w(0).truncate().text_color(t.blocked).tooltip(text).child(text));
      })
      .child(div2().flex_1())
      .when(Boolean(this.snap.caption), (el) =>
        el.child(div2().min_w(0).truncate().child(this.snap.caption)),
      );
  }
  /** `visible()` for the current rows and query, worked out again only when either changed. */
  shownItems() {
    const query = this.search.value();
    const m = this.memo;
    if (m && m.items === this.snap.items && m.query === query) return m.shown;
    const shown = this.visible(this.snap.items, query);
    this.memo = { items: this.snap.items, query, shown };
    return shown;
  }
  render(cx) {
    const t = theme2();
    const root = v_flex2()
      .id("root")
      .size_full()
      .min_h(0)
      .bg(t.background)
      .text_size(TEXT.sm)
      .text_color(t.foreground)
      .on_size_change((size, cx2) => {
        if (Math.abs(size.width - this.width) >= 1) {
          this.width = size.width;
          cx2.notify();
        }
      });
    if (!this.shown()) return root;
    const key = this.key();
    if (key !== this.loadedKey) this.switchTo(cx, key);
    else if (this.due()) this.load(cx, true, key);
    const items = this.shownItems();
    let content;
    if (this.snap.setup) {
      content = emptyState(this.snap.setup.title, this.snap.setup.body, [
        button("setup", {
          label: "Edit mission-control.json",
          variant: "default",
          size: "sm",
          onClick: () => run2("tab.new", editConfigArgs()),
        }),
      ]);
    } else if (this.snap.token && !this.snap.items.length) {
      content = this.tokenForm(t, this.snap.token, false);
    } else if (this.error && !this.snap.items.length) {
      content = emptyState("Couldn't load", this.error, [
        button("retry", {
          label: "Try again",
          variant: "outline",
          size: "sm",
          onClick: (_e, cx2) => this.reload(cx2),
        }),
      ]);
    } else if (!this.snap.items.length) {
      content = this.loading
        ? this.skeletons()
        : emptyState(
            this.snap.note || `No ${this.noun()}`,
            "",
            this.scope() === "space"
              ? [
                  button("all", {
                    label: "Show all spaces",
                    variant: "outline",
                    size: "sm",
                    onClick: (_e, cx2) => this.setScope("all", cx2),
                  }),
                ]
              : [],
          );
    } else {
      content = this.snap.token
        ? v_flex2()
            .flex_1()
            .min_h(0)
            .child(this.tokenForm(t, this.snap.token, true))
            .child(this.body(t, items, cx))
        : this.body(t, items, cx);
    }
    const sub = this.snap.items.length && !this.snap.setup ? this.subbar(t, items) : null;
    return root
      .child(this.toolbar(t))
      .when(Boolean(sub), (el) => el.child(sub))
      .child(v_flex2().flex_1().min_h(0).child(content))
      .child(this.footer(t, items.length));
  }
};

// .config/herdr-app/src/shared/board.ts
var agentProgram = null;
var agentAsked = 0;
function useAgentProgram(cx) {
  if (Date.now() - agentAsked > 6e4) {
    agentAsked = Date.now();
    cx.spawn(async (cx2) => {
      try {
        const [want] = (await loadConfig()).agent.argv;
        const list = await knownAgents2();
        agentProgram =
          list.find((a) => a.run[0] === want || a.key === want) ??
          list.find((a) => a.installed) ??
          null;
        cx2.notify();
      } catch {}
    });
  }
  return agentProgram;
}

// .config/herdr-app/src/shared/forgejo-model.ts
function checksOf(state) {
  if (state === "success") return "passing";
  if (state === "failure" || state === "error") return "failing";
  if (state === "pending" || state === "warning") return "pending";
  return "none";
}
function reviewOf(reviews, requested) {
  const latest = /* @__PURE__ */ new Map();
  for (const r of reviews) {
    if (r.dismissed || r.stale || !r.user) continue;
    if (r.state === "APPROVED" || r.state === "REQUEST_CHANGES") latest.set(r.user.login, r.state);
  }
  const states = [...latest.values()];
  if (states.includes("REQUEST_CHANGES")) return "changes";
  if (states.includes("APPROVED")) return "approved";
  return requested > 0 ? "required" : "none";
}
function forgejoPull(p, slug, viewer, checks, reviews) {
  const author = p.user?.login ?? "ghost";
  const requested = p.requested_reviewers ?? [];
  const asked = requested.some((r) => r.login === viewer);
  const name = slug.split("/").pop() ?? slug;
  return {
    id: `forgejo:${slug}!${p.number}`,
    provider: "forgejo",
    number: p.number,
    slug,
    title: p.title.replace(/^(WIP|Draft):\s*/i, ""),
    url: p.html_url,
    draft: Boolean(p.draft) || /^(WIP|Draft):/i.test(p.title),
    author,
    head: p.head?.ref ?? "",
    base: p.base?.ref ?? "",
    additions: p.additions ?? 0,
    deletions: p.deletions ?? 0,
    updated: Date.parse(p.updated_at),
    checks,
    review: reviewOf(reviews, requested.length),
    comments: (p.comments ?? 0) + (p.review_comments ?? 0),
    unresolved: 0,
    group: asked ? "review" : author === viewer ? "mine" : "other",
    tabName: `${name}#${p.number}`,
  };
}

// .config/herdr-app/src/shared/forgejo.ts
var PARALLEL = 6;
var settled = /* @__PURE__ */ new Map();
var reviewCache = /* @__PURE__ */ new Map();
var viewers = /* @__PURE__ */ new Map();
var TokenError = class extends Error {
  ask;
  constructor(message, ask2) {
    super(message);
    this.ask = ask2;
  }
};
async function forgejo() {
  const config = (await loadConfig()).forgejo;
  if (!config.url.trim()) return null;
  const base = config.url.trim().replace(/\/+$/, "");
  const host = hostOf(base);
  const token = await readSecret(config, "forgejo");
  const ask2 = (refused) => ({
    service: "forgejo",
    title: refused ? "Forgejo refused the token" : `Add a token for ${host}`,
    body: refused
      ? "Paste a new access token. It needs read access to issues and repositories."
      : "Your repositories there are private, so the panel needs an access token with read access to issues and repositories.",
    createUrl: `${base}/user/settings/applications`,
  });
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `token ${token}`;
  return {
    base,
    host,
    token,
    isRemote: (remote) => onHost(remote, base, ...config.sshHosts),
    ask: ask2,
    async get(path) {
      const r = await fetch(`${base}/api/v1${path}`, { headers });
      if (r.status === 401 || r.status === 403) {
        throw new TokenError(`Forgejo answered ${r.status}`, ask2(Boolean(token)));
      }
      if (r.status === 404 && !token) throw new TokenError("Forgejo answered 404", ask2(false));
      if (!r.ok) throw new Error(`Forgejo answered ${r.status} for ${path.split("?")[0]}.`);
      return await r.json();
    },
  };
}
async function forgejoRepoPulls(fj, slug, viewer) {
  const pulls = await fj.get(`/repos/${slug}/pulls?state=open&limit=50`);
  return mapLimit(pulls, PARALLEL, (p) => detail(fj, slug, p, viewer));
}
async function commitStatus(fj, slug, sha) {
  const key = `${fj.base} ${slug}@${sha}`;
  const known = settled.get(key);
  if (known) return known;
  const s = await fj.get(`/repos/${slug}/commits/${sha}/status`).catch(() => null);
  if (s?.state === "success" || s?.state === "failure" || s?.state === "error") {
    settled.set(key, s.state);
  }
  return s?.state;
}
async function pullReviews(fj, slug, p) {
  const key = `${fj.base} ${slug}#${p.number}`;
  const hit = reviewCache.get(key);
  if (hit && hit.updated === p.updated_at) return hit.reviews;
  const reviews = await fj.get(`/repos/${slug}/pulls/${p.number}/reviews`).catch(() => null);
  if (!reviews) return hit?.reviews ?? [];
  reviewCache.set(key, { updated: p.updated_at, reviews });
  return reviews;
}
async function detail(fj, slug, p, viewer) {
  const [state, reviews] = await Promise.all([
    p.head?.sha ? commitStatus(fj, slug, p.head.sha) : void 0,
    pullReviews(fj, slug, p),
  ]);
  return forgejoPull(p, slug, viewer, checksOf(state), reviews);
}
async function forgejoViewer(fj) {
  if (!fj.token) return "";
  const key = `${fj.base} ${fj.token}`;
  const known = viewers.get(key);
  if (known) return known;
  const login = (await fj.get("/user").catch(() => null))?.login ?? "";
  if (login) viewers.set(key, login);
  return login;
}
async function forgejoMyPulls(fj, viewer) {
  const search = "/repos/issues/search?type=pulls&state=open&limit=30";
  const pages = await Promise.all(
    ["created", "assigned", "review_requested", "mentioned"].map((f) =>
      fj.get(`${search}&${f}=true`).catch(() => []),
    ),
  );
  const seen = /* @__PURE__ */ new Map();
  for (const i of pages.flat()) {
    const slug = i.repository?.full_name;
    if (slug) seen.set(`${slug}#${i.number}`, { slug, number: i.number });
  }
  return mapLimit([...seen.values()].slice(0, 30), PARALLEL, async ({ slug, number }) => {
    const p = await fj.get(`/repos/${slug}/pulls/${number}`);
    return detail(fj, slug, p, viewer);
  });
}

// .config/herdr-app/src/shared/github.ts
import { exec as exec5 } from "herdr";

// .config/herdr-app/src/shared/github-model.ts
function rollupChecks(state) {
  if (!state) return "none";
  if (state === "SUCCESS") return "passing";
  if (state === "FAILURE" || state === "ERROR") return "failing";
  return "pending";
}
var repoName = (slug) => slug.split("/").pop() ?? slug;
function checksOf2(p) {
  return rollupChecks(p.commits.nodes[0]?.commit.statusCheckRollup?.state);
}
function reviewOf2(p) {
  if (p.reviewDecision === "APPROVED") return "approved";
  if (p.reviewDecision === "CHANGES_REQUESTED") return "changes";
  if (p.reviewDecision === "REVIEW_REQUIRED") return "required";
  return "none";
}
function pullItem(p, viewer) {
  const slug = p.repository.nameWithOwner;
  const author = p.author?.login ?? "ghost";
  const asked = p.reviewRequests.nodes.some((r) => r.requestedReviewer?.login === viewer);
  return {
    id: `github:${slug}!${p.number}`,
    provider: "github",
    number: p.number,
    slug,
    title: p.title,
    url: p.url,
    draft: p.isDraft,
    author,
    head: p.headRefName,
    base: p.baseRefName,
    additions: p.additions,
    deletions: p.deletions,
    updated: Date.parse(p.updatedAt),
    checks: checksOf2(p),
    review: reviewOf2(p),
    comments: p.comments.totalCount,
    unresolved: p.reviewThreads.nodes.filter((n) => !n.isResolved).length,
    group: asked ? "review" : author === viewer ? "mine" : "other",
    tabName: `${repoName(slug)}#${p.number}`,
  };
}
function pullTask(p, action) {
  const ref = `${p.slug}#${p.number}`;
  const head = `Pull request ${ref}: ${p.title}
${p.url}`;
  const never = "Don't push, comment or post a review without asking.";
  if (p.provider === "forgejo") {
    const fetch2 = `git fetch origin pull/${p.number}/head:pr-${p.number}`;
    if (action === "review") {
      return `${head}
Review it: \`${fetch2}\` and \`git diff ${p.base}...pr-${p.number}\`, then report concrete findings. ${never}`;
    }
    if (action === "comments") {
      return `${head}
Address the open review comments (see the PR page) on branch ${p.head}: make the fixes and summarize what changed. ${never}`;
    }
    return `${head}
The checks on branch ${p.head} are failing: find the failing workflow runs in the repository's Actions page, fix them and summarize. ${never}`;
  }
  if (action === "review") {
    return `${head}
Review it: read it with \`gh pr view ${p.number} -R ${p.slug} --comments\` and \`gh pr diff ${p.number} -R ${p.slug}\`, then report concrete findings. ${never}`;
  }
  if (action === "comments") {
    return `${head}
Address the open review comments: \`gh pr checkout ${p.number} -R ${p.slug}\`, read them with \`gh pr view ${p.number} -R ${p.slug} --comments\`, make the fixes and summarize what changed. ${never}`;
  }
  return `${head}
The checks are failing: \`gh pr checkout ${p.number} -R ${p.slug}\`, find the failures with \`gh pr checks ${p.number} -R ${p.slug}\` and \`gh run view --log-failed\`, fix them and summarize. ${never}`;
}

// .config/herdr-app/src/shared/github.ts
var PULL = `number title url state isDraft updatedAt headRefName baseRefName additions deletions
  repository { nameWithOwner } author { login } reviewDecision comments { totalCount }
  reviewThreads(first: 50) { nodes { isResolved } }
  reviewRequests(first: 10) { nodes { requestedReviewer { ... on User { login } } } }
  commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }`;
async function graphql(query, vars) {
  const args = ["api", "graphql", "-f", `query=${query}`];
  for (const [k, v] of Object.entries(vars))
    args.push(typeof v === "number" ? "-F" : "-f", `${k}=${v}`);
  const r = await exec5("gh", args);
  if (r.code !== 0) {
    if (/auth login|not logged/i.test(r.stderr))
      throw new Error("gh is not signed in: run `gh auth login`.");
    throw new Error(r.stderr.trim() || `gh exited ${r.code}`);
  }
  const body = JSON.parse(r.stdout);
  if (!body.data)
    throw new Error(body.errors?.map((e) => e.message).join("; ") || "GitHub returned nothing.");
  return body.data;
}
async function spaceSlug(space) {
  if (!space) return { slug: null, note: "No space is shown." };
  const repo = await repoOf(space);
  if (!repo.root) return { slug: null, note: `${space.name} isn't in a git repository.` };
  const remote = repo.remotes.find((r) => r.host === "github.com");
  return remote
    ? { slug: remote.slug, note: "" }
    : { slug: null, note: `${space.name} has no GitHub remote.` };
}
async function loadPulls(scope, space) {
  const config = await loadConfig();
  let filter = "involves:@me archived:false";
  let caption = "All spaces · involving you";
  if (scope === "space") {
    const { slug, note } = await spaceSlug(space);
    if (!slug) return { items: [], note, caption: `This space · ${space?.name ?? ""}` };
    filter = `repo:${slug}`;
    caption = `This space · ${slug}`;
  }
  const data = await graphql(
    `query($q: String!, $n: Int!) {
      viewer { login }
      open: search(query: $q, type: ISSUE, first: $n) { nodes { ... on PullRequest { ${PULL} } } }
    }`,
    { q: `${filter} is:pr is:open sort:updated-desc`, n: config.github.limit },
  );
  const nodes = data.open.nodes.filter((n) => n && "number" in n);
  return { items: nodes.map((p) => pullItem(p, data.viewer.login)), caption };
}

// .config/herdr-app/src/mods/mc-pulls/main.ts
var GROUPS = [
  { id: "review", label: "Review requested" },
  { id: "mine", label: "Yours" },
  { id: "other", label: "Others" },
];
var ACTIONS = [
  { id: "review", label: "Review" },
  { id: "comments", label: "Address comments" },
  { id: "checks", label: "Fix checks" },
];
async function forgejoPulls(scope, space) {
  const fj = await forgejo();
  if (!fj) return { items: [] };
  try {
    if (scope === "space") {
      if (!space) return { items: [] };
      const remote = (await repoOf(space)).remotes.find((r) => fj.isRemote(r));
      if (!remote) return { items: [] };
      const items = await forgejoRepoPulls(fj, remote.slug, await forgejoViewer(fj));
      return { items, caption: `This space · ${remote.slug}` };
    }
    if (!fj.token) return { items: [], token: fj.ask(false) };
    return { items: await forgejoMyPulls(fj, await forgejoViewer(fj)) };
  } catch (e) {
    if (e instanceof TokenError) return { items: [], token: e.ask };
    throw e;
  }
}
var Pulls = class extends ListView {
  source() {
    return "pulls";
  }
  noun() {
    return "pull requests";
  }
  placeholder() {
    return "Search pull requests";
  }
  async fetch(scope, space) {
    const [gh, fj] = await Promise.allSettled([
      loadPulls(scope, space),
      forgejoPulls(scope, space),
    ]);
    const ok = (r) => (r.status === "fulfilled" ? r.value : null);
    const why = (r, who) =>
      r.status === "rejected" ? `${who}: ${String(r.reason?.message ?? r.reason)}` : "";
    if (!ok(gh) && !ok(fj)) throw new Error([why(gh, "GitHub"), why(fj, "Forgejo")].join("; "));
    const items = [...(ok(gh)?.items ?? []), ...(ok(fj)?.items ?? [])];
    const caption =
      scope === "all"
        ? "All spaces · involving you"
        : ok(fj)?.caption || ok(gh)?.caption || `This space · ${space?.name ?? ""}`;
    const note =
      scope === "space" && !items.length
        ? `No open pull requests on ${space?.name ?? "this space"}'s GitHub or Forgejo remotes.`
        : "";
    return {
      items,
      caption,
      note,
      token: ok(fj)?.token,
      warning: [why(gh, "GitHub"), why(fj, "Forgejo")].filter(Boolean).join("; "),
    };
  }
  found = null;
  grouped = null;
  visible(items, query) {
    if (this.found?.items === items && this.found.query === query) return this.found.out;
    const out = items
      .filter((p) => matches(query, `#${p.number}`, p.title, p.slug, p.author, p.head))
      .sort((a, b) => b.updated - a.updated);
    this.found = { items, query, out };
    return out;
  }
  /** The non-empty groups, rebuilt only when the rows change. */
  groups(items) {
    if (this.grouped?.items === items) return this.grouped.groups;
    const groups = GROUPS.map((g) => ({
      label: g.label,
      rows: items.filter((p) => p.group === g.id),
    })).filter((g) => g.rows.length);
    this.grouped = { items, groups };
    return groups;
  }
  body(t, items, cx) {
    const program = useAgentProgram(cx);
    const all = this.scope() === "all";
    const tabs2 = namedTabs();
    const background = backgroundSessions();
    return v_flex4()
      .id("pulls")
      .flex_1()
      .min_h(0)
      .px(12)
      .pb(14)
      .gap(6)
      .overflow_y_scrollbar()
      .children(
        this.groups(items).flatMap((g) => [
          groupLabel(`group-${g.label}`, g.label, { count: g.rows.length }),
          ...g.rows.map((p) => this.row(t, p, program, all, tabs2, background)),
        ]),
      );
  }
  row(t, p, program, all, tabs2, background) {
    const tab = tabs2.has(p.tabName);
    const starting = isPending(p.tabName);
    const started = tab || background.has(p.tabName);
    const start = (action, cx) =>
      trackPending(p.tabName, cx, () =>
        startWork({ name: p.tabName, task: pullTask(p, action), repo: p.slug }),
      );
    const shown = tab
      ? `Show the ${p.tabName} tab`
      : `${p.tabName} is running in the background: open it from Agents`;
    const checks = {
      passing: [icon("circle-check", ICON.xs), t.ansi2, "All checks passed"],
      failing: [icon("circle-x", ICON.xs), t.blocked, "Some checks failed"],
      pending: [spinner(ICON.xs), t.working, "Checks are running"],
      none: null,
    }[p.checks];
    const review = {
      approved: ["Approved", t.ansi2],
      changes: ["Changes requested", t.blocked],
      required: ["Review required", t.working],
      none: null,
    }[p.review];
    const agentName = program?.name ?? "agent";
    const prIcon =
      p.provider === "forgejo"
        ? "forgejo"
        : p.draft
          ? "git-pull-request-draft"
          : "git-pull-request";
    return card()
      .id(`pr-${p.id}`)
      .flex_none()
      .hover((s) => s.border_color(t.input))
      .child(
        h_flex4()
          .gap(8)
          .items_center()
          .child(
            icon(prIcon, ICON.sm, p.draft ? t.muted : t.ansi2).tooltip(
              p.provider === "forgejo" ? "Forgejo" : "GitHub",
            ),
          )
          .child(
            mono(`#${p.number}`)
              .id(`num-${p.id}`)
              .flex_none()
              .text_size(TEXT.xs)
              .text_color(t.accent)
              .cursor_pointer()
              .hover((s) => s.underline())
              .tooltip(`${p.url} · right-click copies it`)
              .on_click(() => void openUrl(p.url))
              .on_mouse_down("right", (_e, cx) => {
                cx.stop_propagation();
                void copyText(p.url);
              }),
          )
          .child(
            div4()
              .id(`title-${p.id}`)
              .flex_1()
              .min_w(0)
              .truncate()
              .text_size(TEXT.sm)
              .font_medium()
              .cursor_pointer()
              .hover((s) => s.underline())
              .on_click(() => void openUrl(p.url))
              .tooltip(p.title)
              .child(p.title),
          )
          .when(p.draft, (el) => el.child(badge("Draft", { variant: "outline" }))),
      )
      .child(
        h_flex4()
          .gap(4)
          .items_center()
          .text_size(TEXT.xs)
          .text_color(t.muted)
          .when(all, (el) =>
            el.child(div4().min_w(0).truncate().child(p.slug)).child(div4().flex_none().child("·")),
          )
          .child(div4().min_w(0).truncate().font_family(MONO).child(`${p.head} → ${p.base}`))
          .child(
            div4()
              .flex_none()
              .child(`· ${[p.author, ago(p.updated)].filter(Boolean).join(" · ")}`),
          ),
      )
      .child(
        h_flex4()
          .gap(6)
          .items_center()
          .when(Boolean(checks), (el) => {
            const [glyph, color, tip] = checks;
            return el.child(
              badge("Checks", {
                id: `checks-${p.id}`,
                tone: color,
                variant: "outline",
                icon: glyph,
                tooltip: tip,
              }),
            );
          })
          .when(Boolean(review), (el) => {
            const [text, color] = review;
            return el.child(badge(text, { tone: color, variant: "outline" }));
          })
          .when(p.comments + p.unresolved > 0, (el) =>
            el.child(
              badge(p.unresolved ? `${p.unresolved} open` : String(p.comments), {
                id: `comments-${p.id}`,
                variant: "outline",
                tone: p.unresolved ? t.working : void 0,
                icon: "message-square",
                tooltip: `${p.comments} comments, ${p.unresolved} unresolved threads`,
              }),
            ),
          )
          .child(
            h_flex4()
              .flex_none()
              .gap(4)
              .ml_auto()
              .font_family(MONO)
              .text_size(TEXT.xs)
              .child(div4().text_color(t.ansi2).child(`+${p.additions}`))
              .child(div4().text_color(t.blocked).child(`−${p.deletions}`)),
          ),
      )
      .child(
        h_flex4()
          .gap(4)
          .items_center()
          .child(
            button(`agent-${p.id}`, {
              variant: "outline",
              size: "icon-xs",
              icon: agentIcon(program, ICON.sm, t.foreground),
              tooltip: started ? shown : `Start ${agentName} to review #${p.number}`,
              onClick: (_e, cx) => start("review", cx),
            }),
          )
          .children(
            ACTIONS.map((a) =>
              button(`${a.id}-${p.id}`, {
                variant: "outline",
                size: "xs",
                label: a.label,
                tooltip: started ? shown : `Start ${agentName}: ${a.label.toLowerCase()}`,
                onClick: (_e, cx) => start(a.id, cx),
              }),
            ),
          )
          .child(div4().flex_1())
          .when(starting, (el) => el.child(spinner(ICON.sm, t.working)))
          .when(started && !starting, (el) => el.child(dot(t.working)))
          .child(
            button(`open-${p.id}`, {
              icon: "external-link",
              size: "icon-xs",
              tooltip: "Open in browser",
              onClick: () => void openUrl(p.url),
            }),
          ),
      );
  }
};
export { Pulls as default };
