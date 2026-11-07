// auto-cpufreq on laptops (Fedora and Ubuntu; CachyOS ships its own power
// profiles). Its installer pip-installs into /opt/auto-cpufreq and puts a
// wrapper in /usr/local/bin, so the clone can go once it has run; then
// `auto-cpufreq --install` sets up the daemon. That also disables and masks
// power-profiles-daemon and tuned, and sets bluetooth AutoEnable=false.

import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run, which } from "../lib/exec.ts";
import { note, warn } from "../lib/log.ts";
import { latestGithubTag } from "../lib/net.ts";
import { skipInContainer } from "../lib/system.ts";
import type { Context } from "../lib/context.ts";

const REPO = "AdnanHodzic/auto-cpufreq";
/** Written by `auto-cpufreq --install`; the installer refuses to run while it exists. */
const DAEMON_MARKER = "/usr/local/bin/auto-cpufreq-remove";

function hasBattery(): boolean {
  const dir = "/sys/class/power_supply";
  return existsSync(dir) && readdirSync(dir).some((n) => n.startsWith("BAT"));
}

/**
 * The latest release tag, cloned into a root-owned temp dir rather than
 * ~/temp: the installer runs as root, so it must not run code any user process
 * could have edited. A tag, not a bare --depth 1 of master: the build uses
 * poetry-dynamic-versioning with strict = true, which fails without a tag.
 */
export function installAutoCpufreq(ctx: Context): void {
  if (skipInContainer(ctx, "auto-cpufreq (systemd daemon)")) return;
  if (!hasBattery()) return warn("skipped: no battery, not installing auto-cpufreq");
  if (which("auto-cpufreq") && existsSync(DAEMON_MARKER)) {
    return note("auto-cpufreq already installed");
  }
  if (!which("auto-cpufreq")) {
    const tag = latestGithubTag(REPO);
    const tmp = mkdtempSync(join(tmpdir(), "dots-auto-cpufreq-"));
    try {
      const src = join(tmp, "auto-cpufreq");
      run("git", [
        "clone",
        "--quiet",
        "--depth",
        "1",
        "--branch",
        tag,
        `https://github.com/${REPO}.git`,
        src,
      ]);
      // it installs its own dependencies with apt-get/dnf
      run("./auto-cpufreq-installer", ["--install"], {
        cwd: src,
        env: { DEBIAN_FRONTEND: "noninteractive" },
      });
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
  // a separate check, so a run that failed after the tool install retries this
  run("auto-cpufreq", ["--install"], { input: "" });
}
