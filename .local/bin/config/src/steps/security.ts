// Firewall, fail2ban, sshd hardening and mDNS. Shared by every distro; the
// differences (firewalld on Fedora, NetworkManager config on Arch) are options.

import { capture, run } from "../lib/exec.ts";
import { editLines, ensureFile, installFile, read } from "../lib/files.ts";
import { note } from "../lib/log.ts";
import { enableService, skipInContainer } from "../lib/system.ts";
import type { Context } from "../lib/context.ts";

/** ufw rules are written to /etc/ufw even while ufw is inactive. */
export function configureUfw(
  ctx: Context,
  opts: { disableFirewalld?: boolean; rulesNeedNetfilter?: boolean } = {},
): void {
  ctx.pkg.install(["ufw"]);
  if (opts.rulesNeedNetfilter && skipInContainer(ctx, "ufw rules and enable (need netfilter)"))
    return;
  const ufw = (...args: string[]) => run("ufw", args);
  ufw("default", "deny", "incoming");
  ufw("default", "allow", "outgoing");
  ufw("limit", "22/tcp");
  ufw("allow", "80/tcp");
  ufw("allow", "443/tcp");
  if (ctx.settings.localIp) ufw("allow", "from", ctx.settings.localIp);
  if (skipInContainer(ctx, "ufw enable")) return;
  if (opts.disableFirewalld) capture("systemctl", ["disable", "--now", "firewalld"]);
  ufw("--force", "enable");
  enableService(ctx, "ufw.service");
}

/** `enable --now` leaves a running fail2ban alone, so restart it when jail.local changed. */
export function configureFail2ban(ctx: Context, jailLocal: string): void {
  ctx.pkg.install(["fail2ban"]);
  const changed = installFile(jailLocal, "/etc/fail2ban/jail.local");
  enableService(ctx, "fail2ban.service");
  if (changed && !ctx.container) run("systemctl", ["restart", "fail2ban.service"]);
}

/** sshd_config includes sshd_config.d/*.conf ahead of its own settings. */
export function hardenSshd(ctx: Context): void {
  if (!ensureFile("/etc/ssh/sshd_config.d/10-hardening.conf", "PermitRootLogin no\n")) return;
  // try-: only reloads an sshd that is already running
  if (!skipInContainer(ctx, "reload sshd")) {
    capture("systemctl", ["try-reload-or-restart", "sshd.service"]);
  }
}

export function randomizeMac(): void {
  ensureFile(
    "/etc/NetworkManager/conf.d/randomize_mac_address.conf",
    "[connection-mac-randomization]\nwifi.cloned-mac-address=random\nethernet.cloned-mac-address=random\n",
  );
}

/** Resolve .local hostnames through avahi (wiki.archlinux.org/title/Avahi). */
export function enableMdns(ctx: Context): void {
  const nsconf = "/etc/nsswitch.conf";
  const text = read(nsconf) ?? "";
  if (!/^hosts:.*mdns_minimal/m.test(text)) {
    const anchor = /^hosts:.* resolve/m.test(text) ? " resolve" : " dns";
    editLines(nsconf, (line) =>
      line.startsWith("hosts:")
        ? line.replace(anchor, ` mdns_minimal [NOTFOUND=return]${anchor}`)
        : line,
    );
  }
  note((read(nsconf) ?? "").split("\n").find((l) => l.startsWith("hosts:")) ?? "no hosts: line");
  enableService(ctx, "avahi-daemon.service");
}
