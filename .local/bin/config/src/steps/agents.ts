// AI agent harnesses and what the dotfiles wire into them:
//
//   claude       Claude Code (native installer) and the pinned ClaudeCodeStatusLine clone
//   herdr        herdr, plus its Claude Code integration (~/.claude/hooks/herdr-agent-state.sh)
//   agents       plannotator (binary), pi and the pi packages in .pi/agent/settings.json,
//                opencode, codex, then Matt Pocock's and plannotator's skills for each
//                harness (see installAgentSkills), then a check that the stowed skills,
//                rules and TypeScript hooks are linked and that hook-doctor finds
//                everything the hooks need
//
// ~/.claude/settings.json is a link into the repo once stowed, so nothing here
// may rewrite it; claudeStatusline only adds statusLine to a file that lacks it.

import { existsSync, readdirSync, realpathSync } from "node:fs";
import { basename, join } from "node:path";
import { note, warn } from "../lib/log.ts";
import { fetchText } from "../lib/net.ts";
import type { Context } from "../lib/context.ts";

const STATUSLINE_REPO = "https://github.com/daniel3303/ClaudeCodeStatusLine";
export const STATUSLINE_TAG = "v1.4.4";
/** Claude Code expands the ~ itself. */
export const STATUSLINE_CMD = "~/.claude/statusline/statusline.sh";

export function installClaude(ctx: Context): void {
  const { user } = ctx;
  // the statusline runs jq, awk, curl and git
  ctx.pkg.install(["jq", "gawk", "curl", "git"]);
  // native installer: ~/.local/bin/claude -> ~/.local/share/claude/versions/<v>,
  // updated by claude itself afterwards
  const bin = user.path(".local", "bin", "claude");
  if (existsSync(bin)) {
    note(`claude already installed: ${user.output(bin, ["--version"])}`);
  } else {
    user.installScript("https://claude.ai/install.sh", { shell: "bash" });
  }
  claudeStatuslineRepo(ctx);
  claudeStatuslineSettings(ctx);
}

/** Clone at the pinned tag; an older checkout moves forward, a newer one is left alone. */
function claudeStatuslineRepo(ctx: Context): void {
  const { user } = ctx;
  const dir = user.path(".claude", "statusline");
  const git = (...args: string[]) => user.output("git", ["-C", dir, ...args]);
  if (!existsSync(join(dir, ".git"))) {
    if (existsSync(dir))
      throw new Error(`${dir} exists but isn't a git clone; move it aside and re-run`);
    user.mkdir(user.path(".claude"));
    user.run("git", ["clone", "--quiet", STATUSLINE_REPO, dir]);
    const branch = git("symbolic-ref", "--short", "HEAD");
    git("checkout", "--quiet", "-B", branch, STATUSLINE_TAG);
    return;
  }
  if (
    !user.succeeds("git", ["-C", dir, "rev-parse", "-q", "--verify", `refs/tags/${STATUSLINE_TAG}`])
  ) {
    git("fetch", "--quiet", "--tags", "origin");
  }
  const want = git("rev-parse", "-q", "--verify", `${STATUSLINE_TAG}^{commit}`);
  if (git("rev-parse", "HEAD") === want) return note(`statusline already at ${STATUSLINE_TAG}`);
  if (user.succeeds("git", ["-C", dir, "merge-base", "--is-ancestor", "HEAD", STATUSLINE_TAG])) {
    git("merge", "--ff-only", "--quiet", STATUSLINE_TAG);
  } else {
    note(`statusline is ahead of ${STATUSLINE_TAG}, leaving it`);
  }
}

/** Add statusLine when settings.json has none; one pointing elsewhere is the user's choice. */
function claudeStatuslineSettings(ctx: Context): void {
  const { user } = ctx;
  const path = user.path(".claude", "settings.json");
  const want = { type: "command", command: STATUSLINE_CMD };
  const text = user.readFile(path);
  if (!text?.trim()) {
    user.mkdir(user.path(".claude"));
    user.writeFile(path, `${JSON.stringify({ statusLine: want }, null, 2)}\n`);
    return note(`created ${path}`);
  }
  const settings = JSON.parse(text) as Record<string, unknown>;
  const current = (settings.statusLine as { command?: unknown } | undefined)?.command;
  if (current === STATUSLINE_CMD) return note(`statusLine already set in ${path}`);
  if (typeof current === "string") return warn(`statusLine in ${path} runs ${current}, leaving it`);
  settings.statusLine = want;
  // through tee, so the file keeps its mode, owner and any symlink
  user.writeFile(path, `${JSON.stringify(settings, null, 2)}\n`);
  note(`added statusLine to ${path}`);
}

