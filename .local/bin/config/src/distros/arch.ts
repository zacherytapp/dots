// CachyOS and Arch Linux. CachyOS is the reference machine; plain Arch gets the
// same steps minus the cachyos-repo packages, with oh-my-zsh instead of
// cachyos-zsh-config and paru built from the AUR.
//
// The base system (kernel, bootloader, drivers, firmware, audio, snapper)
// comes from the distro installer and isn't listed here.

import { existsSync, lstatSync, readlinkSync } from "node:fs";
import { join } from "node:path";
import { desktopGreeter, desktopInstall, verifyDesktop } from "../desktop/desktop.ts";
import { capture, run, which } from "../lib/exec.ts";
import { editLines, ensureFile, read } from "../lib/files.ts";
import { note } from "../lib/log.ts";
import { aurInstall, pacman } from "../lib/pkg.ts";
import { step } from "../lib/steps.ts";
import { enableService, setHostname } from "../lib/system.ts";
import { setupPath } from "../lib/context.ts";
import { installAgents, installClaude, installHerdr } from "../steps/agents.ts";
import { stowDotfiles } from "../steps/dotfiles.ts";
import { setupDictation, verifyDictation } from "../steps/dictation.ts";
import { syncNeovimPlugins } from "../steps/editor.ts";
import {
  configureGit,
  configureKeys,
  installOhMyZsh,
  installTpm,
  setLoginShellZsh,
} from "../steps/identity.ts";
import { installPmd, salesforceStep } from "../steps/salesforce.ts";
import {
  configureFail2ban,
  configureUfw,
  enableMdns,
  hardenSshd,
  randomizeMac,
} from "../steps/security.ts";
import {
  goToolBin,
  installGoTools,
  installNode,
  installRust,
  installTask,
} from "../steps/toolchains.ts";
import { verifyCommon } from "../verify/common.ts";
import type { Context } from "../lib/context.ts";
import type { Distro } from "./types.ts";

const BASE = [
  "base-devel",
  "git",
  "git-lfs",
  "curl",
  "wget",
  "rsync",
  "unzip",
  "unrar",
  "zip",
  "jq",
  "man-db",
  "man-pages",
  "less",
  "openssh",
  "gnupg",
  "pass",
  "btop",
  "fastfetch",
  "duf",
  "glances",
  "plocate",
  "htop",
  "cpupower",
  "pacman-contrib",
  "reflector",
  "networkmanager",
  "networkmanager-openvpn",
  "wireguard-tools",
  "bluez",
  "bluez-utils",
];

// Neovim's external tools (see verify/common.ts): pickers, git UIs, ctags for
// ctags_lsp, tree-sitter-cli 0.25+ for nvim-treesitter main, pynvim, a
// clipboard provider, and a C toolchain (base-devel) for parser builds
const SHELL_TOOLS = [
  "zsh",
  "kitty",
  "ghostty",
  "tmux",
  "github-cli",
  "lazygit",
  "git-delta",
  "fzf",
  "ripgrep",
  "fd",
  "bat",
  "stow",
  "ctags",
  "vim",
  "neovim",
  "luarocks",
  "python-pynvim",
  "tree-sitter-cli",
  "cmake",
  "gettext",
  "wl-clipboard",
  "xclip",
  "shellcheck",
  "tea",
];

// jdk-openjdk is the current release (17+ for the Apex LSP, PMD and Code Analyzer)
const LANGUAGES = [
  "go",
  "jdk-openjdk",
  "ruby",
  "perl",
  "php",
  "php-apache",
  "composer",
  "python",
  "python-pip",
  "python-pipx",
  "python-websockets",
  "uv",
];

const CONTAINERS = [
  "docker",
  "docker-compose",
  "docker-buildx",
  "lazydocker",
  "ansible",
  "opentofu",
  "terraform",
  "tailscale",
];

// the Hyprland + Noctalia session itself is the desktop step
const DESKTOP = ["xdg-user-dirs", "playerctl", "pavucontrol"];

const APPS = [
  "firefox",
  "thunderbird",
  "obsidian",
  "discord",
  "libreoffice-fresh",
  "remmina",
  "nautilus",
  "meld",
  "gimp",
  "darktable",
  "digikam",
  "opencv",
  "vlc",
  "vlc-plugins-all",
  "gpu-screen-recorder",
  "obs-studio",
  "proton-vpn-gtk-app",
  "flatpak",
];

