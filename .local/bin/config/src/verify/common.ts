// Checks every distro shares: the dev toolchain the dotfiles expect, Neovim's
// external dependencies, Salesforce/Java/PMD, the agent harnesses and the
// stowed agent config.

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { capture } from "../lib/exec.ts";
import { MIN_NVIM_MINOR, nvimVersion } from "../steps/editor.ts";
import { MIN_JAVA, javaMajor } from "../steps/salesforce.ts";
import { STATUSLINE_CMD, agentLinkProblems, hookDoctorReport } from "../steps/agents.ts";
import { PNPM_GLOBALS } from "../steps/toolchains.ts";
import type { Context } from "../lib/context.ts";
import type { Verifier } from "../lib/verify.ts";

export function verifyEditor(ctx: Context, v: Verifier): void {
  v.section("neovim and its external dependencies");
  // lazy, mason, treesitter and the plugin pickers shell out to these
  v.commands(
    "nvim",
    "git",
    "make",
    "cc",
    "curl",
    "wget",
    "unzip",
    "tar",
    "gzip",
    "rg",
    "fd",
    "fzf",
  );
  v.commands(
    "lazygit",
    "gh",
    "delta",
    "ctags",
    "tree-sitter",
    "python3",
    "go",
    "cargo",
    "node",
    "npm",
  );
  v.commands("opencode", "lwc-language-server", "prettierd", "stylelint", "sql-formatter");
  v.check(`nvim 0.${MIN_NVIM_MINOR}+`, () => {
    const ver = nvimVersion(ctx);
    return ver !== null && (ver[0] > 0 || ver[1] >= MIN_NVIM_MINOR);
  });
  v.runs("nvim starts the config", "nvim", ["--headless", "+qa"]);
  v.check("lazy.nvim plugins installed", () =>
    existsSync(ctx.user.path(".local", "share", "nvim", "lazy", "lazy.nvim")),
  );
  v.check("blink.cmp installed", () =>
    existsSync(ctx.user.path(".local", "share", "nvim", "lazy", "blink.cmp")),
  );
  v.check("tree-sitter-cli 0.25+", () => {
    const m = /tree-sitter (\d+)\.(\d+)/.exec(
      capture("tree-sitter", ["--version"], { env: { PATH: ctx.user.searchPath() } }).stdout,
    );
    return m !== null && (Number(m[1]) > 0 || Number(m[2]) >= 25);
  });
  v.check(
    "python venv module (mason pip packages)",
    () => capture("python3", ["-c", "import venv, ensurepip"]).status === 0,
  );
  v.check("pynvim", () => capture("python3", ["-c", "import pynvim"]).status === 0);
  v.check(
    "clipboard provider (wl-copy or xclip)",
    () => ctx.user.which("wl-copy") !== null || ctx.user.which("xclip") !== null,
  );
}

export function verifySalesforce(ctx: Context, v: Verifier): void {
  v.section("salesforce, java and pmd");
  v.commands("java", "sf", "pmd");
  v.check(`java ${MIN_JAVA}+`, () => (javaMajor() ?? 0) >= MIN_JAVA);
  v.runs("sf runs", "sf", ["--version"]);
  v.runs("pmd runs", "pmd", ["--version"]);
  v.check("pmd apex ruleset in nvim config", () =>
    existsSync(ctx.user.path(".config", "nvim", "pmd", "apex.xml")),
  );
  const lsp = (name: string, entry: string) =>
    v.check(`${name} language server`, () =>
      existsSync(ctx.user.path(".local", "share", "nvim", "salesforce-lsp", name, entry)),
    );
  lsp("apex", "extension/dist/apex-jorje-lsp.jar");
  lsp("visualforce", "extension/dist/visualforceServer.js");
  lsp("aura", "extension/dist/auraServer.js");
  v.check("sf code-analyzer plugin", () => {
    const manifest = ctx.user.path(".local", "share", "sf", "package.json");
    const deps = (JSON.parse(readFileSync(manifest, "utf8")) as { dependencies?: object })
      .dependencies;
    return deps !== undefined && "@salesforce/plugin-code-analyzer" in deps;
  });
}

