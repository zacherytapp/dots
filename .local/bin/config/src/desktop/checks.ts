// Pre-install and verify checks for the Hyprland + Noctalia desktop.
//
// The dots config needs:
//   - Hyprland >= 0.55: .config/hypr is written in the Lua config format
//   - Noctalia v5: .config/noctalia/config.toml is the v5 (C++) format, the
//     old Quickshell-based noctalia-shell (v4) reads settings.json instead
//   - uwsm: the binds launch apps through `uwsm app --` and the session env
//     lives in .config/uwsm/env
//
// preflightOs and preflight print what they find and return false only for
// problems that make the install pointless: an unsupported release or
// architecture, or a Hyprland too old for the lua config. Everything else is
// a warning, so a re-run on a working machine is a no-op.

import { existsSync, mkdtempSync, readlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { capture, which } from "../lib/exec.ts";
import { blue, green, red, yellow } from "../lib/log.ts";
import type { Context } from "../lib/context.ts";

export const MIN_HYPRLAND = "0.55.0";
export const MIN_FEDORA = "44";
export const MIN_UBUNTU = "26.04";

export const info = (msg: string): void => console.log(blue(`  ${msg}`));
export const ok = (msg: string): void => console.log(green(`  ok    ${msg}`));
export const warnLine = (msg: string): void => console.log(yellow(`  warn  ${msg}`));
export const fail = (msg: string): void => console.log(red(`  FAIL  ${msg}`));

/** Numeric parts of a version string: "0.55.1-2" -> [0, 55, 1]. */
function parts(version: string): number[] {
  const m = /^\d+(?:\.\d+)*/.exec(version.trim());
  return m ? m[0].split(".").map(Number) : [];
}

/** True when version a >= version b (missing components count as 0). */
export function versionGe(a: string, b: string): boolean {
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x > y;
  }
  return true;
}

/** Installed Hyprland version, or "" when not installed. */
export function hyprlandVersion(): string {
  if (!which("Hyprland")) return "";
  let version = "";
  // Hyprland aborts before printing its version when XDG_RUNTIME_DIR is unset,
  // which is the case under sudo and in containers
  const runtime = process.env.XDG_RUNTIME_DIR;
  const tmp = runtime ? null : mkdtempSync(join(tmpdir(), "hypr-"));
  try {
    const res = capture("Hyprland", ["--version"], {
      env: { XDG_RUNTIME_DIR: runtime ?? tmp ?? "" },
      input: "",
    });
    version = /^Hyprland (\d+(?:\.\d+)*)/m.exec(res.stdout)?.[1] ?? "";
  } finally {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  }
  if (version) return version;
  // fall back to the package database
  let raw = "";
  if (which("pacman")) raw = capture("pacman", ["-Q", "hyprland"]).stdout.split(/\s+/)[1] ?? "";
  else if (which("rpm")) raw = capture("rpm", ["-q", "--qf", "%{VERSION}", "hyprland"]).stdout;
  else if (which("dpkg-query")) {
    raw = capture("dpkg-query", ["-W", "-f=${Version}", "hyprland"]).stdout;
  }
  return /^\d+(?:\.\d+)+/.exec(raw.trim())?.[0] ?? "";
}

/** Installed Noctalia major version, or null when not installed. */
export function noctaliaMajor(): number | null {
  if (!which("noctalia")) return null;
  const res = capture("noctalia", ["--version"], { input: "" });
  const m = /^noctalia v?(\d+)/m.exec(res.stdout);
  return m?.[1] ? Number(m[1]) : null;
}

/** The display manager systemd starts, e.g. greetd, sddm, gdm ("" if none). */
export function displayManager(): string {
  try {
    return basename(readlinkSync("/etc/systemd/system/display-manager.service"), ".service");
  } catch {
    return "";
  }
}

