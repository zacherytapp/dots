// Fedora (dnf5). Third-party software comes from rpmfusion, a few coprs, the
// Google, Brave, 1Password, Azul and Docker repos, and release tarballs.
//
// Neovim is built from source into /usr/local; the language toolchains are
// user-level installs (rustup, nvm, pyenv, pipx, gems, Go tools).

import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { capture, run, which } from "../lib/exec.ts";
import { ensureFile, read } from "../lib/files.ts";
import { note, warn } from "../lib/log.ts";
import { download } from "../lib/net.ts";
import { dnf } from "../lib/pkg.ts";
import { step } from "../lib/steps.ts";
import { enableService, setHostname, skipInContainer } from "../lib/system.ts";
import { setupPath } from "../lib/context.ts";
import { desktopGreeter, desktopInstall, verifyDesktop } from "../desktop/desktop.ts";
import { installAgents, installClaude, installHerdr } from "../steps/agents.ts";
import { stowDotfiles } from "../steps/dotfiles.ts";
import { installAutoCpufreq } from "../steps/power.ts";
import { syncNeovimPlugins } from "../steps/editor.ts";
import {
  configureGit,
  configureKeys,
  installOhMyZsh,
  installTpm,
  setLoginShellZsh,
} from "../steps/identity.ts";
import { installPmd, salesforceStep } from "../steps/salesforce.ts";
import { configureFail2ban, configureUfw } from "../steps/security.ts";
import {
  BREW_PREFIX,
  installGems,
  installHomebrew,
  installGoTools,
  installNode,
  installPipxTools,
  installPyenv,
  installRust,
} from "../steps/toolchains.ts";
import { verifyCommon } from "../verify/common.ts";
import { configureGnome, configureGtkTheme } from "./gnome.ts";
import type { Context } from "../lib/context.ts";
import type { Distro } from "./types.ts";

const SYSTEM_UTILS = [
  "htop",
  "btop",
  "stow",
  "fastfetch",
  "fzf",
  "jq",
  "fd-find",
  "ripgrep",
  "wget2-wget",
  "glibc-gconv-extra",
  "gitlint",
  "tree",
  "powertop",
  "tuned-utils",
  "gnome-shell-extension-appindicator",
  "rsync",
  "xclip",
  "wl-clipboard",
  "cabextract",
  "xorg-x11-font-utils",
  "fontconfig",
  "libva",
  "libva-utils",
  "chafa",
  "pass",
  "gnupg2",
  "meson",
  "gstreamer1-vaapi",
  "gstreamer1-plugin-openh264",
  "mozilla-openh264",
  "fira-code-fonts",
  "papirus-icon-theme",
  "sassc",
  "ufw",
  "fail2ban",
  "libglvnd-glx",
  "libglvnd-opengl",
  "pkgconf-pkg-config",
  "pipx",
  "iproute",
  "procps-ng",
  "which",
  "hostname",
  "openssh-clients",
  "tar",
  "xz",
  "git-lfs",
];

// Neovim's build dependencies, plus the external tools its plugins, mason and
// the Salesforce tooling shell out to (see verify/common.ts): ctags for
// ctags_lsp, gh, delta, unzip/gzip/tar for mason, shellcheck, pip for pynvim
const NEOVIM_PRE = [
  "ninja-build",
  "cmake",
  "gcc",
  "make",
  "gettext",
  "curl",
  "unzip",
  "git",
  "gzip",
  "tar",
  "ctags",
  "gh",
  "git-delta",
  "shellcheck",
  "python3-pip",
  "python3-devel",
];

const DEV_TOOLS = [
  "vim-enhanced",
  "bat",
  "zsh",
  "tmux",
  "git",
  "git-delta",
  "kitty",
  "gawk",
  "sqlite-devel",
  "ansible",
  "tree-sitter-cli",
];

const LANG_TOOLS = [
  "julia",
  "ruby",
  "ruby-devel",
  "python3-pip",
  "python3-devel",
  "python3-neovim",
  "python3-virtualenv",
  "perl",
  "perl-App-cpanminus",
  "php-cli",
  "phpunit", // provided by the newest phpunitNN package
  "composer",
  "compat-lua",
  "compat-lua-devel",
  "lua-devel",
  "luarocks",
  "lua-socket",
  "clang",
  "golang",
];

