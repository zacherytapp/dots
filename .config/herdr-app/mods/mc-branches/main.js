// Generated from src/mods/mc-branches/main.ts and its imports by `pnpm build:herdr`. Edit the sources, not this file.
// .config/herdr-app/src/mods/mc-branches/main.ts
import { div as div3, svg as svg3 } from "gpui-kit";
import { h_flex as h_flex3, v_flex as v_flex3 } from "gpui-base";
import { exec as exec5, spaces as spaces3 } from "herdr";

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

// .config/herdr-app/src/shared/launch.ts
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
  const dir = `${appHome2()}/mods/mc-branches/icons`;
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
  return `mods/mc-branches/icons/${name}.svg`;
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

// .config/herdr-app/src/mods/mc-branches/model.ts
function kindOf(b) {
  if (b.local && b.remotes.length) return "both";
  return b.local ? "local" : "remote";
}
var FIELDS =
  "%(refname:short)%09%(upstream:short)%09%(upstream:track,nobracket)%09%(objectname)%09%(committerdate:unix)%09%(subject)";
var REF_FORMAT = FIELDS;
function parseLocal(stdout) {
  return stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [name = "", upstream = "", track = "", sha = "", date = "0", ...rest] = line.split("	");
      return {
        name,
        sha,
        upstream,
        ahead: Number(/ahead (\d+)/.exec(track)?.[1] ?? 0),
        behind: Number(/behind (\d+)/.exec(track)?.[1] ?? 0),
        gone: track === "gone",
        date: Number(date) * 1e3,
        subject: rest.join("	"),
      };
    })
    .filter((b) => b.name);
}
function parseLsRemote(stdout) {
  const out = /* @__PURE__ */ new Map();
  for (const line of stdout.split("\n")) {
    const [sha, ref] = line.trim().split(/\s+/);
    if (sha && ref?.startsWith("refs/heads/")) out.set(ref.slice(11), sha);
  }
  return out;
}
function parseRemoteRefs(stdout) {
  return new Map(parseLocal(stdout).map((b) => [b.name, b]));
}
function mergeBranches(input) {
  const names = new Set(input.local.map((b) => b.name));
  for (const r of input.remotes) for (const name of r.heads.keys()) names.add(name);
  const rows = [];
  for (const name of names) {
    if (name === "HEAD") continue;
    const local = input.local.find((b) => b.name === name) ?? null;
    const remotes = input.remotes
      .filter((r) => r.heads.has(name))
      .map((r) => ({
        remote: r.remote,
        sha: r.heads.get(name),
        same: local?.sha === r.heads.get(name),
      }));
    const seen = remotes.map((r) => input.tracking.get(`${r.remote}/${name}`)).find(Boolean);
    const web = input.remotes.find((r) => r.heads.has(name) && r.web)?.web;
    rows.push({
      id: `${input.key}:${name}`,
      name,
      current: name === input.current,
      local,
      remotes,
      pr: input.prs.get(name) ?? null,
      date: local?.date ?? seen?.date ?? 0,
      subject: local?.subject ?? seen?.subject ?? "",
      web: web ? `${web}${name.split("/").map(encodeURIComponent).join("/")}` : null,
    });
  }
  return rows.sort(
    (a, b) =>
      Number(b.current) - Number(a.current) ||
      Number(Boolean(b.pr)) - Number(Boolean(a.pr)) ||
      b.date - a.date,
  );
}

// .config/herdr-app/src/mods/mc-branches/main.ts
var FILTERS = [
  { id: "all", label: "All" },
  { id: "local", label: "Local only" },
  { id: "remote", label: "Remote only" },
  { id: "pr", label: "With PR" },
];
var LS_REMOTE =
  'GIT_TERMINAL_PROMPT=0 GIT_SSH_COMMAND="ssh -o BatchMode=yes -o ConnectTimeout=8" git ls-remote --heads "$1"';