/** herdr installs to ~/.local/bin; its claude integration writes ~/.claude/hooks/herdr-agent-state.sh. */
export function installHerdr(ctx: Context): void {
  const { user } = ctx;
  const bin = user.path(".local", "bin", "herdr");
  if (existsSync(bin)) {
    note(`herdr already installed: ${user.output(bin, ["--version"])}`);
  } else {
    user.mkdir(user.path(".local", "bin"));
    user.installScript("https://herdr.dev/install.sh");
  }
  const status = user.capture(bin, ["integration", "status"]).stdout;
  if (/^claude: current/m.test(status)) return note("herdr claude integration current");
  // the install writes ~/.claude/hooks/herdr-agent-state.sh and also adds its
  // own hook entries to settings.json, which is the repo's file through the
  // stow link and already runs that script; keep the script, undo the entries
  user.preserving(user.path(".claude", "settings.json"), () =>
    user.run(bin, ["integration", "install", "claude"]),
  );
}

/**
 * plannotator --minimal: only the binary in ~/.local/bin. installAgentSkills
 * adds the plugins and skills per harness; the full install would register
 * hooks for every agent host and overwrite the stowed configs.
 */
function installPlannotator(ctx: Context): void {
  const { user } = ctx;
  if (existsSync(user.path(".local", "bin", "plannotator"))) {
    return note(
      `plannotator already installed: ${user.output(user.path(".local", "bin", "plannotator"), ["--version"])}`,
    );
  }
  user.installScript("https://plannotator.ai/install.sh", {
    shell: "bash",
    args: ["--minimal", "--non-interactive", "--skip-claude-plugin"],
  });
}

/**
 * pi's managed install (releases under ~/.pi/agent/install, launcher linked
 * into ~/.local/bin). Without a tty it never prompts or edits rc files. Needs
 * Node 22.19+ on PATH, which the node step's nvm default provides.
 */
function installPi(ctx: Context): void {
  const { user } = ctx;
  const marker = user.path(".pi", "agent", "install", "managed-install.json");
  if (!existsSync(marker)) {
    user.installScript("https://pi.dev/install.sh", { input: "" });
  } else {
    note(
      `pi already installed: ${user.readFile(user.path(".pi", "agent", "install", "current-version"))?.trim()}`,
    );
  }
  installPiPackages(ctx);
}

/** The npm: packages listed in the stowed ~/.pi/agent/settings.json, e.g. plannotator's extension. */
function installPiPackages(ctx: Context): void {
  const { user } = ctx;
  const settingsPath = user.path(".pi", "agent", "settings.json");
  const text = user.readFile(settingsPath);
  if (!text) return;
  const packages = (JSON.parse(text) as { packages?: unknown }).packages;
  if (!Array.isArray(packages)) return;
  const pi = user.which("pi") ?? user.path(".pi", "agent", "bin", "pi");
  for (const source of packages) {
    if (typeof source !== "string" || !source.startsWith("npm:")) continue;
    const name = source.slice(4).replace(/(?<=.)@[^/]*$/, "");
    if (existsSync(user.path(".pi", "agent", "npm", "node_modules", name, "package.json"))) {
      note(`pi package already installed: ${name}`);
      continue;
    }
    // `pi install` also records the source in settings.json, which already lists it
    user.preserving(settingsPath, () => user.run(pi, ["install", source], { input: "" }));
  }
}

/** opencode (opencode.nvim) when the distro doesn't package it: the opencode-ai pnpm global. */
function installOpencode(ctx: Context): void {
  const { user } = ctx;
  if (user.which("opencode")) return note(`opencode already installed: ${user.which("opencode")}`);
  user.run("pnpm", ["add", "-g", "--allow-build=opencode-ai", "opencode-ai"]);
}

/** codex (OpenAI's CLI) as a pnpm global. */
function installCodex(ctx: Context): void {
  const { user } = ctx;
  if (user.which("codex")) return note(`codex already installed: ${user.which("codex")}`);
  user.run("pnpm", ["add", "-g", "--allow-build=@openai/codex", "@openai/codex"]);
}

// Third-party skills. An official plugin wins where the harness has one; every
// other harness gets the skills through the skills CLI (`npx skills add`):
//
//                 Matt Pocock's skills            plannotator
//   Claude Code   plugin (claude-plugins-official) plugin (hooks) + npx skills
//   Codex         plugin (mattpocock marketplace)  npx skills
//   Pi            npx skills                       pi package (.pi/agent/settings.json) + npx skills
//   OpenCode      npx skills                       plugin in .config/opencode/opencode.jsonc + npx skills
//
// The skills CLI keeps Codex, Pi and OpenCode skills in ~/.agents/skills, the
// directory the repo's own skills are stowed into, so a skill already there
// (one of ours, or installed before) is never reinstalled or overwritten.

