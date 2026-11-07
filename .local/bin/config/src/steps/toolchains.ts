// User-level language toolchains. Re-runs only install what is missing;
// upgrading is left to the tools themselves (rustup update, nvm, pnpm update -g).

import { existsSync, lstatSync } from "node:fs";
import { run, succeeds } from "../lib/exec.ts";
import { note } from "../lib/log.ts";
import { latestGithubTag } from "../lib/net.ts";
import type { Context } from "../lib/context.ts";

/**
 * rustaceanvim needs rust-analyzer and rust-src on top of rustup's default
 * profile. .zshenv sources ~/.cargo/env, which only the rustup.rs installer
 * creates, so this uses it rather than a distro rust package.
 */
export function installRust(ctx: Context, crates: readonly string[] = []): void {
  const { user } = ctx;
  if (!existsSync(user.path(".cargo", "bin", "rustup"))) {
    user.installScript("https://sh.rustup.rs", { args: ["-y", "--no-modify-path"] });
  }
  user.run("rustup", ["component", "add", "--toolchain", "stable", "rust-analyzer", "rust-src"]);
  if (crates.length === 0) return;
  const installed = user.output("cargo", ["install", "--list"]);
  for (const crate of crates) {
    if (new RegExp(`^${crate} `, "m").test(installed)) continue;
    user.run("cargo", ["install", "--locked", crate]);
  }
}

/** Globals the dotfiles rely on: the sf CLI and LWC server (Neovim, hooks), node providers. */
export const PNPM_GLOBALS = [
  "@salesforce/cli",
  "@salesforce/lwc-language-server",
  "stylelint",
  "neovim",
  "tree-sitter-cli",
  "sql-formatter",
  "@fsouza/prettierd",
  "markdownlint-cli",
] as const;

const NEEDS_BUILD = new Set(["tree-sitter-cli", "opencode-ai"]);

/**
 * nvm in ~/.config/nvm (where .zshrc looks) with ~/.nvm linked to it, the
 * current LTS as the default, standalone pnpm and its globals. The Claude Code
 * hooks need Node 24+, which every current LTS satisfies.
 */
export function installNode(ctx: Context, extraGlobals: readonly string[] = []): void {
  const { user } = ctx;
  user.mkdir(user.nvmDir);
  if (!existsSync(`${user.nvmDir}/nvm.sh`)) {
    const tag = latestGithubTag("nvm-sh/nvm");
    // PROFILE=/dev/null keeps the installer out of the (stowed) shell rc files
    user.installScript(`https://raw.githubusercontent.com/nvm-sh/nvm/${tag}/install.sh`, {
      shell: "bash",
      env: { PROFILE: "/dev/null" },
    });
  }
  const legacy = user.path(".nvm");
  if (!existsSync(legacy) && !isSymlink(legacy)) user.run("ln", ["-s", user.nvmDir, legacy]);

  // only the first time: later runs would install each new LTS and move default
  user.sh(
    '[ "$(nvm version default)" != N/A ] || { nvm install --lts && nvm alias default "lts/*"; }',
  );
  user.refresh();
  const node = user.defaultNodeBin();
  if (!node) throw new Error("nvm has no default node after installing one");
  const major = Number(user.output(`${node}/node`, ["-p", "process.versions.node.split('.')[0]"]));
  if (major < 24) {
    throw new Error(
      `nvm default is Node ${major}; the Claude Code hooks need 24+ (nvm alias default 24)`,
    );
  }

  // standalone pnpm into $PNPM_HOME; the installer's `pnpm setup` edits the
  // shell rc, so give it a throwaway HOME (.zshenv already sets PNPM_HOME)
  if (!user.which("pnpm")) {
    const tmpHome = user.output("mktemp", ["-d"]);
    try {
      user.installScript("https://get.pnpm.io/install.sh", {
        env: { HOME: tmpHome, SHELL: "/bin/bash" },
      });
    } finally {
      user.run("rm", ["-rf", tmpHome]);
    }
  }

  // only the missing globals, so a re-run doesn't upgrade or relink the rest.
  // pnpm 11+ keeps each global in its own dir, so ask pnpm, not `pnpm root -g`
  const listing = user.capture("pnpm", ["ls", "-g", "--depth=0", "--parseable"]);
  if (listing.status !== 0) throw new Error(`pnpm ls -g failed: ${listing.stderr.trim()}`);
  const lines = listing.stdout.split("\n");
  const wanted = [...PNPM_GLOBALS, ...extraGlobals];
  const missing = wanted.filter((pkg) => !lines.some((l) => l.endsWith(`/node_modules/${pkg}`)));
  if (missing.length === 0) return note("pnpm globals already installed");
  // pnpm skips dependency build scripts unless allowed; tree-sitter-cli's
  // postinstall is what downloads the binary
  const builds = missing.filter((p) => NEEDS_BUILD.has(p)).map((p) => `--allow-build=${p}`);
  user.run("pnpm", ["add", "-g", ...builds, ...missing]);
}