/** Distro, release and architecture. Runs before any repo is added. */
export function preflightOs(ctx: Context): boolean {
  const { distro } = ctx;
  const machine =
    process.arch === "x64" ? "x86_64" : process.arch === "arm64" ? "aarch64" : process.arch;
  const version = distro === "arch" || distro === "cachyos" ? "rolling" : ctx.os.versionId;
  console.log(`desktop preflight (${distro} ${version}, ${machine}):`);
  let good = true;

  if (distro === "arch" || distro === "cachyos") {
    ok(`distro: ${distro}`);
  } else if (distro === "fedora") {
    // noctalia is in fedora from 44; the hyprland copr builds 44 and newer
    if (versionGe(version, MIN_FEDORA)) ok(`distro: fedora ${version}`);
    else {
      fail(
        `distro: fedora ${version}, noctalia and the hyprland copr need fedora >= ${MIN_FEDORA}`,
      );
      good = false;
    }
  } else if (distro === "ubuntu") {
    // the noctalia apt repo needs glibc 2.43 / libstdc++ 15, i.e. 26.04
    if (versionGe(version, MIN_UBUNTU)) ok(`distro: ubuntu ${version}`);
    else {
      fail(`distro: ubuntu ${version}, the noctalia apt repo needs ubuntu >= ${MIN_UBUNTU}`);
      good = false;
    }
  }

  if (machine === "x86_64") ok("architecture: x86_64");
  else if (distro === "fedora" && machine === "aarch64") {
    ok("architecture: aarch64 (the hyprland copr builds it)");
  } else if (distro === "arch" || distro === "cachyos") {
    warnLine(`architecture: ${machine}, packages may not be available`);
  } else {
    fail(`architecture: ${machine}, the noctalia/hyprland packages for ${distro} are x86_64 only`);
    good = false;
  }
  return good;
}

/**
 * `candidate` is the Hyprland version the package source would install, so a
 * too-old package is caught before anything is installed. Empty skips that check.
 */
export function preflight(candidate: string): boolean {
  let good = true;

  if (existsSync("/run/systemd/system")) ok("systemd is the init system (uwsm needs it)");
  else warnLine("systemd is not running (container?), services and the session can't be checked");

  const installed = hyprlandVersion();
  if (installed) {
    if (versionGe(installed, MIN_HYPRLAND)) ok(`hyprland ${installed} already installed`);
    else {
      warnLine(
        `hyprland ${installed} is installed but the dots config needs >= ${MIN_HYPRLAND} (lua config)`,
      );
    }
  }

  if (candidate) {
    if (versionGe(candidate, MIN_HYPRLAND))
      ok(`hyprland ${candidate} available from the package source`);
    else {
      fail(
        `hyprland ${candidate} from the package source is older than ${MIN_HYPRLAND}, .config/hypr/hyprland.lua would not load`,
      );
      good = false;
    }
  }

  const major = noctaliaMajor();
  if (major !== null) {
    if (major >= 5) ok(`noctalia v${major} already installed`);
    else warnLine(`noctalia v${major} is installed, the dots config is for v5`);
  }
  if (existsSync("/etc/xdg/quickshell/noctalia-shell") || existsSync("/usr/share/noctalia-shell")) {
    warnLine("the old quickshell noctalia-shell (v4) is installed, remove it so only v5 starts");
  }

  for (const bar of ["waybar", "hyprpanel", "ags"]) {
    if (which(bar))
      warnLine(`${bar} is installed; noctalia replaces it, make sure nothing autostarts it`);
  }

  const dm = displayManager();
  if (dm === "")
    info("no display manager enabled: start with 'uwsm start hyprland-uwsm.desktop' from a tty");
  else if (dm === "greetd") ok("display manager: greetd (noctalia-greeter can use it)");
  else info(`display manager: ${dm}, left as is; pick 'Hyprland (uwsm-managed)' at login`);

  if (hasNvidiaGpu()) warnLine("nvidia gpu: uncomment the nvidia lines in .config/uwsm/env");
  return good;
}

/** An NVIDIA display or 3D controller on the PCI bus (hardware only, says nothing about the driver). */
export function hasNvidiaGpu(): boolean {
  return which("lspci") !== null && /(vga|3d|display).*nvidia/i.test(capture("lspci").stdout);
}