/** Pinned so a new machine gets the CLI these steps were tested with. */
export const SKILLS_CLI = "skills@1.9.0";
const POCOCK_REPO = "mattpocock/skills";
const POCOCK_PLUGIN_MANIFEST =
  "https://raw.githubusercontent.com/mattpocock/skills/main/.claude-plugin/plugin.json";
/** Upstream but outside the plugin, so every harness gets it from npx. */
export const POCOCK_EXTRA_SKILLS = ["claude-handoff"];
const PLANNOTATOR_REPO = "backnotprop/plannotator";
export const PLANNOTATOR_SKILLS = [
  "plannotator",
  "plannotator-annotate",
  "plannotator-inbox",
  "plannotator-last",
  "plannotator-review",
  "plannotator-compound",
  "plannotator-setup-goal",
  "plannotator-visual-explainer",
];
export const CLAUDE_MARKETPLACES = {
  "claude-plugins-official": "anthropics/claude-plugins-official",
  plannotator: "backnotprop/plannotator",
};
export const CLAUDE_PLUGINS = [
  "mattpocock-skills@claude-plugins-official",
  "plannotator@plannotator",
];
export const CODEX_PLUGIN = "mattpocock-skills@mattpocock";

/** Skill names the plugin manifest lists: the set Claude Code and Codex get. */
export function pluginSkillNames(manifest: string): string[] {
  const skills = (JSON.parse(manifest) as { skills?: unknown }).skills;
  if (!Array.isArray(skills)) throw new Error("plugin manifest lists no skills");
  return skills.filter((s): s is string => typeof s === "string").map((s) => basename(s));
}

/** `skills` that neither the repo nor an earlier install already put in ~/.agents/skills. */
export function missingSkills(skills: readonly string[], repoDir: string, home: string): string[] {
  return skills.filter(
    (s) =>
      !existsSync(join(repoDir, ".agents", "skills", s)) &&
      !existsSync(join(home, ".agents", "skills", s)),
  );
}

/** Installed skills tracked in the skills CLI lock (`$XDG_STATE_HOME/skills`). */
export function skillsLockPath(home: string): string {
  return join(home, ".local", "state", "skills", ".skill-lock.json");
}

function npxSkills(ctx: Context, repo: string, skills: readonly string[], agents: string[]): void {
  const { user } = ctx;
  const missing = missingSkills(skills, ctx.repoDir, user.home);
  if (missing.length === 0)
    return note(`${repo} skills already installed for ${agents.join(", ")}`);
  user.run(
    "npx",
    ["-y", SKILLS_CLI, "add", repo, "-g", "-y", "--full-depth", "-a", ...agents, "-s", ...missing],
    {
      // the lock goes where the dotfiles' shell keeps it, not into
      // ~/.agents/.skill-lock.json, which is the repo's file through stow
      env: { XDG_STATE_HOME: user.path(".local", "state"), DISABLE_TELEMETRY: "1" },
      input: "",
    },
  );
}

/** The plugins settings.json declares; `claude plugin` writes the same entries into it. */
function installClaudePlugins(ctx: Context): void {
  const { user } = ctx;
  const claude = user.path(".local", "bin", "claude");
  const list = () =>
    (JSON.parse(user.output(claude, ["plugin", "list", "--json"])) as { id: string }[]).map(
      (p) => p.id,
    );
  const missing = CLAUDE_PLUGINS.filter((id) => !list().includes(id));
  if (missing.length === 0)
    return note(`claude plugins already installed: ${CLAUDE_PLUGINS.join(" ")}`);
  user.preserving(user.path(".claude", "settings.json"), () => {
    for (const repo of Object.values(CLAUDE_MARKETPLACES)) {
      user.run(claude, ["plugin", "marketplace", "add", repo]);
    }
    for (const id of missing) user.run(claude, ["plugin", "install", id, "--scope", "user"]);
  });
}

/** ~/.codex/config.toml isn't stowed, so codex may record the plugin itself. */
function installCodexPlugin(ctx: Context): void {
  const { user } = ctx;
  const config = user.readFile(user.path(".codex", "config.toml")) ?? "";
  if (config.includes(`[plugins."${CODEX_PLUGIN}"]`)) {
    return note(`codex plugin already installed: ${CODEX_PLUGIN}`);
  }
  const codex = user.which("codex") ?? "codex";
  if (!config.includes("[marketplaces.mattpocock]")) {
    user.run(codex, ["plugin", "marketplace", "add", POCOCK_REPO]);
  }
  user.run(codex, ["plugin", "add", CODEX_PLUGIN]);
}

