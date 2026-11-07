// Generated from src/mods/mc-github-issues/main.ts and its imports by `pnpm build:herdr`. Edit the sources, not this file.
// .config/herdr-app/src/shared/board.ts
import { div as div3, image as image2, svg as svg3 } from "gpui-kit";
import { h_flex as h_flex3, v_flex as v_flex3 } from "gpui-base";
import { knownAgents as knownAgents2 } from "herdr";

// .config/herdr-app/src/shared/board-model.ts
var COLUMNS = [
  { id: "todo", label: "To do", tone: "dim" },
  { id: "progress", label: "In progress", tone: "working" },
  { id: "done", label: "Done", tone: "ansi4" },
];
function filterItems(items, filter, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    if (filter !== "all" && item.column !== filter) return false;
    if (!words.length) return true;
    const hay = [
      item.key,
      item.title,
      item.where,
      item.status,
      ...(item.labels ?? []),
      ...(item.assignees ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
function countByColumn(items) {
  const counts = { all: items.length, todo: 0, progress: 0, done: 0 };
  for (const item of items) counts[item.column]++;
  return counts;
}
var PRIORITY_RANK = {
  highest: 0,
  critical: 0,
  blocker: 0,
  urgent: 0,
  high: 1,
  major: 1,
  medium: 2,
  normal: 2,
  low: 3,
  minor: 3,
  lowest: 4,
  trivial: 4,
};
function sortItems(items) {
  const rank = (p) => PRIORITY_RANK[(p ?? "").toLowerCase()] ?? 2.5;
  return [...items].sort((a, b) => rank(a.priority) - rank(b.priority) || b.updated - a.updated);
}
function columnFor(open, assignees, labels) {
  if (!open) return "done";
  const status = statusFromLabels(labels);
  if (status) return columnForStatus(status, open);
  if (labels.some((l) => /progress|doing|wip|started|review/i.test(l))) return "progress";
  return assignees.length ? "progress" : "todo";
}
function statusFromLabels(labels) {
  for (const l of labels) {
    const m = /^(status|state|stage|workflow)\s*(?:\/|::?)\s*(.+)$/i.exec(l.trim());
    if (m) {
      const word = m[2].replace(/[-_]+/g, " ").trim();
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
  }
  return null;
}
function columnForStatus(status, open) {
  if (
    /\b(done|complete[d]?|closed|shipped|released|merged|resolved|fixed|won.?t|not planned|duplicate)\b/i.test(
      status,
    )
  )
    return "done";
  if (!open) return "done";
  if (/\b(backlog|to ?do|todo|new|open|triage|ready|planned|icebox|later)\b/i.test(status))
    return "todo";
  return "progress";
}

// .config/herdr-app/src/shared/config.ts
import { appHome, exec, readTextFile, writeTextFile } from "herdr";

// .config/herdr-app/src/shared/util.ts
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
function parseJson(text, fallback) {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
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
function tokenPath(service) {
  return `${appHome()}/mission-control/${service}.token`;
}
function forgetSecret(service) {
  secrets.delete(service);
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
function fill(template, vars) {
  return template.replace(/\{(\w+)\}/g, (all, name) => vars[name] ?? all);
}
function skillCommand(runner, skill) {
  return fill(runner?.skill || "/{skill}", { skill });
}
function actionPrompt(action, runner, item) {
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
function agentKeyOf(program) {
  if (!program) return null;
  const k = program.toLowerCase();
  if (k.startsWith("claude")) return "claude";
  if (k.startsWith("opencode")) return "opencode";
  if (k === "pi" || k.startsWith("pi-")) return "pi";
  return k;
}
function chooseAgent(action, main, fallbackArgv) {
  return (
    action.agent ||
    agentKeyOf(main) ||
    agentKeyOf((fallbackArgv[0] ?? "claude").split("/").pop()) ||
    "claude"
  );
}
function actionTabName(action, item) {
  return `${action.label}: ${item.tabName}`;
}

// .config/herdr-app/src/shared/launch.ts
import {
  exec as exec3,
  focused,
  knownAgents,
  notify,
  panes as panes2,
  run,
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

// .config/herdr-app/src/shared/repo.ts
var TTL = 5 * 6e4;
var cache2 = /* @__PURE__ */ new Map();
function spaceFolder(space) {
  const tabs = new Set(space.tabs.map((t) => t.id));
  return panes().find((p) => tabs.has(p.tab) && p.cwd)?.cwd || space.folder || "";
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
async function ask(machine, cwd) {
  const none = { machine, cwd, root: null, remotes: [] };
  if (!cwd) return none;
  const on = machine ?? void 0;
  const top = await exec2("git", ["rev-parse", "--show-toplevel"], { cwd, on });
  if (top.code !== 0) return none;
  const list = await exec2("git", ["remote", "-v"], { cwd, on });
  const urls = /* @__PURE__ */ new Map();
  for (const line of list.stdout.split("\n")) {
    const [name, url] = line.split(/\s+/);
    if (name && url && !urls.has(name)) urls.set(name, url);
  }
  const names = [...urls.keys()].sort((a, b) => (a === "origin" ? -1 : b === "origin" ? 1 : 0));
  const remotes = names
    .map((n) => {
      const r = parseRemote(urls.get(n));
      return r ? { ...r, remoteName: n } : null;
    })
    .filter((r) => r !== null);
  return { machine, cwd, root: top.stdout.trim(), remotes };
}
async function spacesForSlug(slug) {
  const want = slug.toLowerCase();
  const found = [];
  for (const space of spaces()) {
    const repo = await repoOf(space).catch(() => null);
    if (repo?.remotes.some((r) => r.slug.toLowerCase() === want)) found.push(space);
  }
  return found;
}

// .config/herdr-app/src/shared/launch.ts
function findTab(name) {
  for (const space of spaces2()) {
    const tab = space.tabs.find((t) => t.named && t.name === name);
    if (tab) return { space, tab: tab.id };
  }
  return null;
}
async function startWork(work) {
  const existing = findTab(work.name);
  if (existing) {
    run("space.select", { id: existing.space.id });
    run("tab.select", { id: existing.tab });
    return;
  }
  const config = await loadConfig();
  let space = activeSpace();
  if (work.repo) {
    const candidates = await spacesForSlug(work.repo);
    space = candidates.find((s) => s.active) ?? candidates[0] ?? space;
  }
  if (space && !space.active) run("space.select", { id: space.id });
  run("tab.new", {
    name: work.name,
    ...(space ? { space: space.id } : {}),
    argv: work.argv?.length ? work.argv : config.agent.argv,
    task: work.task,
  });
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
function mainWindowAgent() {
  const all = panes2();
  const f = focused();
  const isAgent = (p) => Boolean(p?.program?.agent || p?.app);
  const focusedPane = all.find((p) => p.pane === f?.pane);
  if (focusedPane && isAgent(focusedPane)) return focusedPane.program;
  const inTab = all.find((p) => p.tab === f?.tab && isAgent(p));
  if (inTab) return inTab.program;
  const space = spaces2().find((s) => s.id === f?.space) ?? spaces2().find((s) => s.active);
  const tabs = new Set(space?.tabs.map((t) => t.id) ?? []);
  return all.find((p) => tabs.has(p.tab) && isAgent(p))?.program ?? null;
}
async function actionAgent(action) {
  const config = await loadConfig();
  const main = mainWindowAgent();
  const key = chooseAgent(action, main?.key ?? null, config.agent.argv);
  const known = await knownAgents().catch(() => []);
  const entry = known.find((a) => agentKeyOf(a.key) === key);
  const argv = config.agents[key]?.argv?.length ? config.agents[key].argv : (entry?.run ?? [key]);
  const program = agentKeyOf(main?.key) === key ? main : (entry ?? null);
  return { key, argv, program };
}
async function runIssueAction(action, item) {
  const config = await loadConfig();
  const { key, argv } = await actionAgent(action);
  await startWork({
    name: actionTabName(action, item),
    task: actionPrompt(action, config.agents[key], item),
    repo: item.repo,
    argv,
  });
}

// .config/herdr-app/src/shared/list-view.ts
import { div as div2, svg as svg2, View } from "gpui-kit";
import { h_flex as h_flex2, v_flex as v_flex2, InputState } from "gpui-base";
import { run as run2, setShared, shared, theme as theme2 } from "herdr";

// .config/herdr-app/src/shared/sources.ts
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

// .config/herdr-app/src/assets/agent.svg
var agent_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="8" width="15" height="11.5" rx="3"/><path d="M12 8V4.8"/><circle cx="12" cy="3.6" r="1.1"/><circle cx="9.3" cy="13.5" r="1.1" fill="currentColor"/><circle cx="14.7" cy="13.5" r="1.1" fill="currentColor"/></svg>\n';

// .config/herdr-app/src/assets/close.svg
var close_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg>\n';

// .config/herdr-app/src/assets/comment.svg
var comment_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-7.5L7 20v-3.5H5A1.5 1.5 0 0 1 3.5 15V6A1.5 1.5 0 0 1 5 4.5z"/></svg>\n';

// .config/herdr-app/src/assets/expand.svg
var expand_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4H20v5.5M20 4l-6.5 6.5M9.5 20H4v-5.5M4 20l6.5-6.5"/></svg>\n';

// .config/herdr-app/src/assets/external.svg
var external_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-8.5 8.5"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>\n';

// .config/herdr-app/src/assets/eye.svg
var eye_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/></svg>\n';

// .config/herdr-app/src/assets/forgejo.svg
var forgejo_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="17.5" cy="5" r="2.2"/><circle cx="17.5" cy="13.5" r="2.2"/><circle cx="6.5" cy="19" r="2.2"/><path d="M6.5 16.8V11a6 6 0 0 1 6-6h2.8M6.5 16.8a3.3 3.3 0 0 1 3.3-3.3h5.5"/></svg>\n';

// .config/herdr-app/src/assets/history.svg
var history_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4.2v4.3h4.3"/><path d="M12 7.5V12l3 2"/></svg>\n';

// .config/herdr-app/src/assets/issue.svg
var issue_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>\n';

// .config/herdr-app/src/assets/jira.svg
var jira_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.8 21.2 12 12 21.2 2.8 12z"/><path d="M12 8.2 15.8 12 12 15.8 8.2 12z"/></svg>\n';

// .config/herdr-app/src/assets/more.svg
var more_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="5.5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18.5" cy="12" r="1.6"/></svg>\n';

// .config/herdr-app/src/assets/pull-request.svg
var pull_request_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="5.5" r="2.2"/><circle cx="6" cy="18.5" r="2.2"/><circle cx="18" cy="18.5" r="2.2"/><path d="M6 7.7v8.6M18 16.3V10a4 4 0 0 0-4-4h-3.5M12.5 3.5 10.5 6l2 2.5"/></svg>\n';

// .config/herdr-app/src/assets/refresh.svg
var refresh_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 10.5A7.7 7.7 0 0 0 5.6 7.4L4 9"/><path d="M4 4.5V9h4.5"/><path d="M4.5 13.5a7.7 7.7 0 0 0 13.9 3.1L20 15"/><path d="M20 19.5V15h-4.5"/></svg>\n';

// .config/herdr-app/src/assets/shrink.svg
var shrink_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 9.5H14V4M14 9.5 20 3.5M4.5 14.5H10V20M10 14.5 4 20.5"/></svg>\n';

// .config/herdr-app/src/assets/terminal.svg
var terminal_default =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="m7 9.5 3 2.5-3 2.5M12.5 15h4"/></svg>\n';

// .config/herdr-app/src/shared/icon-data.ts
var ICONS = {
  agent: agent_default,
  close: close_default,
  comment: comment_default,
  expand: expand_default,
  external: external_default,
  eye: eye_default,
  forgejo: forgejo_default,
  history: history_default,
  issue: issue_default,
  jira: jira_default,
  more: more_default,
  "pull-request": pull_request_default,
  refresh: refresh_default,
  shrink: shrink_default,
  terminal: terminal_default,
};

// .config/herdr-app/src/shared/icons.ts
var installing = null;
function install() {
  const dir = `${appHome2()}/mods/mc-github-issues/icons`;
  return (async () => {
    await exec4("mkdir", ["-p", dir]);
    for (const [name, svg4] of Object.entries(ICONS)) {
      const path = `${dir}/${name}.svg`;
      const now = await readTextFile2(path).catch(() => null);
      if (now !== svg4) await writeTextFile2(path, svg4, now).catch(() => null);
    }
  })().catch(() => {
    installing = null;
  });
}
function asset(name) {
  installing ??= install();
  return `mods/mc-github-issues/icons/${name}.svg`;
}

// .config/herdr-app/src/shared/ui.ts
var chromeIcon = (name) => `mods/workspace-chrome/${name}.svg`;
var stopPress = (_e, cx) => cx.stop_propagation();
var alpha = (color, a) =>
  color && /^#[0-9a-f]{6}$/i.test(color) ? `${color}${a}` : (color ?? "#00000000");
function iconButton(id, icon, tooltip, onClick, opts = {}) {
  const t = theme();
  const size = opts.size ?? 26;
  return div()
    .id(id)
    .size(size)
    .flex_none()
    .flex()
    .items_center()
    .justify_center()
    .rounded(6)
    .cursor_pointer()
    .text_color(opts.active ? t.foreground : t.dim)
    .when(Boolean(opts.active), (el) => el.bg(t.selected))
    .hover((s) => s.bg(t.hover).text_color(t.foreground))
    .on_mouse_down("left", stopPress)
    .on_click(onClick)
    .tooltip(tooltip)
    .child(svg(icon).size(opts.iconSize ?? 15));
}
function textButton(id, label, onClick, opts = {}) {
  const t = theme();
  return h_flex()
    .id(id)
    .h(28)
    .px(10)
    .gap(6)
    .flex_none()
    .items_center()
    .rounded(7)
    .text_size(12.5)
    .cursor_pointer()
    .when(Boolean(opts.primary), (el) => el.bg(t.solid).text_color(t.solid_foreground))
    .when(!opts.primary, (el) =>
      el
        .border(1)
        .border_color(t.border)
        .text_color(t.foreground)
        .hover((s) => s.bg(t.hover)),
    )
    .on_mouse_down("left", stopPress)
    .on_click(onClick)
    .when(Boolean(opts.icon), (el) => el.child(svg(opts.icon).size(13)))
    .child(label);
}
function segmented(id, options, value, onChange) {
  const t = theme();
  return h_flex()
    .flex_none()
    .gap(2)
    .p(2)
    .rounded(8)
    .bg(t.surface)
    .children(
      options.map((o) =>
        div()
          .id(`${id}-${o.value}`)
          .h(26)
          .px(10)
          .flex()
          .items_center()
          .rounded(6)
          .text_size(12.5)
          .cursor_pointer()
          .when(o.value === value, (el) => el.bg(t.selected).text_color(t.accent))
          .when(o.value !== value, (el) =>
            el.text_color(t.muted).hover((s) => s.text_color(t.foreground)),
          )
          .on_mouse_down("left", stopPress)
          .on_click((_e, cx) => onChange(o.value, cx))
          .child(o.label),
      ),
    );
}
function searchBox(id, state, opts = {}) {
  const t = theme();
  return h_flex()
    .id(id)
    .h(opts.height ?? 30)
    .px(10)
    .gap(8)
    .flex_1()
    .min_w(0)
    .items_center()
    .rounded(8)
    .border(1)
    .border_color(t.border)
    .bg(t.background)
    .cursor_text()
    .on_mouse_down("left", stopPress)
    .child(svg(chromeIcon("search")).size(13).flex_none().text_color(t.dim))
    .child(Input.new(state).flex_1().min_w(0).h_full().text_size(12.5).text_color(t.foreground));
}
function countChip(id, label, count, on, onClick) {
  const t = theme();
  return h_flex()
    .id(id)
    .h(26)
    .px(9)
    .gap(6)
    .flex_none()
    .items_center()
    .rounded(6)
    .text_size(12.5)
    .cursor_pointer()
    .when(on, (el) => el.bg(t.selected).text_color(t.accent))
    .when(!on, (el) => el.text_color(t.muted).hover((s) => s.text_color(t.foreground)))
    .on_click((_e, cx) => onClick(cx))
    .child(label)
    .child(
      div()
        .text_size(11)
        .text_color(on ? t.accent : t.dim)
        .child(String(count)),
    );
}
function emptyState(title, body, actions = []) {
  const t = theme();
  return v_flex()
    .flex_1()
    .min_h(0)
    .items_center()
    .justify_center()
    .gap(8)
    .p(24)
    .child(div().text_size(13.5).font_medium().text_color(t.foreground).child(title))
    .when(Boolean(body), (el) =>
      el.child(div().max_w(420).text_size(12.5).text_color(t.muted).text_center().child(body)),
    )
    .when(actions.length > 0, (el) => el.child(h_flex().pt(6).gap(8).children(actions)));
}

// .config/herdr-app/src/shared/list-view.ts
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
    this.reload(cx);
    cx.timer.every(1500, (cx2) => {
      if (this.key() !== this.loadedKey) this.reload(cx2);
    });
    cx.timer.every(this.interval(), (cx2) => this.reload(cx2, true));
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
        textButton(
          "token-save",
          this.saving ? "Saving…" : "Save token",
          (_e, cx) => this.saveToken(cx),
          {
            primary: true,
          },
        ),
      )
      .when(Boolean(ask2.createUrl), (el) =>
        el.child(textButton("token-create", "Create a token", () => void openUrl(ask2.createUrl))),
      );
    const field = h_flex2().w_full().max_w(420).child(searchBox("token-input", this.tokenInput));
    if (compact) {
      return v_flex2()
        .flex_none()
        .mx(12)
        .mb(8)
        .p(10)
        .gap(8)
        .rounded(9)
        .border(1)
        .border_color(t.border)
        .bg(t.surface)
        .child(div2().text_size(12.5).text_color(t.foreground).child(ask2.title))
        .child(div2().text_size(11.5).text_color(t.muted).child(ask2.body))
        .child(field)
        .child(buttons);
    }
    return v_flex2()
      .flex_1()
      .min_h(0)
      .items_center()
      .justify_center()
      .gap(10)
      .p(24)
      .child(div2().text_size(13.5).font_medium().text_color(t.foreground).child(ask2.title))
      .child(div2().max_w(420).text_size(12.5).text_color(t.muted).text_center().child(ask2.body))
      .child(field)
      .child(buttons)
      .when(Boolean(this.error), (el) =>
        el.child(
          div2().max_w(420).text_size(12).text_color(t.blocked).text_center().child(this.error),
        ),
      )
      .child(
        div2()
          .max_w(420)
          .text_size(11)
          .text_color(t.dim)
          .text_center()
          .child(
            "Saved in ~/.config/herdr-app/mission-control/, readable only by you and never in the dots repo.",
          ),
      );
  }
  scope() {
    return shared(KEYS.scope(this.source())) === "all" ? "all" : "space";
  }
  key() {
    return this.scope() === "all" ? "all" : `space:${activeSpace()?.id ?? ""}`;
  }
  setScope(scope, cx) {
    setShared(KEYS.scope(this.source()), scope);
    this.reload(cx);
  }
  reload(cx, quiet = false) {
    const key = this.key();
    const seq = ++this.seq;
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
    if (!quiet) this.loading = true;
    cx.notify();
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
          cx2.notify();
        }
      }
    });
  }
  toolbar(t) {
    const narrow = this.width > 0 && this.width < 460;
    const scope = segmented("scope", SCOPES, this.scope(), (s, cx) => this.setScope(s, cx));
    const buttons = h_flex2()
      .flex_none()
      .gap(2)
      .items_center()
      .children(this.tools(t))
      .child(
        iconButton("refresh", asset("refresh"), "Refresh", (_e, cx) => this.reload(cx), {
          active: this.loading,
        }),
      )
      .when(this.hasSettings(), (el) =>
        el.child(
          iconButton("settings", chromeIcon("settings"), "Edit mission-control.json", () =>
            run2("tab.new", editConfigArgs()),
          ),
        ),
      );
    const search = searchBox("search", this.search);
    if (narrow) {
      return v_flex2()
        .flex_none()
        .px(12)
        .pt(10)
        .gap(8)
        .child(h_flex2().items_center().gap(8).child(scope).child(div2().flex_1()).child(buttons))
        .child(h_flex2().child(search));
    }
    return h_flex2()
      .flex_none()
      .px(14)
      .pt(12)
      .gap(10)
      .items_center()
      .child(scope)
      .child(search)
      .child(buttons);
  }
  footer(t, shown) {
    const total = this.snap.items.length;
    const count =
      shown === total ? `${total} ${this.noun()}` : `${shown} of ${total} ${this.noun()}`;
    const when = this.loading ? "Loading…" : this.snap.at ? `Updated ${ago(this.snap.at)}` : "";
    return h_flex2()
      .flex_none()
      .h(30)
      .px(14)
      .gap(8)
      .items_center()
      .border_t(1)
      .border_color(t.border)
      .text_size(11.5)
      .text_color(t.dim)
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
  render(cx) {
    const t = theme2();
    const items = this.visible(this.snap.items, this.search.value());
    let content;
    if (this.snap.setup) {
      content = emptyState(this.snap.setup.title, this.snap.setup.body, [
        textButton("setup", "Edit mission-control.json", () => run2("tab.new", editConfigArgs()), {
          primary: true,
        }),
      ]);
    } else if (this.snap.token && !this.snap.items.length) {
      content = this.tokenForm(t, this.snap.token, false);
    } else if (this.error && !this.snap.items.length) {
      content = emptyState("Couldn't load", this.error, [
        textButton("retry", "Try again", (_e, cx2) => this.reload(cx2)),
      ]);
    } else if (!this.snap.items.length) {
      content = this.loading
        ? emptyState("Loading…", "")
        : emptyState(
            this.snap.note || `No ${this.noun()}`,
            "",
            this.scope() === "space"
              ? [textButton("all", "Show all spaces", (_e, cx2) => this.setScope("all", cx2))]
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
    const sub =
      this.snap.items.length && !this.snap.setup
        ? this.subbar(t, this.visible(this.snap.items, this.search.value()))
        : null;
    return v_flex2()
      .id("root")
      .size_full()
      .min_h(0)
      .bg(t.background)
      .text_size(13)
      .text_color(t.foreground)
      .on_size_change((size, cx2) => {
        if (Math.abs(size.width - this.width) >= 1) {
          this.width = size.width;
          cx2.notify();
        }
      })
      .child(this.toolbar(t))
      .when(Boolean(sub), (el) => el.child(sub))
      .child(v_flex2().flex_1().min_h(0).pt(10).child(content))
      .child(this.footer(t, items.length));
  }
};

// .config/herdr-app/src/shared/board.ts
var COLUMNS_AT = 720;
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
var issueActions = [];
var actionsAsked = 0;
function useIssueActions(cx) {
  if (Date.now() - actionsAsked > 1e4) {
    actionsAsked = Date.now();
    cx.spawn(async (cx2) => {
      const next = (await loadConfig()).issueActions.filter((a) => a && a.label && a.skill);
      if (JSON.stringify(next) !== JSON.stringify(issueActions)) {
        issueActions = next;
        cx2.notify();
      }
    });
  }
  return issueActions;
}
var BoardView = class extends ListView {
  init(props, cx) {
    this.filter = "all";
    super.init(props, cx);
  }
  noun() {
    return "issues";
  }
  placeholder() {
    return "Search issues";
  }
  visible(items, query) {
    return sortItems(filterItems(items, "all", query));
  }
  subbar(t, items) {
    const counts = countByColumn(items);
    const chip = (id, label) =>
      countChip(`filter-${id}`, label, counts[id], this.filter === id, (cx) => {
        this.filter = id;
        cx.notify();
      });
    return h_flex3()
      .flex_none()
      .px(14)
      .pt(10)
      .gap(4)
      .items_center()
      .child(chip("all", "All"))
      .children(COLUMNS.map((c) => chip(c.id, c.label)));
  }
  body(t, items, cx) {
    useAgentProgram(cx);
    const all = this.scope() === "all";
    const shown = this.filter === "all" ? items : items.filter((i) => i.column === this.filter);
    const actions = useIssueActions(cx);
    const card = (item) => this.card(t, item, all, actions);
    const wide = this.width >= COLUMNS_AT && this.filter === "all";
    if (wide) {
      return h_flex3()
        .id("board")
        .flex_1()
        .min_h(0)
        .px(14)
        .gap(12)
        .items_start()
        .overflow_y_scrollbar()
        .children(
          COLUMNS.map((c) => {
            const mine = shown.filter((i) => i.column === c.id);
            return v_flex3()
              .flex_1()
              .min_w(0)
              .gap(8)
              .pb(14)
              .child(this.groupHeader(t, c.label, c.tone, mine.length))
              .children(mine.map(card));
          }),
        );
    }
    const groups = COLUMNS.filter((c) => this.filter === "all" || c.id === this.filter);
    return v_flex3()
      .id("board")
      .flex_1()
      .min_h(0)
      .px(12)
      .pb(14)
      .gap(8)
      .overflow_y_scrollbar()
      .children(
        groups.flatMap((c) => {
          const mine = shown.filter((i) => i.column === c.id);
          if (!mine.length && this.filter === "all") return [];
          return [this.groupHeader(t, c.label, c.tone, mine.length), ...mine.map(card)];
        }),
      );
  }
  groupHeader(t, label, tone, count) {
    return h_flex3()
      .flex_none()
      .h(26)
      .pt(4)
      .gap(7)
      .items_center()
      .text_size(12.5)
      .text_color(t.muted)
      .child(
        div3()
          .size(6)
          .rounded(3)
          .bg(t[tone] ?? t.dim),
      )
      .child(label)
      .child(div3().text_size(11).text_color(t.dim).child(String(count)));
  }
  card(t, item, all, actions) {
    const labels = item.labels ?? [];
    return v_flex3()
      .id(`card-${item.id}`)
      .flex_none()
      .p(12)
      .gap(8)
      .rounded(9)
      .border(1)
      .border_color(t.border)
      .bg(t.surface)
      .hover((s) => s.border_color(t.input))
      .child(
        h_flex3()
          .gap(8)
          .items_center()
          .text_size(12)
          .child(
            div3()
              .id(`key-${item.id}`)
              .flex_none()
              .text_color(t.accent)
              .cursor_pointer()
              .hover((s) => s.underline())
              .tooltip(item.url)
              .on_click(() => void openUrl(item.url))
              .on_mouse_down("right", (_e, cx) => {
                cx.stop_propagation();
                void copyText(item.url);
              })
              .child(item.key),
          )
          .when(all && Boolean(item.where), (el) =>
            el.child(div3().min_w(0).truncate().text_color(t.dim).child(item.where)),
          )
          .child(div3().flex_1())
          .when(Boolean(item.priority), (el) =>
            el.child(div3().flex_none().text_color(t.muted).child(item.priority)),
          )
          .when(Boolean(item.status), (el) => el.child(statusPill(t, item))),
      )
      .child(
        div3()
          .id(`title-${item.id}`)
          .text_size(13.5)
          .text_color(t.foreground)
          .cursor_pointer()
          .on_click(() => void openUrl(item.url))
          .child(item.title),
      )
      .when(labels.length > 0 || Boolean(item.milestone), (el) =>
        el.child(
          h_flex3()
            .gap(4)
            .flex_wrap()
            .when(Boolean(item.milestone), (row) => row.child(milestoneChip(t, item.milestone)))
            .children(labels.map((l) => labelChip(t, l, item.labelColors?.[l]))),
        ),
      )
      .when(hasWork(item), (el) => el.child(workRow(t, item)))
      .when(actions.length > 0, (el) => el.child(actionRow(t, item, actions)))
      .child(
        h_flex3()
          .gap(4)
          .items_center()
          .text_size(11.5)
          .text_color(t.dim)
          .when(Boolean(item.assignees?.length), (el) =>
            el.child(
              div3()
                .min_w(0)
                .truncate()
                .child(`${(item.assignees ?? []).join(", ")} ·`),
            ),
          )
          .child(div3().flex_none().child(ago(item.updated)))
          .child(div3().flex_1())
          .when((item.comments ?? 0) > 0, (el) =>
            el.child(
              indicator(
                `comments-${item.id}`,
                asset("comment"),
                String(item.comments),
                t.muted,
                `${item.comments} ${item.comments === 1 ? "comment" : "comments"}`,
                item.url,
                t,
              ),
            ),
          )
          .child(
            iconButton(
              `open-${item.id}`,
              asset("external"),
              "Open in browser",
              () => void openUrl(item.url),
              { iconSize: 13 },
            ),
          ),
      );
  }
};
function columnColor(t, item) {
  if (item.column === "todo") return t.muted;
  const tone = COLUMNS.find((c) => c.id === item.column)?.tone ?? "dim";
  return t[tone] ?? t.muted;
}
function statusPill(t, item) {
  const color = columnColor(t, item);
  return h_flex3()
    .flex_none()
    .h(18)
    .px(7)
    .gap(5)
    .items_center()
    .rounded(9)
    .bg(alpha(color, "24"))
    .text_size(11)
    .text_color(color)
    .child(div3().size(6).rounded(3).bg(color))
    .child(item.status);
}
function milestoneChip(t, name) {
  return h_flex3()
    .flex_none()
    .h(18)
    .px(6)
    .gap(4)
    .items_center()
    .rounded(5)
    .border(1)
    .border_color(t.border)
    .text_size(11)
    .text_color(t.muted)
    .tooltip(`Milestone: ${name}`)
    .child(svg3(chromeIcon("pin")).size(11).flex_none())
    .child(name);
}
function labelChip(t, name, color) {
  const known = Boolean(color && /^#[0-9a-f]{6}$/i.test(color));
  return h_flex3()
    .flex_none()
    .h(18)
    .px(6)
    .gap(5)
    .items_center()
    .rounded(5)
    .bg(alpha(known ? color : t.accent, known ? "2e" : "1f"))
    .when(known, (el) => el.border(1).border_color(alpha(color, "66")))
    .text_size(11)
    .text_color(t.foreground)
    .when(known, (el) => el.child(div3().size(7).rounded(4).bg(color)))
    .child(name);
}
function hasWork(item) {
  return Boolean(item.pulls?.length || item.branches?.length);
}
function indicator(id, icon, text, color, tooltip, url, t, trailing = null) {
  return h_flex3()
    .id(id)
    .flex_none()
    .min_w(0)
    .max_w(220)
    .h(20)
    .px(6)
    .gap(4)
    .items_center()
    .rounded(5)
    .text_color(color)
    .tooltip(tooltip)
    .when(Boolean(url), (el) =>
      el
        .cursor_pointer()
        .hover((s) => s.bg(t.hover))
        .on_mouse_down("left", stopPress)
        .on_click(() => void openUrl(url)),
    )
    .child(svg3(icon).size(12).flex_none())
    .child(div3().min_w(0).truncate().child(text))
    .when(Boolean(trailing), (el) => el.child(trailing));
}
var CHECKS = {
  passing: { icon: "check", tone: "ansi2", say: "checks passing" },
  failing: { icon: "x", tone: "blocked", say: "checks failing" },
  pending: { icon: "clock", tone: "working", say: "checks running" },
};
function checksGlyph(t, checks) {
  const c = checks ? CHECKS[checks] : void 0;
  return c
    ? svg3(chromeIcon(c.icon))
        .size(11)
        .flex_none()
        .text_color(t[c.tone] ?? t.muted)
    : null;
}
function actionRow(t, item, actions) {
  const main = mainWindowAgent();
  const fallback = agentProgram;
  const lead = main ?? fallback;
  const who = lead?.name ?? "the agent";
  return h_flex3()
    .gap(4)
    .flex_wrap()
    .items_center()
    .child(
      lead?.icon
        ? (lead.tint ? svg3(lead.icon).size(14).text_color(t.muted) : image2(lead.icon).size(14))
            .flex_none()
            .mr(2)
        : svg3(asset("agent")).size(14).flex_none().mr(2).text_color(t.muted),
    )
    .children(
      actions.map((a, i) => {
        const open = findTab(actionTabName(a, item));
        return h_flex3()
          .id(`action-${i}-${item.id}`)
          .flex_none()
          .h(22)
          .px(8)
          .gap(5)
          .items_center()
          .rounded(6)
          .border(1)
          .border_color(open ? t.working : t.border)
          .text_size(11.5)
          .text_color(t.muted)
          .cursor_pointer()
          .hover((s) => s.bg(t.hover).text_color(t.foreground))
          .on_mouse_down("left", stopPress)
          .on_click(() => void runIssueAction(a, item))
          .tooltip(
            open
              ? `Show the "${actionTabName(a, item)}" tab`
              : `New ${a.agent ?? who} session running the ${a.skill} skill on ${item.url}`,
          )
          .child(a.label)
          .when(Boolean(open), (el) => el.child(div3().size(5).rounded(3).bg(t.working)));
      }),
    );
}
function workRow(t, item) {
  const pulls = item.pulls ?? [];
  const branches = item.branches ?? [];
  const els = pulls
    .slice(0, 3)
    .map((p) =>
      indicator(
        `pr-${item.id}-${p.number}`,
        asset("pull-request"),
        p.draft ? `Draft #${p.number}` : `PR #${p.number}`,
        p.draft ? t.muted : t.ansi2,
        [
          `${p.draft ? "Draft pull request" : "Open pull request"} #${p.number}: ${p.title}`,
          p.checks && CHECKS[p.checks] ? CHECKS[p.checks].say : null,
        ]
          .filter(Boolean)
          .join(" · "),
        p.url,
        t,
        checksGlyph(t, p.checks),
      ),
    );
  if (pulls.length > 3)
    els.push(
      div3()
        .flex_none()
        .child(`+${pulls.length - 3}`),
    );
  if (branches.length) {
    const [first] = branches;
    els.push(
      indicator(
        `branch-${item.id}`,
        chromeIcon("git-branch"),
        branches.length === 1 ? first.name : `${branches.length} branches`,
        t.ansi5 ?? t.accent,
        `Open ${branches.length === 1 ? "branch" : "branches"} on the remote: ${branches.map((b) => b.name).join(", ")}`,
        first.url,
        t,
      ),
    );
  }
  return h_flex3().gap(4).flex_wrap().items_center().text_size(11.5).ml(-6).children(els);
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
function ghIssueStatus(i, labels, project) {
  if (i.state !== "OPEN") {
    if (i.stateReason === "NOT_PLANNED") return "Not planned";
    if (i.stateReason === "DUPLICATE") return "Duplicate";
    return "Closed";
  }
  return project ?? statusFromLabels(labels) ?? "Open";
}
var repoName = (slug) => slug.split("/").pop() ?? slug;
function issueItem(i, project = null) {
  const slug = i.repository.nameWithOwner;
  const assignees = (i.assignees?.nodes ?? []).map((a) => a.login);
  const labels = (i.labels?.nodes ?? []).map((l) => l.name);
  const labelColors = Object.fromEntries(
    (i.labels?.nodes ?? []).filter((l) => l.color).map((l) => [l.name, `#${l.color}`]),
  );
  const open = i.state === "OPEN";
  return {
    id: `github:${slug}#${i.number}`,
    key: `#${i.number}`,
    title: i.title,
    url: i.url,
    column: project && open ? columnForStatus(project, open) : columnFor(open, assignees, labels),
    status: ghIssueStatus(i, labels, project),
    where: slug,
    assignees,
    labels,
    labelColors,
    comments: i.comments?.totalCount,
    milestone: i.milestone?.title ?? null,
    pulls: (i.closedByPullRequestsReferences?.nodes ?? []).map((p) => ({
      number: p.number,
      title: p.title,
      url: p.url,
      draft: p.isDraft,
      checks: rollupChecks(p.commits?.nodes[0]?.commit.statusCheckRollup?.state),
    })),
    updated: Date.parse(i.updatedAt),
    repo: slug,
    tabName: `${repoName(slug)}#${i.number}`,
    task: [
      `Work on GitHub issue ${slug}#${i.number}: ${i.title}`,
      i.url,
      `Read it first with \`gh issue view ${i.number} -R ${slug} --comments\`.`,
    ].join("\n"),
  };
}
function sinceDate(days, now = Date.now()) {
  return new Date(now - days * 864e5).toISOString().slice(0, 10);
}

// .config/herdr-app/src/shared/github.ts
var ISSUE = `id number title url state stateReason updatedAt repository { nameWithOwner }
  assignees(first: 5) { nodes { login } } labels(first: 10) { nodes { name color } }
  comments { totalCount } milestone { title }
  closedByPullRequestsReferences(first: 5, includeClosedPrs: false) {
    nodes { number title url isDraft commits(last: 1) { nodes { commit { statusCheckRollup { state } } } } } }`;
var projectsOffUntil = 0;
async function projectStatuses(ids) {
  const out = /* @__PURE__ */ new Map();
  if (!ids.length || Date.now() < projectsOffUntil) return out;
  try {
    const data = await graphql(
      `query { nodes(ids: ${JSON.stringify(ids)}) { ... on Issue { id
        projectItems(first: 5) { nodes { fieldValueByName(name: "Status") {
          ... on ProjectV2ItemFieldSingleSelectValue { name } } } } } } }`,
      {},
    );
    for (const n of data.nodes) {
      const status = n?.projectItems?.nodes.map((p) => p.fieldValueByName?.name).find(Boolean);
      if (n?.id && status) out.set(n.id, status);
    }
  } catch {
    projectsOffUntil = Date.now() + 10 * 6e4;
  }
  return out;
}
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
async function loadIssues(scope, space) {
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
    `query($open: String!, $closed: String!, $n: Int!) {
      open: search(query: $open, type: ISSUE, first: $n) { nodes { ... on Issue { ${ISSUE} } } }
      closed: search(query: $closed, type: ISSUE, first: $n) { nodes { ... on Issue { ${ISSUE} } } }
    }`,
    {
      open: `${filter} is:issue is:open sort:updated-desc`,
      closed: `${filter} is:issue is:closed closed:>=${sinceDate(config.github.closedDays)} sort:updated-desc`,
      n: config.github.limit,
    },
  );
  const nodes = [...data.open.nodes, ...data.closed.nodes].filter((n) => n && "number" in n);
  const projects = await projectStatuses(
    data.open.nodes.map((n) => n?.id).filter((id) => Boolean(id)),
  );
  return { items: nodes.map((n) => issueItem(n, (n.id && projects.get(n.id)) || null)), caption };
}

// .config/herdr-app/src/shared/forgejo-model.ts
function checksOf(state) {
  if (state === "success") return "passing";
  if (state === "failure" || state === "error") return "failing";
  if (state === "pending" || state === "warning") return "pending";
  return "none";
}

// .config/herdr-app/src/shared/work-model.ts
function refOf(item) {
  const n = /^#(\d+)$/.exec(item.key);
  if (n) return { number: Number(n[1]) };
  return /^[A-Z][A-Z0-9_]*-\d+$/i.test(item.key) ? { key: item.key } : null;
}
var escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function keyIn(text, key) {
  return new RegExp(`(^|[^A-Za-z0-9])${escape(key)}(?![0-9])`, "i").test(text);
}
function branchNames(name, ref) {
  if ("key" in ref) return keyIn(name, ref.key);
  const n = String(ref.number);
  return name
    .split(/[/_-]+/)
    .some((part) => part === n || new RegExp(`^(issues?|gh|fj|#)#?${n}$`, "i").test(part));
}
function mentions(text, number) {
  return new RegExp(`(^|[^\\w&/#])#${number}(?![0-9])`).test(text);
}
function pullNames(p, ref) {
  if (branchNames(p.head, ref)) return true;
  const text = `${p.title}
${p.body}`;
  return "key" in ref ? keyIn(text, ref.key) : mentions(text, ref.number);
}
var toPull = (p) => ({
  number: p.number,
  title: p.title,
  url: p.url,
  draft: p.draft,
  ...(p.checks ? { checks: p.checks } : {}),
});
function attachWork(items, work) {
  return items.map((item) => {
    const ref = refOf(item);
    const repo = item.repo ? work.get(item.repo.toLowerCase()) : void 0;
    if (!ref || !repo) return withWorkStatus(item);
    const pulls = /* @__PURE__ */ new Map();
    for (const p of item.pulls ?? []) pulls.set(p.number, toPull(p));
    for (const p of repo.pulls) if (pullNames(p, ref)) pulls.set(p.number, toPull(p));
    const heads = new Set(repo.pulls.filter((p) => pulls.has(p.number)).map((p) => p.head));
    const byName = /* @__PURE__ */ new Map();
    for (const b of item.branches ?? []) byName.set(b.name, b);
    for (const b of repo.branches)
      if (branchNames(b.name, ref) && !byName.has(b.name)) byName.set(b.name, b);
    const branches = [...byName.values()].filter((b) => !heads.has(b.name));
    return withWorkStatus({
      ...item,
      pulls: [...pulls.values()].sort((a, b) => a.number - b.number),
      branches,
    });
  });
}
function withWorkStatus(item) {
  if (item.column === "done" || item.status !== "Open") return item;
  const pulls = item.pulls ?? [];
  if (pulls.some((p) => !p.draft)) return { ...item, status: "In review", column: "progress" };
  if (pulls.length || item.branches?.length)
    return { ...item, status: "In progress", column: "progress" };
  return item;
}

// .config/herdr-app/src/shared/work.ts
var MAX_REPOS = 20;
var GH_WORK = `fragment work on Repository {
  refs(refPrefix: "refs/heads/", first: 100) { nodes { name } }
  pullRequests(states: OPEN, first: 50, orderBy: { field: UPDATED_AT, direction: DESC }) {
    nodes { number title url isDraft headRefName body
      commits(last: 1) { nodes { commit { statusCheckRollup { state } } } } } }
}`;
var branchPath = (name) => name.split("/").map(encodeURIComponent).join("/");
function ghRepoWork(slug, repo) {
  return {
    branches: repo.refs.nodes.map((b) => ({
      name: b.name,
      url: `https://github.com/${slug}/tree/${branchPath(b.name)}`,
    })),
    pulls: repo.pullRequests.nodes.map((p) => ({
      number: p.number,
      title: p.title,
      url: p.url,
      draft: p.isDraft,
      head: p.headRefName,
      body: p.body ?? "",
      checks: rollupChecks(p.commits?.nodes[0]?.commit.statusCheckRollup?.state),
    })),
  };
}
async function githubBatch(slugs) {
  const vars = {};
  const decl = [];
  const parts = [];
  slugs.forEach((slug, i) => {
    const cut = slug.indexOf("/");
    vars[`o${i}`] = slug.slice(0, cut);
    vars[`n${i}`] = slug.slice(cut + 1);
    decl.push(`$o${i}: String!, $n${i}: String!`);
    parts.push(`r${i}: repository(owner: $o${i}, name: $n${i}) { ...work }`);
  });
  const data = await graphql(
    `query(${decl.join(", ")}) { ${parts.join("\n")} }
${GH_WORK}`,
    vars,
  );
  const out = /* @__PURE__ */ new Map();
  slugs.forEach((slug, i) => {
    const repo = data[`r${i}`];
    if (repo) out.set(slug.toLowerCase(), ghRepoWork(slug, repo));
  });
  return out;
}
async function forgejoWork(fj, slug) {
  const names = [];
  for (let page = 1; page <= 3; page++) {
    const list = await fj.get(`/repos/${slug}/branches?limit=50&page=${page}`);
    names.push(...list.map((b) => b.name));
    if (list.length < 50) break;
  }
  const pulls = await fj.get(`/repos/${slug}/pulls?state=open&limit=50`);
  return {
    branches: names.map((name) => ({
      name,
      url: `${fj.base}/${slug}/src/branch/${branchPath(name)}`,
    })),
    pulls: pulls.map((p) => ({
      number: p.number,
      title: p.title.replace(/^(WIP|Draft):\s*/i, ""),
      url: p.html_url,
      draft: Boolean(p.draft) || /^(WIP|Draft):/i.test(p.title),
      head: p.head?.ref ?? "",
      body: p.body ?? "",
      sha: p.head?.sha,
    })),
  };
}
async function withWork(items, targets, fj) {
  const seen = /* @__PURE__ */ new Set();
  const unique = targets
    .filter((t) => {
      const key = `${t.provider}:${t.slug.toLowerCase()}`;
      if (seen.has(key) || !t.slug.includes("/")) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_REPOS);
  const work = /* @__PURE__ */ new Map();
  const failed = [];
  const github = unique.filter((t) => t.provider === "github").map((t) => t.slug);
  const jobs = [];
  if (github.length) {
    jobs.push(
      githubBatch(github)
        .catch(async () => {
          const each = /* @__PURE__ */ new Map();
          await Promise.all(
            github.map((slug) =>
              githubBatch([slug])
                .then((m) => m.forEach((v, k) => each.set(k, v)))
                .catch(() => failed.push(slug)),
            ),
          );
          return each;
        })
        .then((m) => m.forEach((v, k) => work.set(k, v))),
    );
  }
  for (const t of unique.filter((t2) => t2.provider === "forgejo")) {
    if (!fj) continue;
    jobs.push(
      forgejoWork(fj, t.slug)
        .then((w) => void work.set(t.slug.toLowerCase(), w))
        .catch(() => void failed.push(t.slug)),
    );
  }
  await Promise.all(jobs);
  const attached = attachWork(items, work);
  if (fj) await forgejoChecks(fj, attached, work);
  return {
    items: attached,
    warning: failed.length
      ? `Couldn't read branches and pull requests of ${failed.join(", ")}`
      : void 0,
  };
}
function targetsFor(items, provider) {
  return items.filter((i) => i.repo).map((i) => ({ provider, slug: i.repo }));
}
async function forgejoChecks(fj, items, work) {
  const wanted = /* @__PURE__ */ new Map();
  for (const item of items) {
    const repo = item.repo?.toLowerCase();
    const w = repo ? work.get(repo) : void 0;
    if (!w || !item.repo) continue;
    for (const p of item.pulls ?? []) {
      const sha = w.pulls.find((r) => r.number === p.number)?.sha;
      if (sha && !p.checks) wanted.set(`${repo}#${p.number}`, { slug: item.repo, sha });
    }
  }
  const found = /* @__PURE__ */ new Map();
  await Promise.all(
    [...wanted].slice(0, 30).map(async ([key, { slug, sha }]) => {
      const s = await fj.get(`/repos/${slug}/commits/${sha}/status`).catch(() => null);
      if (s) found.set(key, checksOf(s.state));
    }),
  );
  for (const item of items) {
    for (const p of item.pulls ?? []) {
      const checks = found.get(`${item.repo?.toLowerCase()}#${p.number}`);
      if (checks) p.checks = checks;
    }
  }
}

// .config/herdr-app/src/mods/mc-github-issues/main.ts
var GithubIssues = class extends BoardView {
  source() {
    return "issues";
  }
  placeholder() {
    return "Search GitHub issues";
  }
  async fetch(scope, space) {
    const loaded = await loadIssues(scope, space);
    if (!loaded.items?.length) return loaded;
    const { items, warning } = await withWork(
      loaded.items,
      targetsFor(loaded.items, "github"),
      null,
    );
    return { ...loaded, items, warning: warning ?? loaded.warning };
  }
};
export { GithubIssues as default };
