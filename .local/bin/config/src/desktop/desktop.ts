// Hyprland + Noctalia desktop installer, shared by every distro module.
//
//   desktopInstall  checks first, then installs the session for this distro
//   desktopGreeter  opt-in: noctalia-greeter on greetd as the login screen
//   verifyDesktop   the post-install checks, recorded through the Verifier
//
// Both installers run as root. Only packages are installed here; the config
// itself comes from stowing the repo (.config/hypr, .config/noctalia, ...).
//
// Where each piece comes from:
//   cachyos  cachyos-hypr-noctalia (cachyos repo) pulls the whole stack
//   arch     hyprland, noctalia, uwsm from [extra]; swash from the AUR
//   fedora   hyprland/uwsm/xdph from the lionheartp/Hyprland copr (Fedora
//            retired its hyprland package), noctalia from Fedora 44+
//   ubuntu   noctalia from pkg.noctalia.dev, hyprland from the archive, which
//            is only new enough (>= 0.55, for the lua config) from 26.10 on

import { copyFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { capture, run, succeeds, which } from "../lib/exec.ts";
import { ensureFile, read } from "../lib/files.ts";
import { download, latestGithubTag, urlExists } from "../lib/net.ts";
import { aptUpdate, aurInstall } from "../lib/pkg.ts";
import { note, warn } from "../lib/log.ts";
import { Verifier } from "../lib/verify.ts";
import {
  MIN_HYPRLAND,
  displayManager,
  hyprlandVersion,
  info,
  noctaliaMajor,
  ok,
  preflight,
  preflightOs,
  versionGe,
  warnLine,
} from "./checks.ts";
import type { Context, DistroId } from "../lib/context.ts";

// What .config/hypr, .config/noctalia and .config/uwsm use: the session, the
// portals, the apps bound in hypr/config/variables.lua (ghostty, dolphin,
// gnome-text-editor, gnome-calculator, hyprpicker), grim/slurp/jq for
// hypr/scripts/screenshot-window.sh, qt5ct/qt6ct and adw-gtk3 for the
// noctalia qt and gtk templates, and xhost for the autostart.
const PKGS_ARCH = [
  ...["hyprland", "uwsm", "xdg-desktop-portal-hyprland", "xdg-desktop-portal-gtk", "hyprpicker"],
  ...[
    "hyprland-guiutils",
    "noctalia",
    "qt6ct",
    "qt5ct",
    "qt6-wayland",
    "adw-gtk-theme",
    "nwg-look",
  ],
  ...[
    "grim",
    "slurp",
    "wl-clipboard",
    "jq",
    "brightnessctl",
    "ddcutil",
    "xorg-xhost",
    "xdg-user-dirs",
  ],
  ...["ghostty", "dolphin", "kde-cli-tools", "gnome-calculator", "gnome-text-editor"],
  ...["gnome-keyring", "breeze-icons"],
];
const AUR_ARCH = ["swash", "bibata-cursor-theme-bin"];

// cachyos-hypr-noctalia depends on hyprland, noctalia, uwsm, qt6ct, swash and
// the rest of the list above; the extras are what it leaves out
const PKGS_CACHY = [
  ...["cachyos-hypr-noctalia", "hyprland", "noctalia", "uwsm"],
  ...[
    "xdg-desktop-portal-gtk",
    "qt5ct",
    "qt6-wayland",
    "ghostty",
    "jq",
    "xdg-user-dirs",
    "breeze-icons",
  ],
];

const PKGS_FEDORA = [
  ...["hyprland", "uwsm", "xdg-desktop-portal-hyprland", "xdg-desktop-portal-gtk", "hyprpicker"],
  ...[
    "hyprland-guiutils",
    // noctalia: installFedora asks for it by name
    "qt6ct",
    "qt5ct",
    "qt6-qtwayland",
    "adw-gtk3-theme",
    "nwg-look",
  ],
  ...["grim", "slurp", "wl-clipboard", "jq", "brightnessctl", "ddcutil", "xhost", "xdg-user-dirs"],
  ...["ghostty", "dolphin", "kde-cli-tools", "gnome-calculator", "gnome-text-editor"],
  ...["gnome-keyring", "breeze-icon-theme"],
];

// adw-gtk3 and bibata aren't packaged for ubuntu; they're fetched below
const PKGS_UBUNTU = [
  ...["hyprland", "uwsm", "xdg-desktop-portal-hyprland", "xdg-desktop-portal-gtk", "hyprpicker"],
  ...["noctalia", "qt6ct", "qt5ct", "qt6-wayland", "nwg-look"],
  ...["grim", "slurp", "wl-clipboard", "jq", "brightnessctl", "ddcutil", "x11-xserver-utils"],
  ...["xdg-user-dirs", "ghostty", "dolphin", "kde-cli-tools", "gnome-calculator"],
  ...["gnome-text-editor", "gnome-keyring", "breeze-icon-theme"],
];

// swash (the screenshot annotator noctalia pipes screenshots to) is built from
// source where it isn't packaged
const SWASH_BUILD_FEDORA = [
  ...["gcc", "meson", "ninja-build", "pkgconf-pkg-config", "gtk4-devel", "libadwaita-devel"],
  ...["tesseract-devel", "curl", "tar"],
];
const SWASH_BUILD_UBUNTU = [
  ...["build-essential", "meson", "ninja-build", "pkgconf", "libgtk-4-dev", "libadwaita-1-dev"],
  ...["libtesseract-dev", "curl"],
];

const BIBATA = "Bibata-Modern-Ice";

function withTmp<T>(fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "desktop-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * The hyprland version this machine would end up with: the installed one when
 * it's already new enough (e.g. built from source), else the package candidate.
 */
function hyprlandCandidate(distro: DistroId): string {
  const installed = hyprlandVersion();
  if (installed && versionGe(installed, MIN_HYPRLAND)) return installed;
  switch (distro) {
    case "arch":
    case "cachyos": {
      const out = capture("pacman", ["-Si", "hyprland"]).stdout;
      const ver = /^Version\s*:\s*(\S+)/m.exec(out)?.[1] ?? "";
      return ver.replace(/-[^-]*$/, "");
    }
    case "fedora": {
      const out = capture("dnf", [
        "repoquery",
        "-q",
        "--latest-limit=1",
        "--qf",
        "%{version}\n",
        "hyprland",
      ]);
      return out.stdout.trim().split("\n")[0] ?? "";
    }
    case "ubuntu": {
      const out = capture("apt-cache", ["policy", "hyprland"]).stdout;
      return /^ *Candidate: (\d[\d.]*)/m.exec(out)?.[1] ?? "";
    }
  }
}

function installBibata(): void {
  if (existsSync(`/usr/share/icons/${BIBATA}`))
    return note(`cursor theme already installed: ${BIBATA}`);
  const tag = latestGithubTag("ful1e5/Bibata_Cursor");
  withTmp((tmp) => {
    const archive = join(tmp, `${BIBATA}.tar.xz`);
    download(
      `https://github.com/ful1e5/Bibata_Cursor/releases/download/${tag}/${BIBATA}.tar.xz`,
      archive,
    );
    run("tar", ["--no-same-owner", "-xJf", archive, "-C", "/usr/share/icons"]);
  });
}

function installAdwGtk3(): void {
  if (existsSync("/usr/share/themes/adw-gtk3-dark")) return note("adw-gtk3 already installed");
  const tag = latestGithubTag("lassekongo83/adw-gtk3");
  withTmp((tmp) => {
    const archive = join(tmp, "adw-gtk3.tar.xz");
    download(
      `https://github.com/lassekongo83/adw-gtk3/releases/download/${tag}/adw-gtk3${tag}.tar.xz`,
      archive,
    );
    run("tar", ["--no-same-owner", "-xJf", archive, "-C", "/usr/share/themes"]);
  });
}

/** Builds the latest swash release into /usr/local. */
function buildSwash(): void {
  if (which("swash")) return note("swash already installed");
  const tag = latestGithubTag("ItsLemmy/swash");
  withTmp((tmp) => {
    const archive = join(tmp, "swash.tar.gz");
    download(`https://github.com/ItsLemmy/swash/archive/refs/tags/${tag}.tar.gz`, archive);
    const src = join(tmp, "src");
    run("mkdir", ["-p", src]);
    run("tar", ["--no-same-owner", "-xzf", archive, "-C", src, "--strip-components=1"]);
    run("meson", ["setup", "build", "--buildtype=release", "--prefix=/usr/local"], { cwd: src });
    run("meson", ["compile", "-C", "build"], { cwd: src });
    run("meson", ["install", "-C", "build"], { cwd: src });
  });
}

function installArch(ctx: Context): void {
  ctx.pkg.install(PKGS_ARCH);
  aurInstall(ctx.user, AUR_ARCH);
}

function installCachy(ctx: Context): void {
  ctx.pkg.install(PKGS_CACHY);
  // bibata comes from the AUR (the uwsm env and gtk settings use it)
  if (!existsSync(`/usr/share/icons/${BIBATA}`)) aurInstall(ctx.user, ["bibata-cursor-theme-bin"]);
}

function fedoraRepos(): void {
  run("dnf", ["install", "-y", "dnf-plugins-core"]);
  run("dnf", ["copr", "enable", "-y", "lionheartp/Hyprland"]);
  run("dnf", ["copr", "enable", "-y", "scottames/ghostty"]);
}

function installFedora(ctx: Context): void {
  // the copr also carries noctalia-git and the old v4 noctalia-shell; ask for
  // fedora's noctalia package by name so neither of those is picked, and check
  // it by name too (dnf.isInstalled also counts a package that provides it,
  // which is why it isn't in PKGS_FEDORA)
  ctx.pkg.install(PKGS_FEDORA);
  if (!succeeds("rpm", ["-q", "noctalia"])) run("dnf", ["install", "-y", "noctalia"]);
  ctx.pkg.install(SWASH_BUILD_FEDORA);
  buildSwash();
  installBibata();
}

function ubuntuRepo(ctx: Context): void {
  const codename = readOsField("VERSION_CODENAME");
  const sources = `https://pkg.noctalia.dev/deb/noctalia-${codename}.sources`;
  if (!urlExists(sources)) {
    throw new Error(
      `pkg.noctalia.dev has no repo for ubuntu '${codename}' (26.04 resolute or newer is needed)`,
    );
  }
  if (!ctx.pkg.isInstalled("nickh-archive-keyring")) {
    withTmp((tmp) => {
      const deb = join(tmp, "nickh-archive-keyring.deb");
      download("https://pkg.noctalia.dev/deb/nickh-archive-keyring.deb", deb);
      run("dpkg", ["-i", deb]);
    });
  }
  download(sources, `/etc/apt/sources.list.d/noctalia-${codename}.sources`);
  aptUpdate();
}

function readOsField(key: string): string {
  const text = read("/etc/os-release") ?? "";
  const m = new RegExp(`^${key}=(.*)$`, "m").exec(text);
  return (m?.[1] ?? "").replace(/^"(.*)"$/, "$1");
}

function installUbuntu(ctx: Context): void {
  let pkgs = PKGS_UBUNTU;
  // a new enough hyprland built from source (e.g. hyprbuntu) stays; the
  // archive's older hyprland packages would shadow it
  const installed = hyprlandVersion();
  const bin = which("Hyprland");
  if (installed && bin && versionGe(installed, MIN_HYPRLAND) && !succeeds("dpkg", ["-S", bin])) {
    info(`keeping hyprland ${installed} from ${bin}`);
    const skip = new Set(["hyprland", "xdg-desktop-portal-hyprland", "hyprpicker"]);
    pkgs = pkgs.filter((p) => !skip.has(p));
  }
  ctx.pkg.install(pkgs);
  ctx.pkg.install(SWASH_BUILD_UBUNTU);
  buildSwash();
  installBibata();
  installAdwGtk3();
}

/** Checks, then installs the hyprland + noctalia session for this distro. */
export function desktopInstall(ctx: Context): void {
  const { distro } = ctx;

  // version/arch checks that need no repo changes
  if (!preflightOs(ctx)) throw new Error("desktop checks failed, nothing was installed");

  // repos that decide which hyprland version is on offer
  if (distro === "fedora") fedoraRepos();
  else if (distro === "ubuntu") aptUpdate();

  const candidate = hyprlandCandidate(distro);
  if (!candidate) throw new Error(`no hyprland package found for ${distro}`);
  if (!preflight(candidate)) throw new Error("desktop checks failed, nothing was installed");

  switch (distro) {
    case "cachyos":
      installCachy(ctx);
      break;
    case "arch":
      installArch(ctx);
      break;
    case "fedora":
      installFedora(ctx);
      break;
    case "ubuntu":
      ubuntuRepo(ctx);
      installUbuntu(ctx);
      break;
  }

  const v = new Verifier(process.env.PATH ?? "");
  verifyDesktop(ctx, v);
  if (v.failures.length > 0) throw new Error(`desktop verify failed: ${v.failures.join(", ")}`);
}

const GREETD_CONFIG = `[terminal]
vt = 1

[default_session]
command = "/usr/bin/noctalia-greeter-session"
user = "greeter"
`;

/** Opt-in: noctalia-greeter (greetd) as the login screen, with passwordless appearance sync for the user. */
export function desktopGreeter(ctx: Context): void {
  if (!which("noctalia")) throw new Error("install the desktop first (noctalia is missing)");

  switch (ctx.distro) {
    case "cachyos":
      ctx.pkg.install(["greetd", "noctalia-greeter"]);
      break;
    case "arch":
      ctx.pkg.install(["greetd"]);
      aurInstall(ctx.user, ["noctalia-greeter"]);
      break;
    case "fedora":
      ctx.pkg.install(["greetd", "noctalia-greeter-git"]);
      break;
    case "ubuntu":
      ctx.pkg.install(["greetd", "noctalia-greeter"]);
      break;
  }

  const config = "/etc/greetd/config.toml";
  const current = read(config);
  if (current === null || !current.includes("noctalia-greeter-session")) {
    if (current !== null) copyFileSync(config, `${config}.pre-noctalia`);
    ensureFile(config, GREETD_CONFIG);
  }

  // lets noctalia's [shell.greeter_sync] auto_sync push the wallpaper and
  // colors without an admin prompt each time
  run("noctalia-greeter", ["passwordless-sync", "enable", ctx.user.name]);

  if (ctx.container || !existsSync("/run/systemd/system")) {
    warn("systemd isn't running (container?), greetd not enabled");
    return;
  }
  const dm = displayManager();
  if (dm && dm !== "greetd") {
    info(`disabling ${dm} in favour of greetd`);
    run("systemctl", ["disable", `${dm}.service`]);
  }
  run("systemctl", ["enable", "greetd.service"]);
  info("greetd takes over at the next boot");
}

/** Post-install checks, recorded through the Verifier so failures count. */
export function verifyDesktop(_ctx: Context, v: Verifier): void {
  v.section("desktop verify");
  v.commands(
    "Hyprland",
    "hyprctl",
    "hyprpicker",
    "noctalia",
    "uwsm",
    "qt6ct",
    "grim",
    "slurp",
    "wl-copy",
    "jq",
    "dolphin",
  );

  const version = hyprlandVersion();
  v.check(
    version
      ? `hyprland ${version} supports the lua config (>= ${MIN_HYPRLAND})`
      : `hyprland >= ${MIN_HYPRLAND} (missing)`,
    () => version !== "" && versionGe(version, MIN_HYPRLAND),
  );

  const major = noctaliaMajor();
  v.check(
    major !== null ? `noctalia v${major} is v5` : "noctalia v5 (missing)",
    () => major !== null && major >= 5,
  );

  if (existsSync("/usr/share/wayland-sessions/hyprland-uwsm.desktop"))
    ok("uwsm hyprland session entry");
  else
    warnLine(
      "no hyprland-uwsm.desktop session entry, start hyprland with 'uwsm start hyprland.desktop'",
    );
}
