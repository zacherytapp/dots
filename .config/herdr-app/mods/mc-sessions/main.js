// Generated from src/mods/mc-sessions/main.ts and its imports by `pnpm build:herdr`. Edit the sources, not this file.
// .config/herdr-app/src/mods/mc-sessions/main.ts
import { div as div4 } from "gpui-kit";
import { h_flex as h_flex4, v_flex as v_flex4 } from "gpui-base";
import { home, run as run3, spaces as spaces3 } from "herdr";

// .config/herdr-app/src/shared/board.ts
import { div as div3, image as image2, svg as svg3 } from "gpui-kit";
import { h_flex as h_flex3, v_flex as v_flex3 } from "gpui-base";
import { knownAgents as knownAgents2 } from "herdr";

// .config/herdr-app/src/shared/config.ts
import { appHome, exec, readTextFile, writeTextFile } from "herdr";

// .config/herdr-app/src/shared/util.ts
function baseName(path) {
  const trimmed = (path ?? "").replace(/\/+$/, "");
  return trimmed.split("/").pop() || trimmed || "/";
}
function tildify(path, home2) {
  if (!path) return "";
  if (home2 && (path === home2 || path.startsWith(`${home2}/`)))
    return `~${path.slice(home2.length)}`;
  return path;
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
function spaceFolders(space) {
  const tabs = new Set(space.tabs.map((t) => t.id));
  const all = panes()
    .filter((p) => tabs.has(p.tab) && p.cwd)
    .map((p) => p.cwd);
  if (space.folder) all.push(space.folder);
  return [...new Set(all)];
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

// .config/herdr-app/src/shared/launch.ts
function findTab(name) {
  for (const space of spaces2()) {
    const tab = space.tabs.find((t) => t.named && t.name === name);
    if (tab) return { space, tab: tab.id };
  }
  return null;
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
  const dir = `${appHome2()}/mods/mc-sessions/icons`;
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
  return `mods/mc-sessions/icons/${name}.svg`;
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

// .config/herdr-app/src/mods/mc-sessions/collect.ts
import { exec as exec5, machines } from "herdr";

// .config/herdr-app/src/mods/mc-sessions/parse.ts
function parseListing(stdout) {
  return stdout
    .split("\n")
    .map((line) => line.split("	"))
    .filter((p) => p.length === 3 && p[2].endsWith(".jsonl"))
    .map(([t, s, path]) => ({ path, mtime: Math.round(Number(t) * 1e3), size: Number(s) }))
    .filter((e) => Number.isFinite(e.mtime));
}
function splitFiles(stdout) {
  const out = /* @__PURE__ */ new Map();
  for (const block of stdout.split("").slice(1)) {
    const nl = block.indexOf("\n");
    if (nl > 0) out.set(block.slice(0, nl), block.slice(nl + 1));
  }
  return out;
}
var isNoise = (s) =>
  /^<(command|local-command|system-reminder|bash-|task-notification)/.test(s.trim());
function parseTail(entry, machine, text) {
  let custom = "";
  let agentName = "";
  let aiTitle = "";
  let prompt = "";
  let cwd = "";
  let branch = "";
  let last = 0;
  let continued = false;
  for (const line of text.split("\n")) {
    if (!line.startsWith("{")) continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    const type = row.type;
    if (type === "custom-title" && typeof row.customTitle === "string") custom = row.customTitle;
    else if (type === "agent-name" && typeof row.agentName === "string") agentName = row.agentName;
    else if (type === "ai-title" && typeof row.aiTitle === "string") aiTitle = row.aiTitle;
    else if (
      type === "last-prompt" &&
      typeof row.lastPrompt === "string" &&
      !isNoise(row.lastPrompt)
    )
      prompt = row.lastPrompt;
    else if (type === "continued-in") continued = true;
    if (typeof row.cwd === "string" && row.cwd) cwd = row.cwd;
    if (typeof row.gitBranch === "string" && row.gitBranch && row.gitBranch !== "HEAD")
      branch = row.gitBranch;
    if (typeof row.timestamp === "string") {
      const t = Date.parse(row.timestamp);
      if (Number.isFinite(t) && t > last) last = t;
    }
  }
  const id =
    entry.path
      .split("/")
      .pop()
      ?.replace(/\.jsonl$/, "") ?? entry.path;
  const oneLine = (s) => s.replace(/\s+/g, " ").trim();
  const fromPrompt = oneLine(prompt).slice(0, 90);
  return {
    id,
    machine,
    path: entry.path,
    cwd: cwd || dirFromProject(entry.path),
    branch,
    title: oneLine(custom || agentName || aiTitle) || fromPrompt || "Untitled session",
    updated: last || entry.mtime,
    size: entry.size,
    continued,
  };
}
function dirFromProject(path) {
  const dir = path.split("/").slice(-2, -1)[0] ?? "";
  return dir.startsWith("-") ? dir.replace(/-/g, "/") : "";
}
function within(cwd, folder) {
  if (!cwd || !folder) return false;
  const f = folder.replace(/\/+$/, "");
  if (cwd === f) return true;
  const broad = f.split("/").filter(Boolean).length <= 2;
  return !broad && cwd.startsWith(`${f}/`);
}
function dayOf(ms, now = Date.now()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const today = start.getTime();
  if (ms >= today) return "Today";
  if (ms >= today - 864e5) return "Yesterday";
  if (ms >= today - 6 * 864e5) return "This week";
  return "Earlier";
}

// .config/herdr-app/src/mods/mc-sessions/collect.ts
var LIST =
  'find "$HOME/.claude/projects" -mindepth 2 -maxdepth 2 -name "*.jsonl" -size +1k -mtime "-$1" -printf "%T@\\t%s\\t%p\\n" 2>/dev/null | sort -rn | head -n "$2"';
var TAILS = 'for f in "$@"; do printf "\\036%s\\n" "$f"; tail -c 98304 "$f"; printf "\\n"; done';
var BATCH = 12;
var cache3 = /* @__PURE__ */ new Map();
async function onMachine(machine, days, limit) {
  const on = machine ?? void 0;
  const list = await exec5("sh", ["-c", LIST, "sh", String(days), String(limit)], { on });
  const entries = parseListing(list.stdout);
  const key = (e) => `${machine ?? ""}\0${e.path}`;
  const stale = entries.filter((e) => {
    const hit = cache3.get(key(e));
    return !hit || hit.size !== e.size || hit.mtime !== e.mtime;
  });
  for (let i = 0; i < stale.length; i += BATCH) {
    const batch = stale.slice(i, i + BATCH);
    const r = await exec5("sh", ["-c", TAILS, "sh", ...batch.map((e) => e.path)], { on });
    const texts = splitFiles(r.stdout);
    for (const e of batch) {
      cache3.set(key(e), {
        size: e.size,
        mtime: e.mtime,
        session: parseTail(e, machine, texts.get(e.path) ?? ""),
      });
    }
  }
  return entries.map((e) => cache3.get(key(e))?.session).filter((s) => Boolean(s));
}
async function collect() {
  const config = (await loadConfig()).sessions;
  const remote = machines()
    .filter((m) => m.name && m.layout !== "unavailable")
    .map((m) => m.name);
  const failed = [];
  const results = await Promise.all(
    [null, ...remote].map((m) =>
      onMachine(m, config.days, config.limit).catch((e) => {
        failed.push({ machine: m ?? "this computer", why: String(e?.message ?? e) });
        return [];
      }),
    ),
  );
  const sessions = results
    .flat()
    .filter((s) => !s.continued)
    .sort((a, b) => b.updated - a.updated);
  return { sessions, failed };
}

// .config/herdr-app/src/mods/mc-sessions/main.ts
var DAYS = ["Today", "Yesterday", "This week", "Earlier"];
function spaceFor(s) {
  const mine = spaces3().filter((sp) => (sp.machine ?? null) === s.machine);
  return (
    mine.find((sp) => sp.active && spaceFolders(sp).some((f) => within(s.cwd, f))) ??
    mine.find((sp) => spaceFolders(sp).some((f) => within(s.cwd, f))) ??
    null
  );
}
var tabNameOf = (s) => (s.title.length > 40 ? `${s.title.slice(0, 39)}…` : s.title);
async function resume(s) {
  const existing = findTab(tabNameOf(s));
  if (existing) {
    run3("space.select", { id: existing.space.id });
    run3("tab.select", { id: existing.tab });
    return;
  }
  const argv = [...(await loadConfig()).agent.resume, s.id];
  const space = spaceFor(s);
  if (space) {
    if (!space.active) run3("space.select", { id: space.id });
    run3("tab.new", { space: space.id, folder: s.cwd, name: tabNameOf(s), argv });
  } else {
    run3("space.new", { machine: s.machine ?? "", folder: s.cwd, argv });
  }
}
var Sessions = class extends ListView {
  source() {
    return "sessions";
  }
  noun() {
    return "sessions";
  }
  placeholder() {
    return "Search sessions";
  }
  interval() {
    return 2 * 6e4;
  }
  async fetch(scope, space) {
    const { sessions, failed } = await collect();
    this.failed = failed.map((f) => `${f.machine}: ${f.why}`).join("; ");
    if (scope === "all") return { items: sessions, caption: "All spaces · every machine" };
    if (!space) return { items: [], note: "No space is shown." };
    const folders = spaceFolders(space);
    const root = (await repoOf(space).catch(() => null))?.root;
    if (root) folders.push(root);
    const machine = space.machine ?? null;
    const items = sessions.filter(
      (s) => s.machine === machine && folders.some((f) => within(s.cwd, f)),
    );
    return {
      items,
      caption: `This space · ${space.name}`,
      note: `No Claude Code sessions in ${space.name} in the last ${(await loadConfig()).sessions.days} days.`,
    };
  }
  visible(items, query) {
    return items.filter((s) =>
      matches(query, s.title, s.cwd, s.branch, s.machine ?? "this computer", s.id),
    );
  }
  body(t, items, cx) {
    const program = useAgentProgram(cx);
    const all = this.scope() === "all";
    const now = Date.now();
    return v_flex4()
      .id("sessions")
      .flex_1()
      .min_h(0)
      .px(8)
      .pb(14)
      .gap(1)
      .overflow_y_scrollbar()
      .when(Boolean(this.failed), (el) =>
        el.child(
          div4()
            .px(6)
            .pb(6)
            .text_size(11.5)
            .text_color(t.blocked)
            .child(`Couldn't read ${this.failed}`),
        ),
      )
      .children(
        DAYS.flatMap((day) => {
          const mine = items.filter((s) => dayOf(s.updated, now) === day);
          if (!mine.length) return [];
          return [
            h_flex4()
              .h(26)
              .pt(6)
              .px(6)
              .gap(7)
              .items_center()
              .text_size(12)
              .text_color(t.muted)
              .child(day)
              .child(div4().text_size(11).text_color(t.dim).child(String(mine.length))),
            ...mine.map((s) => this.row(t, s, program, all)),
          ];
        }),
      );
  }
  row(t, s, program, all) {
    const open = findTab(tabNameOf(s));
    const folder = s.cwd === home() ? "~" : baseName(s.cwd);
    const where = [all || s.machine ? folder : null, s.branch, s.machine, ago(s.updated)]
      .filter(Boolean)
      .join(" · ");
    const agentName = program?.name ?? "agent";
    return h_flex4()
      .id(`session-${s.machine ?? ""}-${s.id}`)
      .flex_none()
      .px(8)
      .py(7)
      .gap(10)
      .items_center()
      .rounded(8)
      .cursor_pointer()
      .hover((st) => st.bg(t.hover))
      .tooltip(
        `${tildify(s.cwd, home())}
${s.id}`,
      )
      .on_click(() => void resume(s))
      .on_mouse_down("right", (_e, cx) => {
        cx.stop_propagation();
        void copyText(s.id);
      })
      .child(
        agentButton(
          `resume-${s.machine ?? ""}-${s.id}`,
          open ? `Show the ${tabNameOf(s)} tab` : `Resume with ${agentName}`,
          () => void resume(s),
          program,
          t,
        ),
      )
      .child(
        v_flex4()
          .flex_1()
          .min_w(0)
          .gap(2)
          .child(div4().truncate().text_size(13).text_color(t.foreground).child(s.title))
          .child(div4().truncate().text_size(11.5).text_color(t.dim).child(where)),
      )
      .when(Boolean(open), (el) => el.child(div4().size(6).rounded(3).bg(t.working)));
  }
};
export { Sessions as default };