function isSymlink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

/** Binary is named after the last path element (none of these end in /vN). */
export function installGoTools(ctx: Context, tools: readonly string[]): void {
  const { user } = ctx;
  for (const tool of tools) {
    const bin = tool.replace(/@.*$/, "").split("/").pop() ?? tool;
    if (existsSync(user.path("go", "bin", bin))) {
      note(`go tool already installed: ${bin}`);
      continue;
    }
    // GOTOOLCHAIN=auto: distro go (Fedora sets local) can be older than a tool needs
    user.run("go", ["install", tool], { env: { GOTOOLCHAIN: "auto" } });
  }
}

export function installPipxTools(ctx: Context, tools: readonly string[]): void {
  const { user } = ctx;
  // the venv dir, not `pipx list`: listing takes each venv's lock and touches it
  for (const tool of tools) {
    if (existsSync(user.path(".local", "share", "pipx", "venvs", tool))) {
      note(`pipx tool already installed: ${tool}`);
      continue;
    }
    user.run("pipx", ["install", tool]);
  }
}

export function installPyenv(ctx: Context): void {
  if (existsSync(ctx.user.path(".pyenv"))) return note("pyenv already installed");
  ctx.user.installScript("https://pyenv.run", { shell: "bash" });
}

/**
 * System gems (/usr/local), e.g. the neovim provider: a --user-install puts
 * neovim-ruby-host in a versioned gem dir the dotfiles don't put on PATH.
 */
export function installGems(gems: readonly string[]): void {
  for (const gem of gems) {
    if (succeeds("gem", ["list", "-i", `^${gem}$`])) continue;
    run("gem", ["install", "--no-document", gem]);
  }
}

/** juliaup; .zshenv puts ~/.juliaup/bin on PATH, so keep the installer out of the rc files. */
export function installJulia(ctx: Context): void {
  if (existsSync(ctx.user.path(".juliaup", "bin", "juliaup")))
    return note("juliaup already installed");
  ctx.user.installScript("https://install.julialang.org", { args: ["--yes", "--add-to-path=no"] });
}

export const BREW_PREFIX = "/home/linuxbrew/.linuxbrew";

/**
 * Homebrew in its default Linux prefix, owned by the user. Homebrew's
 * documented git-clone install rather than its install.sh, which wants to sudo
 * as the user; the caller installs the build deps.
 */
export function installHomebrew(ctx: Context): void {
  const { user } = ctx;
  if (existsSync(`${BREW_PREFIX}/bin/brew`)) return note("homebrew already installed");
  run("install", [
    "-d",
    "-o",
    user.name,
    "-g",
    String(user.gid),
    "/home/linuxbrew",
    BREW_PREFIX,
    `${BREW_PREFIX}/bin`,
  ]);
  if (!existsSync(`${BREW_PREFIX}/Homebrew/.git`)) {
    user.run("git", [
      "clone",
      "--quiet",
      "--depth",
      "1",
      "https://github.com/Homebrew/brew",
      `${BREW_PREFIX}/Homebrew`,
    ]);
  }
  user.run("ln", ["-sf", "../Homebrew/bin/brew", `${BREW_PREFIX}/bin/brew`]);
  user.run(`${BREW_PREFIX}/bin/brew`, ["update", "--force", "--quiet"]);
}
