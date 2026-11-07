// systemd and container guards shared by the distro steps.

import { run } from "./exec.ts";
import { record, warn } from "./log.ts";
import type { Context } from "./context.ts";

/** In a container, print a skip notice and return true so the caller can bail out. */
export function skipInContainer(ctx: Context, what: string): boolean {
  if (!ctx.container) return false;
  warn(`skipped: container (${what})`);
  record(`skipped: container (${what})`);
  return true;
}

export function enableService(ctx: Context, ...units: string[]): void {
  if (skipInContainer(ctx, `systemctl enable --now ${units.join(" ")}`)) return;
  run("systemctl", ["enable", "--now", ...units]);
}

export function setHostname(ctx: Context): void {
  if (skipInContainer(ctx, `hostnamectl set-hostname ${ctx.settings.hostname}`)) return;
  run("hostnamectl", ["set-hostname", ctx.settings.hostname]);
}
