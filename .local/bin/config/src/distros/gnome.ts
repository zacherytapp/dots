// Opt-in GNOME tweaks for Fedora and Ubuntu: settings, keybindings, extensions
// and the Gruvbox GTK theme. The caller installs the packages (pipx, dconf,
// sassc, git, flatpak, papirus-icon-theme, ...).
//
// gsettings, dconf and gext talk to the user's session bus, so they run as the
// user with DBUS_SESSION_BUS_ADDRESS pointed at it, and are skipped (with a
// warning) in containers and when nobody is logged in.

import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { note, record, warn } from "../lib/log.ts";
import { skipInContainer } from "../lib/system.ts";
import type { Context } from "../lib/context.ts";
import type { Env } from "../lib/exec.ts";

const EXTENSIONS = [
  "just-perfection-desktop@just-perfection",
  "blur-my-shell@aunetx",
  "undecorate@sun.wxg@gmail.com",
  "tophat@fflewddur.github.io",
  "switcher@landau.fi",
];

const TRACKER = "org.freedesktop.Tracker3.Miner.Files";

export interface GnomeOptions {
  /** Dump of /org/gnome/shell/extensions/, loaded after the extensions install. */
  dconfFile: string;
  /** Installed on top of the shared list (Fedora: appindicator; Ubuntu ships its own). */
  extraExtensions?: readonly string[];
  /** org.gnome.nautilus.icon-view default-zoom-level. */
  nautilusZoom: string;
  /** Distro-specific [schema, key, value] settings. */
  extraSettings?: ReadonlyArray<readonly [string, string, string]>;
}

/** Directory the Gruvbox installer creates in ~/.themes (it appends the tweak names). */
const THEME_PREFIX = "Gruvbox-Green-Dark-Compact";
const THEME_ARGS = [
  "--tweaks",
  "medium",
  "macos",
  "float",
  "--theme",
  "green",
  "--color",
  "dark",
  "--size",
  "compact",
];

function isSocket(path: string): boolean {
  try {
    return statSync(path).isSocket();
  } catch {
    return false;
  }
}

/** The user's session bus environment, or null (after a notice) when there is no session. */
function sessionEnv(ctx: Context, what: string): Env | null {
  if (skipInContainer(ctx, `${what} need a gnome session`)) return null;
  const runtime = `/run/user/${ctx.user.uid}`;
  const bus = `${runtime}/bus`;
  if (!isSocket(bus)) {
    warn(`skipped: no session bus for ${ctx.user.name} (${bus}); run from a logged-in desktop`);
    record(`skipped: no session bus (${what})`);
    return null;
  }
  return { DBUS_SESSION_BUS_ADDRESS: `unix:path=${bus}`, XDG_RUNTIME_DIR: runtime };
}

