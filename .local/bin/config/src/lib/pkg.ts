// System package managers. Each install only asks for what is missing, so a
// re-run doesn't reinstall, upgrade or rebuild anything.

import { attempt, capture, run, succeeds } from "./exec.ts";
import { note, warn } from "./log.ts";
import type { User } from "./user.ts";

export interface PackageManager {
  readonly name: "pacman" | "dnf" | "apt";
  isInstalled(pkg: string): boolean;
  /** Install the packages that aren't installed yet. */
  install(pkgs: readonly string[]): void;
  /** Refresh metadata and upgrade the whole system. */
  upgrade(): void;
}

function missing(pm: PackageManager, pkgs: readonly string[]): string[] {
  return [...new Set(pkgs)].filter((p) => !pm.isInstalled(p));
}

export const pacman: PackageManager = {
  name: "pacman",
  isInstalled(pkg) {
    // -T resolves provides too (e.g. "java-runtime"), like `pacman -S` would
    return capture("pacman", ["-T", pkg]).status === 0;
  },
  install(pkgs) {
    const todo = missing(this, pkgs);
    if (todo.length === 0) return note("packages already installed");
    run("pacman", ["-S", "--needed", "--noconfirm", ...todo]);
  },
  upgrade() {
    run("pacman", ["-Syu", "--noconfirm"]);
  },
};

export const dnf: PackageManager = {
  name: "dnf",
  isInstalled(pkg) {
    return succeeds("rpm", ["-q", "--whatprovides", pkg]);
  },
  install(pkgs) {
    const todo = missing(this, pkgs);
    if (todo.length === 0) return note("packages already installed");
    note(`installing: ${todo.join(" ")}`);
    if (attempt("dnf", ["install", "-y", ...todo]) === 0) return;
    // one stale name must not block the rest; install what exists, then fail
    warn(`dnf could not install all of: ${todo.join(" ")}; retrying with --skip-unavailable`);
    run("dnf", ["install", "-y", "--skip-unavailable", ...todo]);
    const still = missing(this, todo);
    if (still.length > 0) throw new Error(`dnf: not installed: ${still.join(" ")}`);
  },
  upgrade() {
    run("dnf", ["upgrade", "-y", "--refresh"]);
  },
};

export const apt: PackageManager = {
  name: "apt",
  isInstalled(pkg) {
    const res = capture("dpkg-query", ["-W", "-f=${Status}", pkg]);
    return res.status === 0 && res.stdout.includes("install ok installed");
  },
  install(pkgs) {
    const todo = missing(this, pkgs);
    if (todo.length === 0) return note("packages already installed");
    note(`installing: ${todo.join(" ")}`);
    run("apt-get", ["install", "-y", "-q", ...todo], {
      env: { DEBIAN_FRONTEND: "noninteractive" },
    });
  },
  upgrade() {
    aptUpdate();
    run("apt-get", ["full-upgrade", "-y", "-q"], { env: { DEBIAN_FRONTEND: "noninteractive" } });
  },
};

export function aptUpdate(): void {
  run("apt-get", ["update", "-q"]);
}

/**
 * AUR packages through paru (yay as a fallback), run as the user: both refuse
 * to run as root and escalate with sudo themselves. Only the missing ones, as
 * --needed still rebuilds an installed AUR package when upstream moved.
 */
export function aurInstall(user: User, pkgs: readonly string[]): void {
  const todo = missing(pacman, pkgs);
  if (todo.length === 0) return note("AUR packages already installed");
  const helper = ["paru", "yay"].find((h) => user.which(h) !== null);
  if (!helper) throw new Error(`no AUR helper (paru or yay) to install: ${todo.join(" ")}`);
  const args = ["-S", "--needed", "--noconfirm", ...(helper === "paru" ? ["--skipreview"] : [])];
  user.run(helper, [...args, ...todo]);
}