// ghostty and kitty use JetBrainsMono Nerd, Symbols Nerd, Fira Code and Maple
// Mono (AUR); MesloLGS Nerd is the powerlevel10k font
const FONTS = [
  "noto-fonts",
  "noto-fonts-cjk",
  "noto-fonts-emoji",
  "ttf-jetbrains-mono-nerd",
  "ttf-nerd-fonts-symbols",
  "ttf-nerd-fonts-symbols-mono",
  "ttf-fira-code",
  "ttf-firacode-nerd",
  "ttf-meslo-nerd",
  "ttf-dejavu",
  "ttf-liberation",
  "ttf-opensans",
];

const PRINTING = [
  "cups",
  "cups-filters",
  "cups-pdf",
  "ghostscript",
  "gutenprint",
  "foomatic-db",
  "foomatic-db-engine",
  "foomatic-db-ppds",
  "foomatic-db-gutenprint-ppds",
  "foomatic-db-nonfree",
  "foomatic-db-nonfree-ppds",
  "system-config-printer",
];

const SECURITY = ["ufw", "fail2ban", "avahi", "nss-mdns"];

/** cachyos repo only. */
const CACHY_ONLY = [
  "cachyos-zsh-config",
  "opencode",
  "cachy-update",
  "cachyos-samba-settings",
  "dmemcg-booster",
  "appmenu-gtk-module",
  "libdbusmenu-glib",
  // AUR-only on plain Arch
  "opendeck",
  "winboat",
];

const AUR = [
  "1password",
  "1password-cli",
  "lmstudio-bin",
  "google-chrome",
  "slack-desktop",
  "spotify",
  "visual-studio-code-bin",
  "zoom",
  "bibata-cursor-theme-bin",
  "maplemono-ttf",
];

const FLATPAKS = ["com.github.tchx84.Flatseal", "app.bluebubbles.BlueBubbles"];

// the forgejo MCP server the agents' MCP configs launch
const GO_TOOLS = ["git.b4mad.industries/agentic-forges/forgejo-mcp/v3@latest"];

const GAMING_CACHY = ["cachyos-gaming-meta", "cachyos-gaming-applications", "protonup-qt"];
const GAMING_ARCH = [
  "steam",
  "gamemode",
  "lib32-gamemode",
  "mangohud",
  "lib32-mangohud",
  "wine",
  "lutris",
];

const KVM = [
  "qemu-desktop",
  "libvirt",
  "virt-manager",
  "edk2-ovmf",
  "swtpm",
  "dnsmasq",
  "openbsd-netcat",
  "libguestfs",
];

const isCachy = (ctx: Context) => ctx.distro === "cachyos";

function preflight(ctx: Context): void {
  // colored output and parallel downloads (CachyOS enables these already)
  editLines("/etc/pacman.conf", (line) =>
    line === "#Color"
      ? "Color"
      : /^#?ParallelDownloads/.test(line)
        ? "ParallelDownloads = 10"
        : line,
  );
  // full upgrade first: installing on a stale system is a partial upgrade
  if (ctx.settings.skipUpgrade) note("skipped upgrade: SKIP_UPGRADE is set");
  else pacman.upgrade();
  pacman.install(["base-devel", "git", "curl", "sudo"]);

  if (which("paru")) return;
  // packaged in the cachyos repo; built from the AUR elsewhere
  if (isCachy(ctx)) return pacman.install(["paru"]);
  const build = ctx.user.output("mktemp", ["-d"]);
  try {
    ctx.user.run("git", [
      "clone",
      "--quiet",
      "https://aur.archlinux.org/paru-bin.git",
      `${build}/paru-bin`,
    ]);
    ctx.user.run("makepkg", ["-si", "--noconfirm"], { cwd: `${build}/paru-bin` });
  } finally {
    run("rm", ["-rf", build]);
  }
}

function packages(ctx: Context): void {
  pacman.install([...BASE, ...SHELL_TOOLS, ...LANGUAGES]);
  pacman.install(CONTAINERS);
  pacman.install([...DESKTOP, ...APPS, ...FONTS]);
  pacman.install([...PRINTING, ...SECURITY]);
  if (isCachy(ctx)) pacman.install(CACHY_ONLY);
}

function shell(ctx: Context): void {
  // on CachyOS, oh-my-zsh, powerlevel10k and the plugins come from cachyos-zsh-config
  if (!isCachy(ctx)) installOhMyZsh(ctx);
  setLoginShellZsh(ctx);
}

function docker(ctx: Context): void {
  run("usermod", ["-aG", "docker", ctx.user.name]);
  enableService(ctx, "docker.service");
}

