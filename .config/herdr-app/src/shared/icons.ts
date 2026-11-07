// This mod's own icons. Herdr draws an SVG only when its real path is inside ~/.config/herdr-app,
// and stow makes every repo file a symlink out of it, so the icons ship inside main.js and are
// written as plain files into the mod's live folder (mods/<mod>/icons/, not in the repo) the first
// time one is asked for. Herdr redraws an asset under mods/ that was missing on first load.

import { appHome, exec, readTextFile, writeTextFile } from "herdr";
import { ICONS } from "./icon-data.ts";

let installing: Promise<void> | null = null;

function install(): Promise<void> {
  const dir = `${appHome()}/mods/__MOD__/icons`;
  return (async () => {
    await exec("mkdir", ["-p", dir]);
    for (const [name, svg] of Object.entries(ICONS)) {
      const path = `${dir}/${name}.svg`;
      const now = await readTextFile(path).catch(() => null);
      if (now !== svg) await writeTextFile(path, svg, now).catch(() => null);
    }
  })().catch(() => {
    // Try again on the next ask.
    installing = null;
  });
}

/** The path `svg()` takes for one of this mod's icons (src/assets/<name>.svg). */
export function asset(name: string): string {
  installing ??= install();
  return `mods/__MOD__/icons/${name}.svg`;
}