async function githubPrs(slug) {
  const r = await exec5("gh", [
    "pr",
    "list",
    "-R",
    slug,
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,url,headRefName,isDraft",
  ]);
  if (r.code !== 0) throw new Error(r.stderr.trim() || `gh exited ${r.code}`);
  const list = JSON.parse(r.stdout);
  return new Map(
    list.map((p) => [
      p.headRefName,
      { number: p.number, title: p.title, url: p.url, draft: p.isDraft, provider: "github" },
    ]),
  );
}
async function forgejoPrs(fj, slug) {
  const list = await fj.get(`/repos/${slug}/pulls?state=open&limit=50`);
  return new Map(
    list
      .filter((p) => p.head?.ref)
      .map((p) => [
        p.head?.ref,
        {
          number: p.number,
          title: p.title,
          url: p.html_url,
          draft: Boolean(p.draft),
          provider: "forgejo",
        },
      ]),
  );
}
async function loadRepo(repo, label, fj) {
  const on = repo.machine ?? void 0;
  const cwd = repo.root;
  const git = (...args) => exec5("git", args, { cwd, on });
  const warnings = [];
  let token = null;
  const [local, current, tracking] = await Promise.all([
    git("for-each-ref", `--format=${REF_FORMAT}`, "refs/heads"),
    git("branch", "--show-current"),
    git("for-each-ref", `--format=${REF_FORMAT}`, "refs/remotes"),
  ]);
  const trackingRefs = parseRemoteRefs(tracking.stdout);
  const remotes = [];
  const prs = /* @__PURE__ */ new Map();
  await Promise.all(
    repo.remotes.map(async (remote) => {
      const name = remote.remoteName ?? "origin";
      const onForgejo = fj?.isRemote(remote) ?? false;
      const web =
        remote.host === "github.com"
          ? `https://github.com/${remote.slug}/tree/`
          : onForgejo && fj
            ? `${fj.base}/${remote.slug}/src/branch/`
            : null;
      const ls = await exec5("sh", ["-c", LS_REMOTE, "sh", name], { cwd, on }).catch(() => null);
      let heads = ls?.code === 0 ? parseLsRemote(ls.stdout) : null;
      if (!heads) {
        warnings.push(`${label}: couldn't reach ${name}, showing its last fetch`);
        heads = new Map(
          [...trackingRefs]
            .filter(([ref]) => ref.startsWith(`${name}/`))
            .map(([ref, b]) => [ref.slice(name.length + 1), b.sha]),
        );
      }
      remotes.push({ remote: name, heads, web });
      try {
        const found =
          remote.host === "github.com"
            ? await githubPrs(remote.slug)
            : onForgejo && fj
              ? await forgejoPrs(fj, remote.slug)
              : /* @__PURE__ */ new Map();
        for (const [head, pr] of found) if (!prs.has(head)) prs.set(head, pr);
      } catch (e) {
        if (e instanceof TokenError) token = e.ask;
        else warnings.push(`${label}: pull requests from ${name} unavailable`);
      }
    }),
  );
  remotes.sort((a, b) => (a.remote === "origin" ? -1 : b.remote === "origin" ? 1 : 0));
  const branches = mergeBranches({
    key: `${repo.machine ?? ""}:${cwd}`,
    current: current.stdout.trim(),
    local: parseLocal(local.stdout),
    remotes,
    tracking: trackingRefs,
    prs,
  });
  return {
    items: branches.map((b) => ({ ...b, repo: label, machine: repo.machine })),
    warnings,
    token,
  };
}
var Branches = class extends ListView {
  init(props, cx) {
    this.filter = "all";
    super.init(props, cx);
  }
  source() {
    return "branches";
  }
  noun() {
    return "branches";
  }
  placeholder() {
    return "Search branches";
  }
  interval() {
    return 3 * 6e4;
  }
  async fetch(scope, space) {
    const fj = await forgejo();
    const targets = scope === "space" ? (space ? [space] : []) : spaces3();
    if (!targets.length) return { items: [], note: "No space is shown." };
    const repos = /* @__PURE__ */ new Map();
    for (const s of targets) {
      const repo = await repoOf(s).catch(() => null);
      if (!repo?.root) continue;
      const key = `${repo.machine ?? ""}:${repo.root}`;
      const label = repo.remotes[0]?.slug ?? repo.root.split("/").pop() ?? s.name;
      if (!repos.has(key))
        repos.set(key, { repo, label: repo.machine ? `${label} · ${repo.machine}` : label });
    }
    if (!repos.size) {
      return {
        items: [],
        note:
          scope === "space"
            ? `${space?.name ?? "This space"} isn't in a git repository.`
            : "No space is in a git repository.",
      };
    }
    const results = await Promise.all(
      [...repos.values()].map(({ repo, label }) =>
        loadRepo(repo, label, fj).catch((e) => ({
          items: [],
          warnings: [`${label}: ${String(e?.message ?? e)}`],
          token: null,
        })),
      ),
    );
    const only = [...repos.values()][0];
    return {
      items: results.flatMap((r) => r.items),
      caption:
        scope === "space"
          ? `This space · ${only.label}`
          : `All spaces · ${repos.size} repositories`,
      warning: results.flatMap((r) => r.warnings).join("; "),
      token: results.find((r) => r.token)?.token ?? void 0,
    };
  }
  visible(items, query) {
    return items.filter((b) =>
      matches(query, b.name, b.subject, b.repo, b.pr ? `#${b.pr.number} ${b.pr.title}` : ""),
    );
  }
  shown(items) {
    if (this.filter === "local") return items.filter((b) => kindOf(b) === "local");
    if (this.filter === "remote") return items.filter((b) => kindOf(b) === "remote");
    if (this.filter === "pr") return items.filter((b) => b.pr);
    return items;
  }
  subbar(_t, items) {
    const count = (f) => {
      const keep = this.filter;
      this.filter = f;
      const n = this.shown(items).length;
      this.filter = keep;
      return n;
    };
    return h_flex3()
      .flex_none()
      .px(14)
      .pt(10)
      .gap(4)
      .items_center()
      .children(
        FILTERS.map((f) =>
          countChip(`filter-${f.id}`, f.label, count(f.id), this.filter === f.id, (cx) => {
            this.filter = f.id;
            cx.notify();
          }),
        ),
      );
  }
  body(t, items, _cx) {
    const shown = this.shown(items);
    const all = this.scope() === "all";
    const repos = [...new Set(shown.map((b) => b.repo))];
    return v_flex3()
      .id("branches")
      .flex_1()
      .min_h(0)
      .px(8)
      .pb(14)
      .gap(1)
      .overflow_y_scrollbar()
      .children(
        repos.flatMap((repo) => [
          ...(all
            ? [
                h_flex3()
                  .h(26)
                  .pt(6)
                  .px(6)
                  .gap(7)
                  .items_center()
                  .text_size(12)
                  .text_color(t.muted)
                  .child(repo)
                  .child(
                    div3()
                      .text_size(11)
                      .text_color(t.dim)
                      .child(String(shown.filter((b) => b.repo === repo).length)),
                  ),
              ]
            : []),
          ...shown.filter((b) => b.repo === repo).map((b) => this.row(t, b)),
        ]),
      );
  }
  pill(t, text, color, tooltip) {
    return div3()
      .flex_none()
      .px(5)
      .h(17)
      .flex()
      .items_center()
      .rounded(4)
      .border(1)
      .border_color(t.border)
      .text_size(10.5)
      .text_color(color)
      .tooltip(tooltip)
      .child(text);
  }
  row(t, b) {
    const kind = kindOf(b);
    const remoteNames = b.remotes.map((r) => r.remote).join(", ");
    const inStep = kind === "both" && b.remotes.every((r) => r.same);
    const where =
      kind === "local"
        ? this.pill(t, "local only", t.working, "Not on any remote")
        : kind === "remote"
          ? this.pill(t, "remote only", t.ansi4, `Only on ${remoteNames}`)
          : this.pill(
              t,
              inStep ? "synced" : "local + remote",
              inStep ? t.ansi2 : t.muted,
              inStep ? `Same commit on ${remoteNames}` : `On ${remoteNames}, at a different commit`,
            );
    const link = b.pr?.url ?? b.web;
    return v_flex3()
      .id(`branch-${b.id}`)
      .flex_none()
      .px(8)
      .py(6)
      .gap(3)
      .rounded(8)
      .cursor_pointer()
      .when(b.current, (el) => el.bg(t.selected))
      .hover((s) => s.bg(t.hover))
      .when(Boolean(link), (el) => el.on_click(() => void openUrl(link)))
      .on_mouse_down("right", (_e, cx) => {
        cx.stop_propagation();
        void copyText(b.name);
      })
      .tooltip(
        link
          ? `Open ${b.pr ? `#${b.pr.number}` : "on the web"} · right-click copies the name`
          : "Right-click copies the name",
      )
      .child(
        h_flex3()
          .gap(7)
          .items_center()
          .child(
            svg3(chromeIcon("git-branch"))
              .size(13)
              .flex_none()
              .text_color(b.current ? t.accent : t.dim),
          )
          .child(
            div3()
              .min_w(0)
              .truncate()
              .text_size(13)
              .text_color(b.current ? t.foreground : t.muted)
              .when(b.current, (el) => el.font_medium())
              .child(b.name),
          )
          .child(where)
          .when(Boolean(b.local?.gone), (el) =>
            el.child(this.pill(t, "upstream gone", t.blocked, "Its upstream branch was deleted")),
          )
          .child(div3().flex_1())
          .when((b.local?.ahead ?? 0) > 0, (el) =>
            el.child(
              div3().flex_none().text_size(11.5).text_color(t.ansi2).child(`↑${b.local?.ahead}`),
            ),
          )
          .when((b.local?.behind ?? 0) > 0, (el) =>
            el.child(
              div3().flex_none().text_size(11.5).text_color(t.ansi1).child(`↓${b.local?.behind}`),
            ),
          )
          .when(Boolean(b.pr), (el) => {
            const pr = b.pr;
            return el.child(
              h_flex3()
                .id(`pr-${b.id}`)
                .flex_none()
                .gap(4)
                .px(6)
                .h(20)
                .items_center()
                .rounded(5)
                .bg(t.surface)
                .text_size(11.5)
                .text_color(pr.draft ? t.dim : t.accent)
                .tooltip(`${pr.draft ? "Draft: " : ""}${pr.title}`)
                .on_click((_e, cx) => {
                  cx.stop_propagation();
                  void openUrl(pr.url);
                })
                .child(svg3(asset(pr.provider === "forgejo" ? "forgejo" : "pull-request")).size(11))
                .child(`#${pr.number}`),
            );
          })
          .when(Boolean(b.web), (el) =>
            el.child(
              iconButton(
                `web-${b.id}`,
                asset("external"),
                "Open the branch on the web",
                (_e, cx) => {
                  cx.stop_propagation();
                  void openUrl(b.web);
                },
                { size: 22, iconSize: 12 },
              ),
            ),
          ),
      )
      .when(Boolean(b.subject), (el) =>
        el.child(
          div3()
            .pl(20)
            .min_w(0)
            .truncate()
            .text_size(11.5)
            .text_color(t.dim)
            .child([b.subject, b.date ? ago(b.date) : ""].filter(Boolean).join(" · ")),
        ),
      );
  }
};
export { Branches as default };