function services(ctx: Context): void {
  enableService(ctx, "NetworkManager.service");
  enableService(ctx, "sshd.service");
  enableService(ctx, "bluetooth.service");
  enableService(ctx, "cups.socket");
  enableService(ctx, "tailscaled.service");
  enableService(ctx, "reflector.timer");
  sshAgentSocket(ctx);
  if (!isCachy(ctx)) return;
  // cachy-update's user timer (update checks + tray notifier). Linked by hand
  // because systemctl --user needs the user's session bus, which sudo lacks
  const wants = ctx.user.path(".config", "systemd", "user", "timers.target.wants");
  const link = join(wants, "arch-update.timer");
  const target = "/usr/lib/systemd/user/arch-update.timer";
  if (isLinkTo(link, target)) return;
  ctx.user.mkdir(wants);
  ctx.user.run("ln", ["-sfn", target, link]);
}

const SSH_AGENT_SOCKET = "/usr/lib/systemd/user/ssh-agent.socket";

/**
 * openssh's user ssh-agent, which .zshrc points SSH_AUTH_SOCK at. Linked by
 * hand for the same reason as the arch-update timer.
 */
function sshAgentSocket(ctx: Context): void {
  if (!existsSync(SSH_AGENT_SOCKET)) return note("no ssh-agent.socket user unit in openssh");
  const wants = ctx.user.path(".config", "systemd", "user", "sockets.target.wants");
  const link = join(wants, "ssh-agent.socket");
  if (isLinkTo(link, SSH_AGENT_SOCKET)) return;
  ctx.user.mkdir(wants);
  ctx.user.run("ln", ["-sfn", SSH_AGENT_SOCKET, link]);
}

function isLinkTo(path: string, target: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink() && readlinkSync(path) === target;
  } catch {
    return false;
  }
}

/**
 * pacman hook that dumps the installed packages into the repo after every
 * transaction, so `git diff` shows drift from the curated lists here. It
 * writes as the user (runuser): a root redirect into the user's checkout would
 * follow any symlink planted there.
 */
function paclistHook(ctx: Context): void {
  const template = read(setupPath("cachy", "config", "hooks", "96-paclist.hook"));
  if (template === null) throw new Error("cachy/config/hooks/96-paclist.hook is missing");
  ensureFile(
    "/etc/pacman.d/hooks/96-paclist.hook",
    renderPaclistHook(template, setupPath("cachy"), ctx.user.name, ctx.user.home),
  );
}

/**
 * The dir and home are the sh script's $1 and $2 (home holds
 * ~/.config/cachy/pkglist.ignore, the packages left out of the lists), never
 * part of the script text, so the shell doesn't parse them. pacman splits Exec
 * into words itself, honouring quotes: double quotes keep spaces and single
 * quotes; `"`, `\` and newlines can't be passed safely, so those are refused.
 */