/** gsettings tweaks, gnome-extensions-cli extensions, then the extension settings. */
export function configureGnome(ctx: Context, opts: GnomeOptions): void {
  const { user } = ctx;
  if (!user.which("gext")) {
    user.run("pipx", ["install", "gnome-extensions-cli", "--system-site-packages"]);
  }
  const env = sessionEnv(ctx, "gsettings and gnome extensions");
  if (!env) return;
  const gs = (schema: string, key: string, value: string) =>
    user.run("gsettings", ["set", schema, key, value], { env });

  gs("org.gnome.mutter", "dynamic-workspaces", "false");
  gs("org.gnome.desktop.wm.preferences", "num-workspaces", "10");
  // super+number otherwise launches dash/dock apps
  for (let i = 1; i <= 9; i++)
    gs("org.gnome.shell.keybindings", `switch-to-application-${i}`, "[]");
  for (let i = 1; i <= 10; i++) {
    const key = i % 10;
    gs("org.gnome.desktop.wm.keybindings", `switch-to-workspace-${i}`, `['<Super>${key}']`);
    gs("org.gnome.desktop.wm.keybindings", `move-to-workspace-${i}`, `['<Super><Shift>${key}']`);
  }
  gs("org.gnome.desktop.wm.keybindings", "close", "['<Super><Shift>Q']");

  gs("org.gnome.desktop.peripherals.mouse", "accel-profile", "adaptive");
  gs("org.gnome.desktop.sound", "allow-volume-above-100-percent", "true");
  gs("org.gnome.desktop.calendar", "show-weekdate", "true");
  gs("org.gnome.desktop.wm.preferences", "resize-with-right-button", "true");
  gs("org.gnome.desktop.wm.preferences", "button-layout", "appmenu:minimize,maximize,close");

  gs("org.gnome.nautilus.icon-view", "default-zoom-level", opts.nautilusZoom);
  gs("org.gnome.nautilus.list-view", "use-tree-view", "true");
  gs("org.gtk.Settings.FileChooser", "sort-directories-first", "true");
  for (const [schema, key, value] of opts.extraSettings ?? []) gs(schema, key, value);
  // localsearch (formerly tracker) indexing, when it is installed
  const schemas = user.output("gsettings", ["list-schemas"], { env }).split("\n");
  if (schemas.includes(TRACKER)) {
    gs(TRACKER, "index-on-battery", "false");
    gs(TRACKER, "index-on-battery-first-time", "false");
    gs(TRACKER, "throttle", "15");
  }

  // --all includes disabled ones, so a re-run doesn't re-enable what the user turned off
  const installed = user.output("gext", ["list", "--all"], { env });
  for (const ext of [...EXTENSIONS, ...(opts.extraExtensions ?? [])]) {
    if (installed.includes(ext)) {
      note(`extension already installed: ${ext}`);
      continue;
    }
    note(`installing extension: ${ext}`);
    user.run("gext", ["install", ext], { env });
  }

  const dump = user.readFile(opts.dconfFile);
  if (dump === null) throw new Error(`missing ${opts.dconfFile}`);
  user.run("dconf", ["load", "/org/gnome/shell/extensions/"], { env, input: dump });
}

function findTheme(themesDir: string): string | null {
  if (!existsSync(themesDir)) return null;
  return (
    readdirSync(themesDir)
      .filter((n) => n.startsWith(THEME_PREFIX))
      .sort()[0] ?? null
  );
}

/**
 * The Gruvbox GTK theme (medium, green accent) and Papirus icons, matching the
 * Gruvbox Material palette the rest of the dots use. The theme files and the
 * flatpak overrides don't need a session; selecting them does. No -l: the
 * stowed ~/.config/gtk-4.0/gtk.css imports the noctalia-rendered colors for
 * libadwaita apps, and -l would replace it.
 */
export function configureGtkTheme(ctx: Context): void {
  const { user } = ctx;
  const themesDir = user.path(".themes");
  const icons = user.path(".icons");
  const repo = user.path("temp", "Gruvbox-GTK-Theme");
  user.mkdir(themesDir, icons, user.path(".config", "gtk-4.0"), user.path("temp"));

  // the installer deletes and rebuilds the theme every time, so only run it until it exists
  let theme = findTheme(themesDir);
  if (theme) {
    note(`${theme} already installed`);
  } else {
    if (!existsSync(join(repo, ".git"))) {
      user.run("git", [
        "clone",
        "--quiet",
        "--depth",
        "1",
        "https://github.com/Fausto-Korpsvart/Gruvbox-GTK-Theme.git",
        repo,
      ]);
    }
    user.run("bash", ["./install.sh", ...THEME_ARGS, "--dest", themesDir], {
      cwd: join(repo, "themes"),
    });
    theme = findTheme(themesDir);
    if (!theme) throw new Error(`${THEME_PREFIX}* not found in ${themesDir}`);
  }

  // let flatpak apps read (not write) the theme, the icons and the gtk4 colors
  for (const path of [themesDir, icons, "xdg-config/gtk-4.0"]) {
    user.run("flatpak", ["override", "--user", `--filesystem=${path}:ro`]);
  }

  const env = sessionEnv(ctx, "gsettings");
  if (!env) return;
  const gs = (key: string, value: string) =>
    user.run("gsettings", ["set", "org.gnome.desktop.interface", key, value], { env });
  gs("icon-theme", "Papirus-Dark");
  gs("gtk-theme", theme);
  gs("color-scheme", "prefer-dark");
}
