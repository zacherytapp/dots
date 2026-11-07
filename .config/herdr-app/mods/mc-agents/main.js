// Generated from src/mods/mc-agents/main.ts and its imports by `pnpm build:herdr`. Edit the sources, not this file.
// .config/herdr-app/src/mods/mc-agents/main.ts
import { div as div2, svg as svg2, View } from "gpui-kit";
import { h_flex as h_flex2, v_flex as v_flex2, InputState } from "gpui-base";
import {
  agents,
  home,
  layout,
  notify as notify2,
  panes as panes3,
  playSound,
  run as run2,
  setAgentOrder,
  setShared,
  shared,
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
  knownAgents,
  notify,
  panes as panes2,
  run,
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
  const dir = `${appHome2()}/mods/mc-agents/icons`;
  return (async () => {
    await exec4("mkdir", ["-p", dir]);
    for (const [name, svg3] of Object.entries(ICONS)) {
      const path = `${dir}/${name}.svg`;
      const now = await readTextFile2(path).catch(() => null);
      if (now !== svg3) await writeTextFile2(path, svg3, now).catch(() => null);
    }
  })().catch(() => {
    installing = null;
  });
}
function asset(name) {
  installing ??= install();
  return `mods/mc-agents/icons/${name}.svg`;
}

// .config/herdr-app/src/shared/ui.ts
var chromeIcon = (name) => `mods/workspace-chrome/${name}.svg`;
var stopPress = (_e, cx) => cx.stop_propagation();
var alpha = (color, a) =>
  color && /^#[0-9a-f]{6}$/i.test(color) ? `${color}${a}` : (color ?? "#00000000");