export function renderPaclistHook(
  template: string,
  dir: string,
  user: string,
  home: string,
): string {
  for (const path of [dir, home]) {
    if (/["\\\n]/.test(path)) throw new Error(`can't put ${path} in a pacman hook Exec line`);
  }
  if (!/^[a-z_][a-z0-9_-]*\$?$/i.test(user)) throw new Error(`unexpected user name ${user}`);
  return template
    .replaceAll("@DIR@", `"${dir}"`)
    .replaceAll("@HOME@", `"${home}"`)
    .replaceAll("@USER@", user);
}

function flatpak(ctx: Context): void {
  run("flatpak", [
    "remote-add",
    "--if-not-exists",
    "flathub",
    "https://dl.flathub.org/repo/flathub.flatpakrepo",
  ]);
  if (ctx.container) return note("skipped: container (flatpak install)");
  for (const pak of FLATPAKS) {
    if (capture("flatpak", ["info", pak]).status === 0) continue;
    run("flatpak", ["install", "--noninteractive", "flathub", pak]);
  }
}

/**
 * Uncomments [multilib] and syncs it. This upgrades even with SKIP_UPGRADE:
 * the lib32 packages need a fresh sync, and -Sy without -u followed by an
 * install is a partial upgrade. Checks the sync db as well as pacman.conf, so a
 * run that enabled the repo but failed to sync retries the sync.
 */
function enableMultilib(ctx: Context): void {
  const enabled = /^\[multilib\]/m.test(read("/etc/pacman.conf") ?? "");
  if (enabled && existsSync("/var/lib/pacman/sync/multilib.db")) return;
  if (!enabled) {
    let inMultilib = false;
    editLines("/etc/pacman.conf", (line) => {
      if (line === "#[multilib]") {
        inMultilib = true;
        return "[multilib]";
      }
      if (inMultilib && line.startsWith("#Include")) {
        inMultilib = false;
        return line.slice(1);
      }
      return line;
    });
    if (!/^\[multilib\]/m.test(read("/etc/pacman.conf") ?? "")) {
      throw new Error("/etc/pacman.conf has no #[multilib] section to enable");
    }
  }
  if (ctx.settings.skipUpgrade) note("multilib needs a full upgrade; SKIP_UPGRADE doesn't apply");
  pacman.upgrade();
}

function gaming(ctx: Context): void {
  if (isCachy(ctx)) return pacman.install(GAMING_CACHY);
  enableMultilib(ctx);
  pacman.install(GAMING_ARCH);
  aurInstall(ctx.user, ["protonup-qt"]);
}

function kvm(ctx: Context): void {
  pacman.install(KVM);
  run("usermod", ["-aG", "libvirt", ctx.user.name]);
  ctx.user.mkdir(
    ctx.user.path(".local", "libvirt", "images"),
    ctx.user.path(".local", "libvirt", "share"),
  );
  // reach guests on the default NAT network by name
  editLines("/etc/nsswitch.conf", (line) =>
    line.startsWith("hosts:") && !line.includes("libvirt")
      ? line.replace(" files", " files libvirt libvirt_guest")
      : line,
  );
  // libvirt's nftables rules bypass ufw; iptables keeps them in ufw's chains
  editLines("/etc/libvirt/network.conf", (line) =>
    /^#?\s*firewall_backend\s*=/.test(line) ? 'firewall_backend = "iptables"' : line,
  );
  enableService(ctx, "libvirtd.socket");
}

const jail = () => setupPath("cachy", "config", "jail.local");

export const arch: Distro = {
  pkg: pacman,
  plan(ctx) {
    const cachy = isCachy(ctx);
    return {
      defaults: [
        step("preflight", "pacman.conf, full upgrade, paru", preflight),
        step("packages", "repo packages: tools, languages, apps, fonts, printing", packages),
        step("aur", "AUR packages through paru", (c) => aurInstall(c.user, AUR)),
        step("desktop", "Hyprland + Noctalia, after its checks", desktopInstall),
        step("stow", "link the repo into $HOME, backing up files in the way", stowDotfiles),
        step(
          "shell",
          cachy ? "zsh as the login shell" : "oh-my-zsh, powerlevel10k, zsh login shell",
          shell,
        ),
        step("git", "git identity, only where unset", configureGit),
        step("rust", "rustup, rust-analyzer, rust-src", (c) => installRust(c)),
        step("node", "nvm + node LTS, pnpm and its globals (sf, lwc server, tree-sitter)", (c) =>
          installNode(c),
        ),
        step("pmd", "PMD 7 in /opt/pmd", installPmd),
        step("go", "go tools: the forgejo MCP server", (c) => installGoTools(c, GO_TOOLS)),
        step("task", "Task (taskfile.dev) as task in ~/.local/bin", installTask),
        step(
          "salesforce",
          "Apex/Visualforce/Aura language servers, sf code-analyzer",
          salesforceStep,
        ),
        step("tmux", "tmux plugin manager", installTpm),
        step("herdr", "herdr and its claude integration", installHerdr),
        step("claude", "Claude Code and its statusline", installClaude),
        step("agents", "plannotator, pi, opencode; check skills, rules and hooks", (c) =>
          installAgents(c, { opencode: !cachy }),
        ),
        step("nvim", "neovim plugins at lazy-lock.json", syncNeovimPlugins),
        step(
          "dictation",
          "hyprwhspr push-to-talk dictation, local faster-whisper (cuda or cpu)",
          (c) => {
            // hyprwhspr's optional deps: suspend/resume handling and the mic-osd overlay
            // (without python-gobject, setup tries to build PyGObject with pip)
            pacman.install(["python-gobject", "python-dbus", "gtk4-layer-shell"]);
            aurInstall(c.user, ["hyprwhspr"]);
            setupDictation(c);
          },
        ),
        step("docker", "docker group and service", docker),
        step(
          "services",
          "networkmanager, sshd, bluetooth, cups, tailscale, reflector, ssh-agent",
          services,
        ),
        ...(cachy
          ? [step("hooks", "pacman hook writing the package lists into the repo", paclistHook)]
          : []),
        step("firewall", "ufw rules", (c) => configureUfw(c)),
        step("fail2ban", "fail2ban sshd jail", (c) => configureFail2ban(c, jail())),
        step("network", "MAC randomization, sshd hardening", (c) => {
          randomizeMac();
          hardenSshd(c);
        }),
        step("discovery", "mDNS through avahi", enableMdns),
        step("keys", "gpg, pass and ssh keys", configureKeys),
        step("hostname", "set the hostname", setHostname),
        step("flatpak", "flathub and flatpaks", flatpak),
      ],
      optional: [
        step("greeter", "noctalia-greeter on greetd as the login screen", desktopGreeter),
        step(
          "gaming",
          cachy ? "cachyos gaming meta packages" : "multilib, steam, gamemode, protonup-qt",
          gaming,
        ),
        step("kvm", "qemu/libvirt with ufw-compatible networking", kvm),
      ],
    };
  },
  verify(ctx, v) {
    const cachy = isCachy(ctx);
    v.section("commands");
    v.commands(
      "paru",
      "git",
      "git-lfs",
      "gh",
      "lazygit",
      "zsh",
      "tmux",
      "nvim",
      "vim",
      "kitty",
      "ghostty",
      "stow",
      "rg",
      "fd",
      "fzf",
      "bat",
      "jq",
      "ctags",
      "tree-sitter",
      "cmake",
      "go",
      "java",
      "ruby",
      "php",
      "composer",
      "python",
      "pipx",
      "uv",
      "perl",
      "docker",
      "docker-compose",
      "lazydocker",
      "ansible",
      "tofu",
      "terraform",
      "tailscale",
      "firefox",
      "thunderbird",
      "obsidian",
      "discord",
      "code",
      "1password",
      "google-chrome-stable",
      "slack",
      "spotify",
      "zoom",
      "ufw",
      "fail2ban-client",
      "pass",
      "gpg",
      "ssh-keygen",
      "flatpak",
      "luarocks",
      "op",
      "tea",
      "htop",
      "cpupower",
      "task",
      "obs",
      "with-secrets",
      ...GO_TOOLS.map(goToolBin),
    );
    if (cachy) v.commands("opendeck");
    verifyCommon(ctx, v);

    v.section("distro config");
    if (cachy) {
      v.check("oh-my-zsh (cachyos-zsh-config)", () =>
        existsSync("/usr/share/cachyos-zsh-config/cachyos-config.zsh"),
      );
      v.check("arch-update timer enabled", () =>
        existsSync(
          ctx.user.path(".config", "systemd", "user", "timers.target.wants", "arch-update.timer"),
        ),
      );
    } else {
      v.check("oh-my-zsh", () => existsSync(ctx.user.path(".oh-my-zsh", "oh-my-zsh.sh")));
      v.check("powerlevel10k", () =>
        existsSync(ctx.user.path(".oh-my-zsh", "custom", "themes", "powerlevel10k")),
      );
    }
    v.check("maple mono font", () => /maple mono/i.test(capture("fc-list").stdout));
    v.check("jetbrains mono nerd font", () =>
      /JetBrainsMono Nerd/i.test(capture("fc-list").stdout),
    );
    v.check("bibata cursor", () => existsSync("/usr/share/icons/Bibata-Modern-Ice"));
    v.check("ssh-agent socket enabled", () =>
      isLinkTo(
        ctx.user.path(".config", "systemd", "user", "sockets.target.wants", "ssh-agent.socket"),
        SSH_AGENT_SOCKET,
      ),
    );
    v.check("in docker group", () =>
      capture("id", ["-nG", ctx.user.name]).stdout.split(/\s+/).includes("docker"),
    );
    v.check("fail2ban jail.local", () => existsSync("/etc/fail2ban/jail.local"));
    v.check(
      "ufw ssh rule",
      () => capture("sudo", ["-n", "grep", "-q", "dport 22", "/etc/ufw/user.rules"]).status === 0,
    );
    v.check("mac randomization", () =>
      existsSync("/etc/NetworkManager/conf.d/randomize_mac_address.conf"),
    );
    v.check("sshd hardening", () => existsSync("/etc/ssh/sshd_config.d/10-hardening.conf"));
    v.check("mdns in nsswitch", () =>
      /^hosts:.*mdns_minimal/m.test(read("/etc/nsswitch.conf") ?? ""),
    );
    v.check("flathub remote", () =>
      /flathub/.test(capture("flatpak", ["remotes", "--system"]).stdout),
    );
    if (cachy)
      v.check("pacman paclist hook", () => existsSync("/etc/pacman.d/hooks/96-paclist.hook"));

    verifyDesktop(ctx, v);
    verifyDictation(ctx, v);
  },
};
