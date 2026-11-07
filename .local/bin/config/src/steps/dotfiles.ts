// Links the repo into $HOME with the repo's own .stowrc (--target=~
// --no-folding). Files a fresh install ships in the way (~/.bashrc, ~/.zshrc,
// kitty.conf, ...) are moved to ~/.dots-backup/<timestamp>/ first, so the
// repo's versions win and nothing is lost.

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { note, warn } from "../lib/log.ts";
import type { Context } from "../lib/context.ts";

/**
 * Targets stow refuses to overwrite, relative to $HOME, from `stow -n` stderr:
 *
 *   2.4  cannot stow S over existing target X since neither a link nor a directory ...
 *        cannot stow non-directory S over existing directory target X
 *        cannot stow directory S over existing non-directory target X
 *   both existing target is not owned by stow: X
 *        existing target is stowed to a different package: X => Y
 *   2.3  existing target is neither a link nor a directory: X
 */
export function parseConflicts(stderr: string): string[] {
  const found = new Set<string>();
  for (const line of stderr.split("\n")) {
    const m =
      /over existing (?:non-directory |directory )?target (.+?)(?: since .*)?$/.exec(line) ??
      /existing target is [^:]+: (.+?)(?: => .*)?$/.exec(line);
    if (m?.[1]) found.add(m[1]);
  }
  return [...found];
}

function simulate(ctx: Context): { ok: boolean; conflicts: string[]; stderr: string } {
  const res = ctx.user.capture("stow", ["-n", "-v", "."], { cwd: ctx.repoDir });
  return { ok: res.status === 0, conflicts: parseConflicts(res.stderr), stderr: res.stderr };
}

export function stowDotfiles(ctx: Context): void {
  const { user, repoDir } = ctx;
  if (!existsSync(join(repoDir, ".stowrc"))) {
    throw new Error(`no .stowrc in ${repoDir}; is .local/bin/config/ still inside the dots repo?`);
  }
  ctx.pkg.install(["stow"]);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupRoot = user.path(".dots-backup", stamp);
  // a backed-up directory can uncover conflicts stow didn't get to, so repeat
  for (let round = 0; ; round++) {
    const sim = simulate(ctx);
    if (sim.ok) break;
    if (sim.conflicts.length === 0 || round === 5) {
      throw new Error(`stow -n failed:\n${sim.stderr.trim()}`);
    }
    for (const rel of sim.conflicts) {
      const dest = join(backupRoot, rel);
      user.mkdir(dirname(dest));
      user.run("mv", [user.path(rel), dest]);
      warn(`moved ~/${rel} to ${dest}`);
    }
  }
  user.run("stow", ["."], { cwd: repoDir });
  note(`linked ${repoDir} into ${user.home}`);
  // per-clone git filter that keeps machine-local settings keys out of commits
  // (.gitattributes); a copied tree without .git (the Docker tests) has no clone to set up
  if (existsSync(join(repoDir, ".git"))) {
    user.run(join(repoDir, ".local", "bin", "config", "local-keys.sh"), ["install"]);
  } else note("not a git checkout, skipped the local-keys filter");
}