function programIcon(p, size, color) {
  if (!p?.icon) return null;
  return p.tint
    ? svg(p.icon).size(size).flex_none().text_color(color)
    : image(p.icon).w(size).h(size).flex_none();
}
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
function statusMark(status, compact = false) {
  const t = theme();
  if (status === "working") {
    return svg(chromeIcon("spinner")).size(12).mx(1).flex_none().text_color(t.working).spin(900);
  }
  if (status === "blocked") {
    return compact
      ? div().size(7).mx(3).flex_none().rounded(4).bg(t.blocked)
      : div()
          .flex_none()
          .px(6)
          .h(18)
          .rounded(5)
          .bg(alpha(t.blocked, "26"))
          .text_size(10.5)
          .font_semibold()
          .text_color(t.blocked)
          .flex()
          .items_center()
          .child("Needs you");
  }
  if (status === "done") return div().size(7).mx(3).flex_none().rounded(4).bg(t.done);
  if (status === "idle")
    return div()
      .size(7)
      .mx(3)
      .flex_none()
      .rounded(4)
      .border(1.5)
      .border_color(t.idle ?? t.dim);
  return div().size(7).mx(3).flex_none();
}
function sectionHeader(id, label, count, open, onToggle, trailing = []) {
  const t = theme();
  return h_flex()
    .id(id)
    .h(34)
    .flex_none()
    .pl(10)
    .pr(8)
    .gap(6)
    .items_center()
    .text_size(12.5)
    .child(
      h_flex()
        .id(`${id}-fold`)
        .flex_1()
        .min_w(0)
        .h_full()
        .gap(7)
        .items_center()
        .cursor_pointer()
        .text_color(t.muted)
        .hover((s) => s.text_color(t.foreground))
        .on_click((_e, cx) => onToggle(cx))
        .child(
          svg(chromeIcon(open ? "chevron-down" : "chevron-right"))
            .size(12)
            .flex_none(),
        )
        .child(div().font_medium().text_color(t.foreground).child(label))
        .when(count !== null, (el) =>
          el.child(div().text_size(11.5).text_color(t.dim).child(String(count))),
        ),
    )
    .children(trailing);
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
function jobStatus(state) {
  if (state === "working") return "working";
  if (state === "blocked") return "blocked";
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
    const r = await exec6("sh", ["-c", READER2], { on: machine ?? void 0 });
    return parseJobs(r.stdout, machine);
  } catch {
    return [];
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
function liveStatus(title, job) {
  if (job?.state === "blocked") return "blocked";
  return titleMark(title) ?? (job ? jobStatus(job.state) : "idle");
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
    if (r.guessed) r.status = liveStatus(rawTitle.get(r.address), job);
  };
  const titles = (r) => [rawTitle.get(r.address), r.title];
  for (const r of nativeRows) attach(r, matchJob(jobs, r.machine, r.cwd, titles(r), taken));
  const left = nativeRows.filter((r) => !r.job && r.cwd);
  for (const r of left) {
    const alone = left.filter((o) => o.machine === r.machine && o.cwd === r.cwd).length === 1;
    if (alone) attach(r, matchJob(jobs, r.machine, r.cwd, titles(r), taken, true));
  }
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
    status: jobStatus(j.state),
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
  const WEEK = 7 * 864e5;
  const openJobs = jobs.filter((j) => !CLOSED.has(j.state) && !shown.has(j));
  const recent = (j) => now - j.updated < WEEK;
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
  const needsYou = all.filter((r) => r.status === "blocked" && !stale.has(r.address)).length;
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
  const inside = (f) => job.cwd === f || job.cwd.startsWith(`${f.replace(/\/+$/, "")}/`);
  const space = spaces3().find(
    (s) => (s.machine ?? null) === job.machine && spaceFolders(s).some(inside),
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
    this.lastStatus = null;
    this.drawnKey = "";
    cx.timer.every(1e3, (cx2) => {
      if (this.liveKey() !== this.drawnKey) cx2.notify();
    });
    this.readJobs(null, cx);
    this.readRemoteJobs(cx);
    this.watchJobs(cx);
    cx.timer.every(LOCAL_JOBS_MS, (cx2) => this.readJobs(null, cx2));
    cx.timer.every(REMOTE_JOBS_MS, (cx2) => this.readRemoteJobs(cx2));
    cx.timer.every(15e3, (cx2) => this.readContext(cx2));
    cx.timer.after(1500, (cx2) => this.readContext(cx2));
  }
  /**
   * What each pane's state is read from: its reported status, else its title's spinner or still
   * mark. A title change alone may not redraw a mod, so a 1 s look compares this to what was drawn
   * and redraws only when an agent would change state (and then notifies at once if it waits).
   */
  liveKey() {
    return panes3()
      .map((p) => `${p.terminal}:${p.status ?? titleMark(p.title) ?? ""}`)
      .join("|");
  }
  mode() {
    return shared("mc.agents.mode") === "spaces" ? "spaces" : "priority";
  }
  open() {
    return shared(KEYS.agentsFolded) !== true;
  }
  readContext(cx) {
    if (this.reading || !this.open()) return;
    this.reading = true;
    const rows = this.rows.filter((r) => r.depth === 0);
    cx.spawn(async (cx2) => {
      try {
        this.readings = await readContexts(rows);
      } finally {
        this.reading = false;
        cx2.notify();
      }
    });
  }
  /** Reads this computer's jobs the moment Claude Code writes one (state.json). */
  watchJobs(cx) {
    const dir = `${home()}/.claude/jobs`;
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
        this.publishJobs(cx);
      }
    for (const m of live) this.readJobs(m, cx);
  }
  /** Reads one machine's jobs; a read asked for mid-read runs again right after it. */
  readJobs(machine, cx) {
    const key = machine ?? "";
    if (this.jobsBusy.has(key)) {
      this.jobsAgain.add(key);
      return;
    }
    this.jobsBusy.add(key);
    cx.spawn(async (cx2) => {
      try {
        do {
          this.jobsAgain.delete(key);
          this.jobsBy.set(key, await readJobsOn(machine));
          this.publishJobs(cx2);
        } while (this.jobsAgain.has(key));
      } finally {
        this.jobsBusy.delete(key);
      }
    });
  }
  /** Redraws only when a job's state, detail or time changed. */
  publishJobs(cx) {
    const jobs = [...this.jobsBy.values()].flat();
    const key = (j) => `${j.machine}/${j.id}/${j.state}/${j.detail}/${j.updated}`;
    if (jobs.map(key).join("\n") === this.jobs.map(key).join("\n")) return;
    this.jobs = jobs;
    cx.notify();
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
    if (r.native && r.pane) run2("pane.focus", { pane: r.pane });
    else if (r.job) attachJob(r.job);
    else run2("terminal.peek", { terminal: r.address });
  }
  row(t, r) {
    const pic =
      programIcon(r.program, 16, t.foreground) ??
      (r.job ? svg2(asset("agent")).size(16).text_color(t.muted) : null);
    if (r.depth > 0) {
      return h_flex2()
        .id(`ag-${r.address}`)
        .h(26)
        .flex_none()
        .pl(14 + r.depth * 14)
        .pr(8)
        .gap(8)
        .items_center()
        .rounded(7)
        .text_size(12.5)
        .cursor_pointer()
        .hover((s) => s.bg(t.hover))
        .on_click(() => this.focus(r))
        .child(
          div2()
            .w(8)
            .h(12)
            .flex_none()
            .border_l(1.5)
            .border_b(1.5)
            .rounded_bl(5)
            .border_color(t.input)
            .mt(-6),
        )
        .when(Boolean(pic), (el) => el.child(programIcon(r.program, 13, t.foreground)))
        .child(div2().flex_1().min_w(0).truncate().text_color(t.muted).child(r.title))
        .child(statusMark(r.status, true));
    }
    const since = r.job && !r.pane ? r.job.updated : this.changed[r.address]?.at;
    const reading = this.readings.get(r.address);
    const hovered = this.hovered === r.address;
    const where =
      [r.spaceName, r.machine, r.job && !r.pane ? "background" : null]
        .filter(Boolean)
        .join(" · ") || "Outside spaces";
    const idle = r.status === "idle" && !r.focused;
    return v_flex2()
      .id(`ag-${r.address}`)
      .flex_none()
      .px(8)
      .py(6)
      .gap(2)
      .rounded(8)
      .cursor_pointer()
      .when(r.focused, (el) => el.bg(t.selected))
      .hover((s) => s.bg(t.hover))
      .on_hover((over, cx) => {
        if (over) this.hovered = r.address;
        else if (this.hovered === r.address) this.hovered = null;
        cx.notify();
      })
      .on_click(() => this.focus(r))
      .child(
        h_flex2()
          .gap(8)
          .items_center()
          .child(pic ? div2().w(16).flex_none().child(pic) : div2().w(16).flex_none())
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
              div2()
                .id(`kids-${r.address}`)
                .flex_none()
                .px(4)
                .rounded(4)
                .text_size(11)
                .text_color(t.dim)
                .hover((s) => s.bg(t.hover).text_color(t.foreground))
                .on_click((_e, cx) => {
                  cx.stop_propagation();
                  this.fold(r.address, cx);
                })
                .tooltip(this.folded.has(r.address) ? "Show sub-agents" : "Hide sub-agents")
                .child(`${this.folded.has(r.address) ? "▸" : "▾"} ${r.kids}`),
            ),
          )
          .when(hovered && r.native, (el) =>
            el.child(
              iconButton(
                `pin-${r.address}`,
                chromeIcon(r.pinned ? "pin-off" : "pin"),
                r.pinned ? "Unpin" : "Pin to the top",
                (_e, cx) => {
                  cx.stop_propagation();
                  run2("terminal.pin", { terminal: r.address, pinned: !r.pinned });
                  this.hovered = null;
                  cx.notify();
                },
                { size: 20, iconSize: 12 },
              ),
            ),
          )
          .child(statusMark(r.status, true)),
      )
      .child(
        h_flex2()
          .pl(24)
          .gap(6)
          .items_center()
          .text_size(11.5)
          .text_color(t.dim)
          .child(div2().flex_1().min_w(0).truncate().child(where))
          .when(Boolean(since), (el) =>
            el.child(
              div2()
                .flex_none()
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
            .text_size(11.5)
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
            .text_size(11)
            .text_color(t.dim)
            .child(div2().flex_none().child("Context"))
            .child(div2().flex_none().text_color(t.muted).child(compactNumber(tokens)))
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
      });
  }
  groupHeader(t, g) {
    const open = !this.folded.has(g.id);
    return h_flex2()
      .id(`group-${g.id}`)
      .h(26)
      .mt(4)
      .flex_none()
      .px(8)
      .gap(6)
      .items_center()
      .text_size(11.5)
      .cursor_pointer()
      .hover((s) => s.text_color(t.foreground))
      .on_click((_e, cx) => this.fold(g.id, cx))
      .child(
        div2()
          .min_w(0)
          .truncate()
          .text_color(g.tone ? (t[g.tone] ?? t.dim) : t.dim)
          .child(g.label),
      )
      .child(div2().text_color(t.dim).child(String(g.count)))
      .child(div2().flex_1())
      .when(!open, (el) => el.child(svg2(chromeIcon("chevron-right")).size(11).text_color(t.dim)));
  }
  compact(t, rows) {
    return v_flex2()
      .size_full()
      .bg(t.chrome)
      .border_t(1)
      .border_color(t.border)
      .pt(6)
      .children(
        rows
          .filter((r) => r.depth === 0)
          .map((r, i) =>
            h_flex2()
              .id(`ag-${r.address}`)
              .h(26)
              .flex_none()
              .px(8)
              .gap(4)
              .items_center()
              .hover((s) => s.bg(t.hover))
              .on_click(() => this.focus(r))
              .child(
                div2()
                  .flex_1()
                  .text_right()
                  .text_size(12)
                  .text_color(t.muted)
                  .child(String(i + 1)),
              )
              .child(statusMark(r.status, true)),
          ),
      );
  }
  render() {
    const t = theme2();
    const open = this.open();
    const mode = this.mode();
    this.drawnKey = this.liveKey();
    const model = buildModel({
      agents: agents(),
      terminals: terminals(),
      spaces: spaces3(),
      panes: panes3(),
      mode,
      query: this.search.value(),
      folded: this.folded,
      jobs: this.jobs,
    });
    this.alert(model.all);
    setAgentOrder(model.order);
    const rows = model.groups.flatMap((g) => g.rows);
    this.rows = rows;
    this.track(rows.filter((r) => r.depth === 0));
    if (narrow()) return this.compact(t, rows);
    const urgent = model.needsYou;
    const needsYou = div2()
      .flex_none()
      .px(6)
      .h(18)
      .flex()
      .items_center()
      .rounded(5)
      .bg(`${t.blocked}26`)
      .text_size(10.5)
      .font_semibold()
      .text_color(t.blocked)
      .child(`${urgent} need${urgent === 1 ? "s" : ""} you`);
    const toggle = (m, icon, label) =>
      iconButton(`mode-${m}`, chromeIcon(icon), label, () => setShared("mc.agents.mode", m), {
        active: mode === m,
        size: 24,
        iconSize: 13,
      });
    return v_flex2()
      .id("root")
      .size_full()
      .min_h(0)
      .bg(t.chrome)
      .border_t(1)
      .border_color(t.border)
      .text_size(13)
      .on_size_change((size) => {
        const h = Math.round(size.height);
        if (shared(KEYS.agentsHeight) !== h) setShared(KEYS.agentsHeight, h);
      })
      .child(
        sectionHeader(
          "agents-header",
          "Agents",
          model.total,
          open,
          () => setShared(KEYS.agentsFolded, open),
          [
            ...(urgent ? [needsYou] : []),
            ...(open
              ? [
                  toggle("priority", "clock", "Sort by priority"),
                  toggle("spaces", "layers", "Group by space"),
                ]
              : []),
          ],
        ),
      )
      .when(open, (el) =>
        el
          .child(
            h_flex2().flex_none().h(38).px(10).pb(8).child(searchBox("agent-search", this.search)),
          )
          .child(
            v_flex2()
              .id("agent-list")
              .flex_1()
              .min_h(0)
              .px(6)
              .pb(10)
              .gap(1)
              .overflow_y_scrollbar()
              .when(model.total === 0, (e) =>
                e.child(
                  div2()
                    .px(8)
                    .py(6)
                    .text_size(12)
                    .text_color(t.dim)
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