export function installAgentSkills(ctx: Context): void {
  installClaudePlugins(ctx);
  installCodexPlugin(ctx);
  const pocock = pluginSkillNames(fetchText(POCOCK_PLUGIN_MANIFEST));
  npxSkills(ctx, POCOCK_REPO, pocock, ["pi", "opencode"]);
  npxSkills(ctx, POCOCK_REPO, POCOCK_EXTRA_SKILLS, ["claude-code", "codex", "pi", "opencode"]);
  npxSkills(ctx, PLANNOTATOR_REPO, PLANNOTATOR_SKILLS, ["claude-code", "codex", "pi", "opencode"]);
}

export interface LinkProblem {
  path: string;
  problem: string;
}

/**
 * The agent config that only reaches $HOME through stow: each must be a link
 * resolving into the repo. Returns what is missing or points elsewhere.
 */
export function agentLinkProblems(repoDir: string, home: string): LinkProblem[] {
  const problems: LinkProblem[] = [];
  // the file itself or a directory above it may be the link (stow links the
  // repo's .claude/skills/<name> symlinks as-is), so compare resolved paths
  const expect = (rel: string) => {
    const path = join(home, rel);
    let target: string;
    try {
      target = realpathSync(path);
    } catch {
      problems.push({ path, problem: "missing" });
      return;
    }
    if (target !== realpathSync(join(repoDir, rel))) {
      problems.push({ path, problem: `is ${target}, a copy or another link, not the repo's file` });
    }
  };

  expect(".claude/settings.json");
  expect(".claude/hooks/lib/hook-io.ts");
  expect(".claude/hooks/patterns/secrets.json");
  for (const f of readdirSync(join(repoDir, ".claude", "hooks"))) {
    if (f.endsWith(".ts") && !f.endsWith(".test.ts")) expect(`.claude/hooks/${f}`);
  }
  for (const f of readdirSync(join(repoDir, ".claude", "rules"))) expect(`.claude/rules/${f}`);
  for (const f of readdirSync(join(repoDir, ".claude", "skills"))) {
    expect(`.claude/skills/${f}/SKILL.md`);
  }
  for (const f of readdirSync(join(repoDir, ".agents", "skills"))) {
    if (existsSync(join(repoDir, ".agents", "skills", f, "SKILL.md"))) {
      expect(`.agents/skills/${f}/SKILL.md`);
    }
  }
  expect(".agents/hooks/hooks.json");
  expect(".agents/hooks/safety-hook.ts");
  expect(".pi/agent/settings.json");
  return problems;
}

/**
 * Run the SessionStart hook-doctor the way Claude Code would, with the user's
 * node. It prints a systemMessage only when a hook can't run (missing program,
 * script or pattern file, or a Node without type stripping).
 */
export function hookDoctorReport(ctx: Context): string | null {
  const { user } = ctx;
  const doctor = user.path(".claude", "hooks", "hook-doctor.ts");
  if (!existsSync(doctor)) return `${doctor} is missing (stow not run?)`;
  const res = user.capture("node", [doctor], {
    input: JSON.stringify({ hook_event_name: "SessionStart", source: "startup", cwd: user.home }),
  });
  if (res.status !== 0) return `hook-doctor exited ${res.status}: ${res.stderr.trim()}`;
  const out = res.stdout.trim();
  if (!out) return null;
  const parsed = JSON.parse(out) as { systemMessage?: string };
  return parsed.systemMessage ?? null;
}

export function installAgents(ctx: Context, opts: { opencode: boolean }): void {
  installPlannotator(ctx);
  installPi(ctx);
  if (opts.opencode) installOpencode(ctx);
  installCodex(ctx);
  installAgentSkills(ctx);

  const problems = agentLinkProblems(ctx.repoDir, ctx.user.home);
  if (problems.length > 0) {
    const lines = problems.slice(0, 10).map((p) => `  ${p.path}: ${p.problem}`);
    throw new Error(
      `agent config is not linked from the repo (run the stow step):\n${lines.join("\n")}`,
    );
  }
  note("skills, rules, hooks and agent settings are linked from the repo");

  const doctor = hookDoctorReport(ctx);
  if (doctor) throw new Error(`hook-doctor: ${doctor}`);
  note("hook-doctor: every Claude Code hook can run");
}
