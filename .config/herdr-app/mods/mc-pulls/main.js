// Generated from src/mods/mc-pulls/main.ts and its imports by `pnpm build:herdr`. Edit the sources, not this file.
// .config/herdr-app/src/mods/mc-pulls/main.ts
import { div as div4, svg as svg4 } from "gpui-kit";
import { h_flex as h_flex4, v_flex as v_flex4 } from "gpui-base";

// .config/herdr-app/src/shared/board.ts
import { div as div3, image as image2, svg as svg3 } from "gpui-kit";
import { h_flex as h_flex3, v_flex as v_flex3 } from "gpui-base";
import { knownAgents as knownAgents2 } from "herdr";

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
  return value;
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
  const dir = `${appHome2()}/mods/mc-pulls/icons`;
  return (async () => {
    await exec4("mkdir", ["-p", dir]);
    for (const [name, svg5] of Object.entries(ICONS)) {
      const path = `${dir}/${name}.svg`;
      const now = await readTextFile2(path).catch(() => null);
      if (now !== svg5) await writeTextFile2(path, svg5, now).catch(() => null);
    }
  })().catch(() => {
    installing = null;
  });
}
function asset(name) {
  installing ??= install();
  return `mods/mc-pulls/icons/${name}.svg`;
}

// .config/herdr-app/src/shared/ui.ts
var chromeIcon = (name) => `mods/workspace-chrome/${name}.svg`;
var stopPress = (_e, cx) => cx.stop_propagation();
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
function agentButton(id, tooltip, onClick, program, t) {
  const icon = program?.icon
    ? program.tint
      ? svg3(program.icon).size(15).text_color(t.foreground)
      : image2(program.icon).size(15)
    : svg3(asset("agent")).size(15).text_color(t.foreground);
  return div3()
    .id(id)
    .size(26)
    .flex_none()
    .flex()
    .items_center()
    .justify_center()
    .rounded(6)
    .cursor_pointer()
    .hover((s) => s.bg(t.hover))
    .on_mouse_down("left", stopPress)
    .on_click(onClick)
    .tooltip(tooltip)
    .child(icon);
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
  return Promise.all(pulls.map((p) => detail(fj, slug, p, viewer)));
}
async function detail(fj, slug, p, viewer) {
  const [status, reviews] = await Promise.all([
    p.head?.sha ? fj.get(`/repos/${slug}/commits/${p.head.sha}/status`).catch(() => null) : null,
    fj.get(`/repos/${slug}/pulls/${p.number}/reviews`).catch(() => []),
  ]);
  return forgejoPull(p, slug, viewer, checksOf(status?.state), reviews);
}
async function forgejoViewer(fj) {
  if (!fj.token) return "";
  return (await fj.get("/user").catch(() => null))?.login ?? "";
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
  return Promise.all(
    [...seen.values()].slice(0, 30).map(async ({ slug, number }) => {
      const p = await fj.get(`/repos/${slug}/pulls/${number}`);
      return detail(fj, slug, p, viewer);
    }),
  );
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
  visible(items, query) {
    return items
      .filter((p) => matches(query, `#${p.number}`, p.title, p.slug, p.author, p.head))
      .sort((a, b) => b.updated - a.updated);
  }
  body(t, items, cx) {
    const program = useAgentProgram(cx);
    const all = this.scope() === "all";
    return v_flex4()
      .id("pulls")
      .flex_1()
      .min_h(0)
      .px(12)
      .pb(14)
      .gap(6)
      .overflow_y_scrollbar()
      .children(
        GROUPS.flatMap((g) => {
          const mine = items.filter((p) => p.group === g.id);
          if (!mine.length) return [];
          return [
            h_flex4()
              .h(26)
              .pt(4)
              .gap(7)
              .items_center()
              .text_size(12.5)
              .text_color(t.muted)
              .child(g.label)
              .child(div4().text_size(11).text_color(t.dim).child(String(mine.length))),
            ...mine.map((p) => this.row(t, p, program, all)),
          ];
        }),
      );
  }
  badge(t, icon, text, color, tooltip) {
    return h_flex4()
      .flex_none()
      .gap(4)
      .items_center()
      .text_color(color)
      .tooltip(tooltip)
      .child(svg4(icon).size(12))
      .child(text);
  }
  row(t, p, program, all) {
    const started = findTab(p.tabName);
    const checks = {
      passing: [chromeIcon("check"), "Checks", t.ansi2, "All checks passed"],
      failing: [chromeIcon("x"), "Checks", t.blocked, "Some checks failed"],
      pending: [chromeIcon("clock"), "Checks", t.working, "Checks are running"],
      none: null,
    }[p.checks];
    const review = {
      approved: ["Approved", t.ansi2],
      changes: ["Changes requested", t.blocked],
      required: ["Review required", t.working],
      none: null,
    }[p.review];
    const agentName = program?.name ?? "agent";
    return v_flex4()
      .id(`pr-${p.id}`)
      .flex_none()
      .p(12)
      .gap(7)
      .rounded(9)
      .border(1)
      .border_color(t.border)
      .bg(t.surface)
      .hover((s) => s.border_color(t.input))
      .child(
        h_flex4()
          .gap(8)
          .items_center()
          .child(
            svg4(asset(p.provider === "forgejo" ? "forgejo" : "pull-request"))
              .size(14)
              .flex_none()
              .text_color(p.draft ? t.dim : t.ansi2)
              .tooltip(p.provider === "forgejo" ? "Forgejo" : "GitHub"),
          )
          .child(
            div4()
              .id(`num-${p.id}`)
              .flex_none()
              .text_size(12)
              .text_color(t.accent)
              .cursor_pointer()
              .tooltip(p.url)
              .on_click(() => void openUrl(p.url))
              .on_mouse_down("right", (_e, cx) => {
                cx.stop_propagation();
                void copyText(p.url);
              })
              .child(`#${p.number}`),
          )
          .child(
            div4()
              .id(`title-${p.id}`)
              .flex_1()
              .min_w(0)
              .truncate()
              .text_size(13.5)
              .cursor_pointer()
              .on_click(() => void openUrl(p.url))
              .tooltip(p.title)
              .child(p.title),
          )
          .when(p.draft, (el) =>
            el.child(div4().flex_none().text_size(11).text_color(t.dim).child("Draft")),
          ),
      )
      .child(
        h_flex4()
          .gap(6)
          .text_size(11.5)
          .text_color(t.dim)
          .child(
            div4()
              .min_w(0)
              .truncate()
              .child(
                [all ? p.slug : null, `${p.head} → ${p.base}`, p.author, ago(p.updated)]
                  .filter(Boolean)
                  .join(" · "),
              ),
          ),
      )
      .child(
        h_flex4()
          .gap(12)
          .items_center()
          .text_size(11.5)
          .when(Boolean(checks), (el) => {
            const [icon, text, color, tip] = checks;
            return el.child(this.badge(t, icon, text, color, tip));
          })
          .when(Boolean(review), (el) => {
            const [text, color] = review;
            return el.child(div4().flex_none().text_color(color).child(text));
          })
          .when(p.comments + p.unresolved > 0, (el) =>
            el.child(
              this.badge(
                t,
                asset("comment"),
                p.unresolved ? `${p.unresolved} open` : String(p.comments),
                p.unresolved ? t.working : t.dim,
                `${p.comments} comments, ${p.unresolved} unresolved threads`,
              ),
            ),
          )
          .child(
            h_flex4()
              .flex_none()
              .gap(4)
              .child(div4().text_color(t.ansi2).child(`+${p.additions}`))
              .child(div4().text_color(t.ansi1).child(`−${p.deletions}`)),
          ),
      )
      .child(
        h_flex4()
          .gap(4)
          .items_center()
          .child(
            agentButton(
              `agent-${p.id}`,
              started ? `Show the ${p.tabName} tab` : `Start ${agentName} to review #${p.number}`,
              () => void startWork({ name: p.tabName, task: pullTask(p, "review"), repo: p.slug }),
              program,
              t,
            ),
          )
          .children(
            ACTIONS.map((a) =>
              div4()
                .id(`${a.id}-${p.id}`)
                .h(24)
                .px(8)
                .flex()
                .items_center()
                .rounded(6)
                .text_size(12)
                .cursor_pointer()
                .text_color(t.muted)
                .border(1)
                .border_color(t.border)
                .hover((s) => s.bg(t.hover).text_color(t.foreground))
                .tooltip(
                  started
                    ? `Show the ${p.tabName} tab`
                    : `Start ${agentName}: ${a.label.toLowerCase()}`,
                )
                .on_click(
                  () => void startWork({ name: p.tabName, task: pullTask(p, a.id), repo: p.slug }),
                )
                .child(a.label),
            ),
          )
          .child(div4().flex_1())
          .when(Boolean(started), (el) => el.child(div4().size(6).rounded(3).bg(t.working)))
          .child(
            iconButton(
              `open-${p.id}`,
              asset("external"),
              "Open in browser",
              () => void openUrl(p.url),
              { iconSize: 13 },
            ),
          ),
      );
  }
};
export { Pulls as default };