// pyenv build dependencies
const PYENV_DEPS = [
  "gcc",
  "make",
  "patch",
  "zlib-ng-compat-devel",
  "bzip2",
  "bzip2-devel",
  "readline-devel",
  "sqlite",
  "sqlite-devel",
  "openssl-devel",
  "tk-devel",
  "libffi-devel",
  "xz-devel",
  "libuuid-devel",
  "gdbm-devel",
  "libnsl2-devel",
];

const APPS = [
  "vlc",
  "flameshot",
  "firefox",
  "gimp",
  "gmic-gimp",
  "timeshift",
  "thunderbird",
  "gnome-tweaks",
  "obs-studio",
  "chromium",
  "steam",
  "lutris",
  "geary",
  "mozilla-ublock-origin",
];

// azul zulu, current LTS (17+ is needed for the Apex LSP, PMD and Code Analyzer)
const JAVA_PACKAGE = "zulu25-jdk";

// ryanoasis/nerd-fonts release archives
const NERD_FONTS = ["FiraCode", "JetBrainsMono", "CascadiaCode", "Meslo", "NerdFontsSymbolsOnly"];
const NERD_FONT_ROOT = "/usr/local/share/fonts/NerdFonts";

const GO_TOOLS = [
  "golang.org/x/tools/cmd/goimports@latest",
  "golang.org/x/tools/gopls@latest",
  "mvdan.cc/sh/v3/cmd/shfmt@latest",
  "github.com/a-h/templ/cmd/templ@latest",
];

const FLATPAKS = [
  "com.spotify.Client",
  "com.rustdesk.RustDesk",
  "com.protonvpn.www",
  "it.mijorus.gearlever",
  "com.mattjakeman.ExtensionManager",
  "us.zoom.Zoom",
  "com.github.tchx84.Flatseal",
  "com.discordapp.Discord",
  "app.openbubbles.OpenBubbles",
  "com.slack.Slack",
];

const dconfFile = () => setupPath("fedora", "config", "gnome-settings.dconf");
const jail = () => setupPath("fedora", "config", "jail.local");

function configureDnf(): void {
  // dnf5 keeps user settings in /etc/dnf/libdnf5.conf.d/, so this is safe to re-run
  run("dnf", ["config-manager", "setopt", "max_parallel_downloads=10"]);
  dnf.install(["dnf-plugins-core", "dnf5-plugins"]);
}

function enableRepos(ctx: Context): void {
  const version = ctx.os.versionId;
  if (!dnf.isInstalled("rpmfusion-free-release") || !dnf.isInstalled("rpmfusion-nonfree-release")) {
    run("dnf", [
      "install",
      "-y",
      `https://download1.rpmfusion.org/free/fedora/rpmfusion-free-release-${version}.noarch.rpm`,
      `https://download1.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-${version}.noarch.rpm`,
    ]);
  }
  dnf.install(["rpmfusion-free-release-tainted", "rpmfusion-nonfree-release-tainted"]);
  run("dnf", ["config-manager", "setopt", "fedora-cisco-openh264.enabled=1"]);
}

function systemUpdate(ctx: Context): void {
  if (ctx.settings.skipUpgrade) return warn("skipped: SKIP_UPGRADE is set");
  dnf.upgrade();
}

function multimedia(): void {
  if (dnf.isInstalled("ffmpeg-free")) {
    run("dnf", ["swap", "-y", "ffmpeg-free", "ffmpeg", "--allowerasing"]);
  } else {
    dnf.install(["ffmpeg"]);
  }
  // --skip-broken: RPM Fusion rebuilds (libheif-freeworld) can lag a Fedora
  // update for days, and one stale codec must not fail the whole group
  run("dnf", [
    "group",
    "install",
    "-y",
    "--skip-broken",
    "multimedia",
    "--setopt=install_weak_deps=False",
    "--exclude=PackageKit-gstreamer-plugin",
  ]);
  run("dnf", ["group", "install", "-y", "--skip-broken", "sound-and-video"]);
  dnf.install(["intel-media-driver"]);
}

function packages(): void {
  dnf.install(SYSTEM_UTILS);
  dnf.install(NEOVIM_PRE);
}

