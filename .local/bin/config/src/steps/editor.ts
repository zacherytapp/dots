// Neovim: plugins at the versions in lazy-lock.json, so the first real launch
// starts with every plugin (and blink.cmp's prebuilt matcher) in place.
// Mason tools and treesitter parsers install themselves on first use; their
// runtimes (node, python3 + venv, go, cargo, a C compiler, curl, unzip, tar,
// tree-sitter-cli) come from the distro package lists and the node step.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { note } from "../lib/log.ts";
import type { Context } from "../lib/context.ts";

/** Neovim 0.11+ is the floor (vim.lsp.config, vim.diagnostic.jump). */
export const MIN_NVIM_MINOR = 11;

export function nvimVersion(ctx: Context, nvim = "nvim"): [number, number] | null {
  const res = ctx.user.capture(nvim, ["--version"]);
  const m = /NVIM v(\d+)\.(\d+)/.exec(res.stdout);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/**
 * lazy.nvim is installed and every installed plugin sits at its locked commit.
 * Locked plugins that are absent don't count: the lockfile also lists plugins
 * whose `cond`/`enabled` is false on this machine, which lazy never clones.
 */
function pluginsMatchLock(ctx: Context, lockText: string): boolean {
  const locked = JSON.parse(lockText) as Record<string, { commit?: string }>;
  const root = ctx.user.path(".local", "share", "nvim", "lazy");
  if (!existsSync(join(root, "lazy.nvim"))) return false;
  const behind = Object.entries(locked).filter(([name, { commit }]) => {
    // init.lua bootstraps lazy.nvim from its stable branch, and lazy doesn't
    // move its own checkout during a restore, so it never matches the lock
    if (name === "lazy.nvim") return false;
    const dir = join(root, name);
    if (!existsSync(dir)) return false;
    const head = ctx.user.capture("git", ["-C", dir, "rev-parse", "HEAD"]);
    return head.status !== 0 || head.stdout.trim() !== commit;
  });
  if (behind.length > 0) note(`not at the locked commit: ${behind.map(([n]) => n).join(" ")}`);
  return behind.length === 0;
}

export function syncNeovimPlugins(ctx: Context): void {
  const { user } = ctx;
  const config = user.path(".config", "nvim", "init.lua");
  if (!existsSync(config)) throw new Error(`${config} is missing; run the stow step first`);
  const version = nvimVersion(ctx);
  if (!version) throw new Error("nvim is not installed");
  if (version[0] === 0 && version[1] < MIN_NVIM_MINOR) {
    throw new Error(`nvim 0.${version[1]} is too old; the config needs 0.${MIN_NVIM_MINOR}+`);
  }

  const lock = user.path(".config", "nvim", "lazy-lock.json");
  const before = user.readFile(lock);
  // a re-run with every plugin already at its locked commit changes nothing
  // (lazy regenerates helptags and readmes on each restore, so don't call it)
  if (before !== null && pluginsMatchLock(ctx, before))
    return note("neovim plugins already match lazy-lock.json");

  // `Lazy! restore` checks plugins out at the lockfile's commits. lazy rewrites
  // the lockfile after it runs, and it is the repo's tracked file, so put back
  // anything it changed.
  user.preserving(lock, () => {
    try {
      user.run("nvim", ["--headless", "+Lazy! restore", "+qa"], { input: "" });
    } finally {
      // headless nvim leaves its last message without a newline
      process.stdout.write("\n");
    }
  });
  note("neovim plugins match lazy-lock.json");
}