export function verifyToolchains(ctx: Context, v: Verifier): void {
  v.section("toolchains");
  v.commands("rustup", "cargo", "rust-analyzer", "node", "npm", "pnpm");
  v.runs("cargo runs", "cargo", ["--version"]);
  v.outputMatches(
    "rust-src component",
    "rustup",
    ["component", "list", "--installed"],
    /^rust-src/m,
  );
  v.check("node 24+ for the claude hooks", () => {
    const res = capture("node", ["-p", "process.versions.node.split('.')[0]"], {
      env: { PATH: ctx.user.searchPath() },
    });
    return Number(res.stdout.trim()) >= 24;
  });
  v.check(`nvm in ${ctx.user.nvmDir}, linked at ~/.nvm`, () =>
    existsSync(ctx.user.path(".nvm", "nvm.sh")),
  );
  const globals = capture("pnpm", ["ls", "-g", "--depth=0", "--parseable"], {
    env: { PATH: ctx.user.searchPath() },
  }).stdout;
  for (const pkg of PNPM_GLOBALS) {
    v.check(`pnpm global ${pkg}`, () =>
      globals.split("\n").some((l) => l.endsWith(`/node_modules/${pkg}`)),
    );
  }
  v.check("tpm cloned", () => existsSync(ctx.user.path(".tmux", "plugins", "tpm", "tpm")));
}

function statuslineRenders(ctx: Context): boolean {
  const cfg = join(tmpdir(), `dots-verify-${process.pid}`);
  const res = capture(ctx.user.path(".claude", "statusline", "statusline.sh"), [], {
    input: JSON.stringify({
      model: { display_name: "Opus" },
      cwd: tmpdir(),
      context_window: { context_window_size: 200000, current_usage: { input_tokens: 1000 } },
      rate_limits: { five_hour: { used_percentage: 12 } },
    }),
    env: {
      CLAUDE_CONFIG_DIR: cfg,
      DBUS_SESSION_BUS_ADDRESS: "",
      STATUSLINE_CHECK_UPDATES: "false",
    },
  });
  capture("rm", ["-rf", cfg]);
  return res.stdout.includes("Opus");
}

export function verifyAgents(ctx: Context, v: Verifier): void {
  v.section("agent harnesses");
  v.commands("claude", "herdr", "plannotator", "pi", "opencode");
  v.runs("claude runs", "claude", ["--version"]);
  v.runs("plannotator runs", "plannotator", ["--version"]);
  v.runs("pi runs", "pi", ["--version"]);
  v.check("statusline executable", () =>
    existsSync(ctx.user.path(".claude", "statusline", "statusline.sh")),
  );
  v.check("settings.json statusLine", () => {
    const s = JSON.parse(readFileSync(ctx.user.path(".claude", "settings.json"), "utf8")) as {
      statusLine?: { command?: string };
    };
    return s.statusLine?.command === STATUSLINE_CMD;
  });
  v.check("statusline renders", () => statuslineRenders(ctx));
  v.check("herdr claude integration", () =>
    /^claude: current/m.test(
      capture("herdr", ["integration", "status"], { env: { PATH: ctx.user.searchPath() } }).stdout,
    ),
  );
  v.check("pi plannotator extension", () =>
    existsSync(
      ctx.user.path(
        ".pi",
        "agent",
        "npm",
        "node_modules",
        "@plannotator",
        "pi-extension",
        "package.json",
      ),
    ),
  );

  v.section("agent config linked from the repo");
  const problems = agentLinkProblems(ctx.repoDir, ctx.user.home);
  v.check("skills, rules, hooks and settings are links into the repo", () => problems.length === 0);
  for (const p of problems.slice(0, 10)) console.log(`        ${p.path}: ${p.problem}`);
  let doctor: string | null = "not run";
  v.check("hook-doctor: every claude code hook can run", () => {
    doctor = hookDoctorReport(ctx);
    return doctor === null;
  });
  if (doctor) console.log(`        ${doctor}`);
}

export function verifyIdentity(ctx: Context, v: Verifier): void {
  v.section("user config");
  const login = ctx.user.shell();
  v.check(`login shell is zsh (${login})`, () => login.endsWith("/zsh"));
  v.runs("git user.email", "git", ["config", "--global", "user.email"]);
  v.runs("git user.name", "git", ["config", "--global", "user.name"]);
  v.outputMatches("gpg secret key", "gpg", ["--list-secret-keys", "--with-colons"], /^sec/m);
  v.check("pass initialized", () => existsSync(ctx.user.path(".password-store", ".gpg-id")));
  v.check("ssh key", () => existsSync(ctx.user.path(".ssh", "id_ed25519")));
  v.check(
    "~/.zshrc linked from the repo",
    () => realpathSync(ctx.user.path(".zshrc")) === realpathSync(join(ctx.repoDir, ".zshrc")),
  );
}

/** Everything the distro verifiers share, in report order. */
export function verifyCommon(ctx: Context, v: Verifier): void {
  verifyToolchains(ctx, v);
  verifyEditor(ctx, v);
  verifySalesforce(ctx, v);
  verifyAgents(ctx, v);
  verifyIdentity(ctx, v);
}