function system(ctx: Context): void {
  setHostname(ctx);

  dnf.install(["dnf5-plugin-automatic"]);
  const conf = "/etc/dnf/automatic.conf";
  const current = read(conf);
  if (current === null) {
    ensureFile(conf, "[commands]\napply_updates = yes\n");
  } else {
    let text = current.replace(/^apply_updates\s*=.*/gm, "apply_updates = yes");
    if (!/^apply_updates/m.test(text)) {
      // add the key under an existing [commands] rather than a second section
      text = /^\[commands\]/m.test(text)
        ? text.replace(/^\[commands\].*$/m, (m) => `${m}\napply_updates = yes`)
        : `${text}\n[commands]\napply_updates = yes\n`;
    }
    ensureFile(conf, text);
  }
  enableService(ctx, "dnf5-automatic.timer");

  dnf.install(["openssh-server"]);
  enableService(ctx, "sshd.service");
}

function nerdFonts(): void {
  dnf.install(["fontconfig", "curl", "tar", "xz"]);
  let added = false;
  for (const font of NERD_FONTS) {
    const dest = join(NERD_FONT_ROOT, font);
    if (existsSync(dest)) {
      note(`Nerd Font already installed: ${font}`);
      continue;
    }
    note(`Installing Nerd Font: ${font}`);
    // extract to a temp dir first so a failed download never leaves a partial font dir
    const tmp = mkdtempSync(join(tmpdir(), "dots-nerdfont-"));
    try {
      const archive = join(tmp, `${font}.tar.xz`);
      const out = join(tmp, font);
      download(
        `https://github.com/ryanoasis/nerd-fonts/releases/latest/download/${font}.tar.xz`,
        archive,
      );
      mkdirSync(out);
      run("tar", ["--no-same-owner", "-xJf", archive, "-C", out]);
      run("chmod", ["-R", "a+rX", out]);
      mkdirSync(NERD_FONT_ROOT, { recursive: true });
      run("mv", [out, dest]);
      // mv keeps the tmp SELinux label, which confined apps can't read
      if (which("restorecon")) run("restorecon", ["-R", dest]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
    added = true;
  }
  if (added) run("fc-cache", ["-f"]);
}

function terminalTools(): void {
  // lazygit (atim/lazygit stopped updating; dejan/lazygit tracks releases)
  run("dnf", ["copr", "enable", "-y", "dejan/lazygit"]);
  dnf.install(["lazygit"]);
  run("dnf", ["copr", "enable", "-y", "scottames/ghostty"]);
  dnf.install(["ghostty"]);
  dnf.install(DEV_TOOLS);
}

/** NVIM_REF picks the tag or branch (default stable), NVIM_REBUILD=1 forces a rebuild. */
function neovim(ctx: Context): void {
  dnf.install(NEOVIM_PRE);
  const { user } = ctx;
  const dir = user.path("temp", "neovim");
  const ref = process.env.NVIM_REF || "stable";
  const rebuild = process.env.NVIM_REBUILD;

  if (which("/usr/local/bin/nvim") && (!rebuild || rebuild === "0")) {
    const first = capture("/usr/local/bin/nvim", ["--version"]).stdout.split("\n")[0];
    return note(`neovim already installed: ${first}`);
  }

  user.mkdir(user.path("temp"));
  if (!existsSync(join(dir, ".git"))) {
    user.run("git", ["clone", "--filter=blob:none", "https://github.com/neovim/neovim", dir]);
  }
  user.run("git", ["-C", dir, "fetch", "--force", "--tags", "origin", ref]);
  user.run("git", ["-C", dir, "checkout", "--force", "FETCH_HEAD"]);
  user.run("make", ["-C", dir, "CMAKE_BUILD_TYPE=RelWithDebInfo"]);
  run("make", ["-C", dir, "install"]);
  // make install leaves root-owned files in the build dir
  run("chown", ["-R", `${user.name}:`, dir]);
}

function shell(ctx: Context): void {
  dnf.install(["zsh", "git", "curl"]);
  installOhMyZsh(ctx);
  setLoginShellZsh(ctx);
}

function browsers(): void {
  // chrome, via the repo definitions shipped by fedora-workstation-repositories
  dnf.install(["fedora-workstation-repositories"]);
  run("dnf", ["config-manager", "setopt", "google-chrome.enabled=1"]);
  dnf.install(["google-chrome-stable"]);

  run("dnf", [
    "config-manager",
    "addrepo",
    "--overwrite",
    "--from-repofile=https://brave-browser-rpm-release.s3.brave.com/brave-browser.repo",
  ]);
  dnf.install(["brave-browser"]);
}

// the 1password rpm rewrites 1password.repo on every install and upgrade, so
// this repo file is only a bootstrap for the first install
function onePassword(): void {
  if (dnf.isInstalled("1password"))
    return note("1password already installed; its package manages 1password.repo");
  run("rpm", ["--import", "https://downloads.1password.com/linux/keys/1password.asc"]);
  ensureFile(
    "/etc/yum.repos.d/1password.repo",
    `[1password]
name=1Password Stable Channel
baseurl=https://downloads.1password.com/linux/rpm/stable/$basearch
enabled=1
gpgcheck=1
repo_gpgcheck=1
gpgkey=https://downloads.1password.com/linux/keys/1password.asc
`,
  );
  dnf.install(["1password"]);
}

function java(): void {
  // azul zulu repo (the zulu-repo rpm has no digest and rpm 6 refuses it)
  run("rpm", ["--import", "https://repos.azul.com/azul-repo.key"]);
  ensureFile(
    "/etc/yum.repos.d/zulu.repo",
    `[zulu]
name=Azul Zulu
baseurl=https://repos.azul.com/zulu/rpm
enabled=1
gpgcheck=1
gpgkey=https://repos.azul.com/azul-repo.key
`,
  );
  dnf.install([JAVA_PACKAGE]);
}

function rust(ctx: Context): void {
  dnf.install(["gcc", "curl"]);
  installRust(ctx, ["viu"]);
}

function node(ctx: Context): void {
  dnf.install(["curl", "jq"]);
  installNode(ctx);
}

function goTools(ctx: Context): void {
  dnf.install(["golang"]);
  installGoTools(ctx, GO_TOOLS);
}

function lua(): void {
  // compat-lua (5.1) matches neovim's luajit; luarocks itself runs on lua 5.4.
  // luasocket comes from the lua-socket rpm: `luarocks install` as root would
  // overwrite rpm-owned files in /usr
  dnf.install(["luarocks", "lua-devel", "lua-socket", "compat-lua", "compat-lua-devel", "gcc"]);
}

function python(ctx: Context): void {
  dnf.install([
    "python3-pip",
    "python3-devel",
    "python3-neovim",
    "python3-virtualenv",
    "pipx",
    ...PYENV_DEPS,
  ]);
  installPipxTools(ctx, ["black"]);
  installPyenv(ctx);
}

function ruby(): void {
  dnf.install(["ruby", "ruby-devel", "gcc", "make", "redhat-rpm-config"]);
  installGems(["neovim"]);
}

function homebrew(ctx: Context): void {
  dnf.install(["procps-ng", "curl", "file", "git", "gcc", "make"]);
  installHomebrew(ctx);
}

function apps(): void {
  dnf.install(APPS);
}

function flatpak(ctx: Context): void {
  dnf.install(["flatpak"]);
  // replace the fedora flatpak remote with flathub
  capture("flatpak", ["remote-delete", "fedora", "--force"]);
  run("flatpak", [
    "remote-add",
    "--if-not-exists",
    "flathub",
    "https://flathub.org/repo/flathub.flatpakrepo",
  ]);
  if (skipInContainer(ctx, "flatpak app installs")) return;

  // updating apps is part of upgrading, like the `upgrade` step
  if (!ctx.settings.skipUpgrade) run("flatpak", ["update", "--noninteractive"]);

  for (const pak of FLATPAKS) {
    if (capture("flatpak", ["info", pak]).status === 0) {
      note(`Flatpak already installed: ${pak}`);
      continue;
    }
    note(`Installing Flatpak: ${pak}`);
    run("flatpak", ["install", "--noninteractive", "flathub", pak]);
  }
}

function keys(ctx: Context): void {
  dnf.install(["gnupg2", "pass", "openssh-clients"]);
  configureKeys(ctx);
}

function security(ctx: Context): void {
  dnf.install(["ufw", "fail2ban", "iproute"]);
  configureUfw(ctx, { disableFirewalld: true, rulesNeedNetfilter: true });

  // prevent IP spoofs
  ensureFile("/etc/host.conf", "order bind,hosts\nmulti on\n");

  configureFail2ban(ctx, jail());

  note("listening ports");
  run("ss", ["-tunlp"]);
}

function docker(ctx: Context): void {
  const old = [
    "docker",
    "docker-client",
    "docker-client-latest",
    "docker-common",
    "docker-latest",
    "docker-latest-logrotate",
    "docker-logrotate",
    "docker-selinux",
    "docker-engine-selinux",
    "docker-engine",
  ];
  const installed = old.filter((p) => capture("rpm", ["-q", p]).status === 0);
  if (installed.length > 0) run("dnf", ["remove", "-y", "--noautoremove", ...installed]);

  dnf.install(["dnf-plugins-core"]);
  run("dnf", [
    "config-manager",
    "addrepo",
    "--overwrite",
    "--from-repofile=https://download.docker.com/linux/fedora/docker-ce.repo",
  ]);
  dnf.install([
    "docker-ce",
    "docker-ce-cli",
    "containerd.io",
    "docker-buildx-plugin",
    "docker-compose-plugin",
  ]);
  run("usermod", ["-aG", "docker", ctx.user.name]);
  enableService(ctx, "docker.service", "containerd.service");
}

function firmware(ctx: Context): void {
  if (skipInContainer(ctx, "fwupd firmware updates")) return;
  dnf.install(["fwupd"]);
  run("fwupdmgr", ["refresh", "--force"]);
  // both exit non-zero when there is nothing to update
  capture("fwupdmgr", ["get-updates"]);
  capture("fwupdmgr", ["update", "-y", "--no-reboot-check"]);
}

function gnome(ctx: Context): void {
  dnf.install(["pipx", "gnome-shell-extension-common", "dconf", "glib2"]);
  configureGnome(ctx, {
    dconfFile: dconfFile(),
    extraExtensions: ["appindicatorsupport@rgcjonas.gmail.com"],
    nautilusZoom: "small-plus",
    extraSettings: [["org.gtk.gtk4.Settings.FileChooser", "sort-directories-first", "true"]],
  });
}

function theme(ctx: Context): void {
  dnf.install(["papirus-icon-theme", "sassc", "git", "flatpak"]);
  configureGtkTheme(ctx);
}

export const fedora: Distro = {
  pkg: dnf,
  plan() {
    return {
      defaults: [
        step("dnf", "dnf5 parallel downloads and plugins", configureDnf),
        step("repos", "RPM Fusion and OpenH264", enableRepos),
        step("upgrade", "dnf upgrade (skipped with SKIP_UPGRADE)", systemUpdate),
        step(
          "multimedia",
          "ffmpeg, multimedia and sound-and-video groups, intel media driver",
          multimedia,
        ),
        step("packages", "system utilities and neovim prerequisites", packages),
        step("system", "hostname, dnf5-automatic, sshd", system),
        step("fonts", "Nerd Fonts in /usr/local/share/fonts", nerdFonts),
        step("dev", "lazygit and ghostty coprs, terminal and dev tools", terminalTools),
        step("neovim", "neovim built from source (NVIM_REF, NVIM_REBUILD)", neovim),
        step("stow", "link the repo into $HOME, backing up files in the way", stowDotfiles),
        step("shell", "oh-my-zsh, powerlevel10k, zsh login shell", shell),
        step("git", "git identity, only where unset", configureGit),
        step("tmux", "tmux plugin manager", installTpm),
        step("browsers", "Google Chrome and Brave", browsers),
        step("1password", "1Password", onePassword),
        step("lang", "language packages: julia, ruby, python, perl, php, lua, clang, go", () =>
          dnf.install(LANG_TOOLS),
        ),
        step("java", "Azul Zulu JDK", java),
        step("rust", "rustup, rust-analyzer, rust-src, viu", rust),
        step("node", "nvm + node LTS, pnpm and its globals (sf, lwc server, tree-sitter)", node),
        step("go", "goimports, gopls, shfmt, templ", goTools),
        step("lua", "luarocks, luasocket, compat-lua", lua),
        step("python", "pipx black, pyenv", python),
        step("ruby", "neovim gem", ruby),
        step("homebrew", "Homebrew in /home/linuxbrew", homebrew),
        step("pmd", "PMD 7 in /opt/pmd", installPmd),
        step(
          "salesforce",
          "Apex/Visualforce/Aura language servers, sf code-analyzer",
          salesforceStep,
        ),
        step("herdr", "herdr and its claude integration", installHerdr),
        step("claude", "Claude Code and its statusline", installClaude),
        step("agents", "plannotator, pi, opencode; check skills, rules and hooks", (c) =>
          installAgents(c, { opencode: true }),
        ),
        step("nvim", "neovim plugins at lazy-lock.json", syncNeovimPlugins),
        step("apps", "desktop apps", apps),
        step("flatpak", "flathub and flatpaks", flatpak),
        step("keys", "gpg, pass and ssh keys", keys),
        step("security", "ufw, /etc/host.conf, fail2ban", security),
      ],
      optional: [
        step("docker", "Docker CE from docker.com", docker),
        step(
          "auto_cpufreq",
          "auto-cpufreq on laptops (replaces tuned/power-profiles-daemon)",
          installAutoCpufreq,
        ),
        step("firmware", "fwupd firmware updates", firmware),
        step("gnome", "gnome settings and extensions (needs the session bus)", gnome),
        step(
          "theme",
          "Gruvbox GTK theme and Papirus icons (selecting them needs the session bus)",
          theme,
        ),
        step("desktop", "Hyprland + Noctalia, after its checks", desktopInstall),
        step("greeter", "noctalia-greeter on greetd, replacing gdm", desktopGreeter),
      ],
    };
  },
  verify(ctx, v) {
    v.section("commands");
    v.commands(
      "neovim-ruby-host",
      "git-lfs",
      "zsh",
      "tmux",
      "ghostty",
      "kitty",
      "bat",
      "jq",
      "stow",
      "fastfetch",
      "btop",
      "htop",
      "gopls",
      "goimports",
      "shfmt",
      "templ",
      "viu",
      "markdownlint",
      "luarocks",
      "lua",
      "pipx",
      "black",
      "pyenv",
      "ruby",
      "gem",
      "php",
      "composer",
      "phpunit",
      "perl",
      "cpanm",
      "julia",
      "clang",
      "google-chrome",
      "brave-browser",
      "1password",
      "firefox",
      "chromium-browser",
      "thunderbird",
      "vlc",
      "ffmpeg",
      "flatpak",
      "pass",
      "gpg",
      "ssh",
      "ufw",
      "fail2ban-client",
      "ansible",
    );
    verifyCommon(ctx, v);

    v.section("distro config");
    v.check(
      "neovim from source (/usr/local/bin/nvim)",
      () => which("/usr/local/bin/nvim") !== null,
    );
    // runs it: the git-clone install has to leave a working brew
    v.runs("homebrew", `${BREW_PREFIX}/bin/brew`, ["--version"]);
    v.runs("luasocket", "lua", ["-e", 'require("socket")']);
    v.runs("neovim gem", "gem", ["list", "-i", "neovim"]);
    v.check("nerd fonts", () => existsSync(join(NERD_FONT_ROOT, "FiraCode")));
    v.check("flathub remote", () =>
      /flathub/.test(capture("flatpak", ["remotes", "--system"]).stdout),
    );
    for (const dir of [
      "",
      "plugins/zsh-autosuggestions",
      "plugins/zsh-syntax-highlighting",
      "themes/powerlevel10k",
    ]) {
      const rel = dir ? join("custom", dir) : "oh-my-zsh.sh";
      v.check(`oh-my-zsh ${dir || "installed"}`.trim(), () =>
        existsSync(ctx.user.path(".oh-my-zsh", rel)),
      );
    }
    v.runs("git init.defaultBranch", "git", ["config", "--global", "init.defaultBranch"]);
    v.check("fail2ban jail.local", () => existsSync("/etc/fail2ban/jail.local"));
    v.check("dnf automatic apply_updates", () =>
      /^apply_updates = yes/m.test(read("/etc/dnf/automatic.conf") ?? ""),
    );

    // the desktop step is opt-in; check it once hyprland or noctalia is there
    if (which("Hyprland", ctx.user.searchPath()) || which("noctalia", ctx.user.searchPath())) {
      verifyDesktop(ctx, v);
    }
  },
};
