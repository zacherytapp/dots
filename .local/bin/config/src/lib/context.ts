// What every step gets: who it installs for, the settings, the distro and the
// paths of the checkout it runs from.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { succeeds, which } from "./exec.ts";
import type { PackageManager } from "./pkg.ts";
import type { User } from "./user.ts";

export interface Settings {
  userName: string;
  userEmail: string;
  hostname: string;
  /** CIDR to allow through ufw, or "" to skip. */
  localIp: string;
  nonInteractive: boolean;
  skipUpgrade: boolean;
}

export type DistroId = "cachyos" | "arch" | "fedora" | "ubuntu";

export interface OsRelease {
  id: string;
  idLike: string[];
  versionId: string;
  prettyName: string;
}

export interface Context {
  user: User;
  settings: Settings;
  distro: DistroId;
  os: OsRelease;
  pkg: PackageManager;
  container: boolean;
  /** .local/bin/config, where install.sh lives. */
  setupDir: string;
  /** The dotfiles checkout (the stow package root). */
  repoDir: string;
}

/** .local/bin/config, from this file's location (src/lib/context.ts). */
export const setupDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const repoDir = resolve(setupDir, "..", "..", "..");

export function setupPath(...parts: string[]): string {
  return join(setupDir, ...parts);
}

export function readOsRelease(path = "/etc/os-release"): OsRelease {
  const fields: Record<string, string> = {};
  const text = existsSync(path) ? readFileSync(path, "utf8") : "";
  for (const line of text.split("\n")) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m?.[1] && m[2] !== undefined) fields[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
  return {
    id: fields.ID ?? "",
    idLike: (fields.ID_LIKE ?? "").split(/\s+/).filter(Boolean),
    versionId: fields.VERSION_ID ?? "",
    prettyName: fields.PRETTY_NAME ?? fields.ID ?? "unknown",
  };
}

export function detectDistro(os: OsRelease): DistroId | null {
  switch (os.id) {
    case "cachyos":
      return "cachyos";
    case "arch":
    case "endeavouros":
      return "arch";
    case "fedora":
      return "fedora";
    case "ubuntu":
      return "ubuntu";
  }
  if (os.idLike.includes("arch")) return "arch";
  return null;
}

/** docker/podman/systemd-nspawn: no init system, no kernel modules. */
export function isContainer(): boolean {
  if (which("systemd-detect-virt") && succeeds("systemd-detect-virt", ["--container", "--quiet"])) {
    return true;
  }
  return existsSync("/.dockerenv") || existsSync("/run/.containerenv");
}
