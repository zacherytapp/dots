// Ubuntu 26.04 LTS (resolute). Third-party software comes from the vendors' apt
// repos (Ubuntu's firefox/chromium debs are snap shims), Neovim is built from
// source, and Go, luarocks and the user toolchains come from their upstreams.

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { desktopGreeter, desktopInstall, verifyDesktop } from "../desktop/desktop.ts";
import { setupPath } from "../lib/context.ts";
import { CommandError, capture, output, run, succeeds, which } from "../lib/exec.ts";
import { ensureFile, read } from "../lib/files.ts";
import { note } from "../lib/log.ts";
import { download, fetchText, latestGithubTag } from "../lib/net.ts";
import { apt, aptUpdate } from "../lib/pkg.ts";
import { step } from "../lib/steps.ts";
import { enableService, setHostname, skipInContainer } from "../lib/system.ts";
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
  installGems,
  BREW_PREFIX,
  installHomebrew,
  installGoTools,
  installJulia,
  installNode,
  installPipxTools,
  installPyenv,
  installRust,
} from "../steps/toolchains.ts";
import { verifyCommon } from "../verify/common.ts";
import { configureGnome, configureGtkTheme } from "./gnome.ts";
import type { Context } from "../lib/context.ts";
import type { Distro } from "./types.ts";

const APT_ENV = { DEBIAN_FRONTEND: "noninteractive" };

// neovim's build dependencies; the editor's runtime tools (see verify/common.ts)
// are in the lists below
const NEOVIM_PRE = [
  "ninja-build",
  "gettext",
  "cmake",
  "build-essential",
  "curl",
  "unzip",
  "gzip",
  "tar",
  "wget",
];

const SYSTEM_UTILS = [
  "htop",
  "btop",
  "stow",
  "fastfetch",
  "fzf",
  "jq",
  "fd-find",
  "ripgrep",
  "wget",
  "curl",
  "gpg",
  "ca-certificates",
  "software-properties-common",
  "gitlint",
  "tree",
  "powertop",
  "rsync",
  "xclip",
  "wl-clipboard",
  "cabextract",
  "fontconfig",
  "vainfo",
  "chafa",
  "pass",
  "meson",
  "sassc",
  "ufw",
  "fail2ban",
  "net-tools",
  "pkgconf",
  "pipx",
  "unzip",
  "zip",
  "eza",
  "gnome-tweaks",
  "dconf-cli",
  "fonts-firacode",
  "fonts-noto-color-emoji",
  "shellcheck",
  "gzip",
  "tar",
];

const DEV_TOOLS = [
  "vim",
  "bat",
  "zsh",
  "tmux",
  "git",
  "git-lfs",
  "gh",
  "kitty",
  "ghostty",
  "lazygit",
  "git-delta",
  "universal-ctags",
  "gawk",
  "libsqlite3-dev",
  "ansible",
  "tree-sitter-cli",
];

const LANG_TOOLS = [
  "ruby-full",
  "ruby-dev",
  "python3-pip",
  "python3-venv",
  "python3-dev",
  "python3-virtualenv",
  "python3-pynvim",
  "cpanminus",
  "perl",
  "php-cli",
  "php-zip",
  "phpunit",
  "composer",
  "lua5.1",
  "liblua5.1-0-dev",
  "clang",
  // pyenv build dependencies
  "libssl-dev",
  "zlib1g-dev",
  "libbz2-dev",
  "libreadline-dev",
  "libncursesw5-dev",
  "xz-utils",
  "tk-dev",
  "libxml2-dev",
  "libxmlsec1-dev",
  "libffi-dev",
  "liblzma-dev",
];

const APPS = [
  "vlc",
  "flameshot",
  "gimp",
  "timeshift",
  "obs-studio",
  "lutris",
  "geary",
  "flatpak",
  "gnome-software-plugin-flatpak",
];

const MULTIMEDIA = [
  "ubuntu-restricted-extras",
  "libavcodec-extra",
  "ffmpeg",
  "gstreamer1.0-vaapi",
  "intel-media-va-driver-non-free",
];

// apps Ubuntu only ships as snaps (thunderbird, chromium) come from flathub instead
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
  "org.mozilla.Thunderbird",
  "org.chromium.Chromium",
];

const JDK_PACKAGE = "zulu25-jdk";
const GO_TOOLS = [
  "golang.org/x/tools/cmd/goimports@latest",
  "golang.org/x/tools/gopls@latest",
  "mvdan.cc/sh/v3/cmd/shfmt@latest",
  "github.com/a-h/templ/cmd/templ@latest",
];

const aptRun = (args: string[]) => run("apt-get", args, { env: APT_ENV });

function dpkgArch(): string {
  return output("dpkg", ["--print-architecture"]);
}

/**
 * Writes /etc/apt/keyrings/<name>.gpg (vendors ship armored or binary keys) and
 * /etc/apt/sources.list.d/<name>.sources.
 */
function addAptRepo(
  name: string,
  keyUrl: string,
  uris: string,
  suites: string,
  components: string,
  arch = dpkgArch(),
): void {
  const keyring = `/etc/apt/keyrings/${name}.gpg`;
  mkdirSync("/etc/apt/keyrings", { recursive: true, mode: 0o755 });
  const tmp = mkdtempSync(join(tmpdir(), "dots-key-"));
  try {
    const key = join(tmp, "key");
    download(keyUrl, key);
    if (readFileSync(key, "utf8").includes("-----BEGIN PGP")) {
      run("gpg", ["--dearmor", "--yes", "-o", keyring, key]);
    } else {
      copyFileSync(key, keyring);
    }
    run("chmod", ["0644", keyring]);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  ensureFile(
    `/etc/apt/sources.list.d/${name}.sources`,
    `Types: deb\nURIs: ${uris}\nSuites: ${suites}\nComponents: ${components}\nArchitectures: ${arch}\nSigned-By: ${keyring}\n`,
  );
}

/**
 * chrome, brave and 1password rewrite their own sources.list.d/<name>.sources
 * (pointing at their own keyring) from postinst on every install and upgrade,
 * so ours is only a bootstrap: skip it once the package is installed, and drop
 * our keyring when the vendor's file has replaced ours.
 */
function vendorAptRepo(
  pkg: string,
  name: string,
  ...repo: [string, string, string, string, string?]
): void {
  if (apt.isInstalled(pkg))
    return note(`${pkg} already installed; its package manages ${name}.sources`);
  addAptRepo(name, ...repo);
  aptUpdate();
  apt.install([pkg]);
  const sources = read(`/etc/apt/sources.list.d/${name}.sources`) ?? "";
  if (!sources.includes(`/etc/apt/keyrings/${name}.gpg`))
    rmSync(`/etc/apt/keyrings/${name}.gpg`, { force: true });
}

function configureApt(ctx: Context): void {
  aptUpdate();
  apt.install(["software-properties-common", "ca-certificates", "curl", "gpg"]);
  for (const component of ["universe", "multiverse", "restricted"]) {
    run("add-apt-repository", ["-y", "-n", component]);
  }
  // 32-bit libraries for steam/wine
  run("dpkg", ["--add-architecture", "i386"]);
  aptUpdate();
  if (ctx.settings.skipUpgrade) note("skipped upgrade: SKIP_UPGRADE is set");
  else aptRun(["-y", "-q", "full-upgrade"]);
}

function packages(ctx: Context): void {
  ctx.pkg.install(SYSTEM_UTILS);
  ctx.pkg.install(DEV_TOOLS);
  ctx.pkg.install(LANG_TOOLS);
  ctx.pkg.install(NEOVIM_PRE);
}

function debconf(...selections: string[]): void {
  run("debconf-set-selections", [], { input: `${selections.join("\n")}\n` });
}

function apps(ctx: Context): void {
  ctx.pkg.install(APPS);
  // steam's license prompt
  debconf("steam steam/question select I AGREE", "steam steam/license note ''");
  ctx.pkg.install(["steam-installer"]);
}

function system(ctx: Context): void {
  setHostname(ctx);
  // automatic security updates
  ctx.pkg.install(["unattended-upgrades"]);
  ensureFile(
    "/etc/apt/apt.conf.d/20auto-upgrades",
    'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n',
  );
  ctx.pkg.install(["openssh-server"]);
  enableService(ctx, "ssh.service");
}

function addFlathub(): void {
  run("flatpak", [
    "remote-add",
    "--if-not-exists",
    "flathub",
    "https://flathub.org/repo/flathub.flatpakrepo",
  ]);
}

function flathub(ctx: Context): void {
  ctx.pkg.install(["flatpak"]);
  addFlathub();
}

function multimedia(ctx: Context): void {
  // accept the microsoft fonts EULA pulled in by ubuntu-restricted-extras
  debconf("ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true");
  ctx.pkg.install(MULTIMEDIA);
}

function security(ctx: Context): void {
  configureUfw(ctx);
  // prevent IP spoofs
  ensureFile("/etc/host.conf", "order hosts,bind\nmulti on\n");
  configureFail2ban(ctx, setupPath("ubuntu", "config", "jail.local"));
  if (!ctx.container) run("ss", ["-tunlp"]);
}

function browsers(): void {
  vendorAptRepo(
    "google-chrome-stable",
    "google-chrome",
    "https://dl.google.com/linux/linux_signing_key.pub",
    "https://dl.google.com/linux/chrome/deb/",
    "stable",
    "main",
    "amd64",
  );
  vendorAptRepo(
    "brave-browser",
    "brave-browser",
    "https://brave-browser-apt-release.s3.brave.com/brave-browser-archive-keyring.gpg",
    "https://brave-browser-apt-release.s3.brave.com/",
    "stable",
    "main",
  );
  // Mozilla's deb is preferred over Ubuntu's snap transitional package
  addAptRepo(
    "mozilla",
    "https://packages.mozilla.org/apt/repo-signing-key.gpg",
    "https://packages.mozilla.org/apt",
    "mozilla",
    "main",
  );
  // Mozilla's documented pin. Ubuntu's shim is 1:1snapN-..., whose epoch puts
  // it above every Mozilla version, and a priority >= 1000 is what lets apt
  // pick a lower version (apt_preferences(5)); apt-get -y still needs
  // --allow-downgrades to do it
  ensureFile(
    "/etc/apt/preferences.d/mozilla",
    "Package: *\nPin: origin packages.mozilla.org\nPin-Priority: 1000\n",
  );
  aptUpdate();
  // a stock desktop already has Ubuntu's firefox, a transitional deb for the
  // snap, which apt.install would count as installed
  const firefox = capture("dpkg-query", ["-W", "-f=${Status} ${Version}", "firefox"]).stdout;
  if (firefox.includes("install ok installed") && !firefox.includes("snap")) {
    return note("firefox already installed");
  }
  run("apt-get", ["install", "-y", "-q", "--allow-downgrades", "firefox"], {
    env: { DEBIAN_FRONTEND: "noninteractive" },
  });
}

/** From source; NVIM_REF picks the tag/branch (default stable), NVIM_REBUILD=1 rebuilds over an install. */
function neovim(ctx: Context): void {
  const { user } = ctx;
  const dir = user.path("temp", "neovim");
  const ref = process.env.NVIM_REF || "stable";

  ctx.pkg.install(NEOVIM_PRE);
  if (existsSync("/usr/local/bin/nvim") && !process.env.NVIM_REBUILD) {
    const version = output("/usr/local/bin/nvim", ["--version"]).split("\n")[0];
    return note(`neovim already installed: ${version}`);
  }
  user.mkdir(user.path("temp"));
  if (!existsSync(join(dir, ".git"))) {
    user.run("git", [
      "clone",
      "--depth",
      "1",
      "--branch",
      ref,
      "https://github.com/neovim/neovim",
      dir,
    ]);
  } else {
    user.run("git", ["-C", dir, "fetch", "--depth", "1", "--force", "origin", ref]);
    user.run("git", ["-C", dir, "checkout", "--force", "FETCH_HEAD"]);
  }
  user.run("make", ["-C", dir, "CMAKE_BUILD_TYPE=RelWithDebInfo"]);
  run("make", ["-C", dir, "install"]);
  // make install leaves root-owned files in the build dir
  run("chown", ["-R", `${user.name}:`, dir]);
}

function onePassword(ctx: Context): void {
  if (!apt.isInstalled("1password")) {
    // debsig policy so dpkg can verify the package signature (postinst keeps it current)
    const id = "AC2D62742012EA22";
    const keyrings = `/usr/share/debsig/keyrings/${id}`;
    run("install", ["-d", `/etc/debsig/policies/${id}`, keyrings]);
    download(
      "https://downloads.1password.com/linux/debian/debsig/1password.pol",
      `/etc/debsig/policies/${id}/1password.pol`,
    );
    const tmp = mkdtempSync(join(tmpdir(), "dots-1password-"));
    try {
      const key = join(tmp, "1password.asc");
      download("https://downloads.1password.com/linux/keys/1password.asc", key);
      run("gpg", ["--dearmor", "--yes", "-o", `${keyrings}/debsig.gpg`, key]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
  vendorAptRepo(
    "1password",
    "1password",
    "https://downloads.1password.com/linux/keys/1password.asc",
    "https://downloads.1password.com/linux/debian/amd64",
    "stable",
    "main",
    "amd64",
  );
  ctx.pkg.install(["1password-cli"]);
}

function shell(ctx: Context): void {
  const { user } = ctx;
  installOhMyZsh(ctx);
  installTpm(ctx);
  setLoginShellZsh(ctx);

  // ubuntu ships fd and bat as fdfind and batcat
  user.mkdir(user.path(".local", "bin"));
  for (const [name, bin] of [
    ["fd", "fdfind"],
    ["bat", "batcat"],
  ] as const) {
    const link = user.path(".local", "bin", name);
    const target = `/usr/bin/${bin}`;
    if (readLink(link) !== target) user.run("ln", ["-sf", target, link]);
  }
}

function readLink(path: string): string | null {
  try {
    return readlinkSync(path);
  } catch {
    return null;
  }
}

// the dotfiles put ~/.local/bin on PATH, so no `pipx ensurepath` (it edits the rc files)
function python(ctx: Context): void {
  installPipxTools(ctx, ["black", "virtualenv"]);
  installPyenv(ctx);
}

/** Azul Zulu JDK (current LTS); 17+ is what the Apex LSP, PMD and Code Analyzer need. */
function java(ctx: Context): void {
  addAptRepo(
    "zulu",
    "https://repos.azul.com/azul-repo.key",
    "https://repos.azul.com/zulu/deb",
    "stable",
    "main",
  );
  aptUpdate();
  ctx.pkg.install([JDK_PACKAGE]);
}

/** The sha256 go.dev publishes for a release file. */
function goSha256(file: string): string {
  const releases = JSON.parse(fetchText("https://go.dev/dl/?mode=json")) as Array<{
    files?: Array<{ filename?: string; sha256?: string }>;
  }>;
  const sum = releases.flatMap((r) => r.files ?? []).find((f) => f.filename === file)?.sha256;
  if (!sum) throw new Error(`go.dev lists no checksum for ${file}`);
  return sum;
}

function go(ctx: Context): void {
  if (!existsSync("/usr/local/go/bin/go")) {
    const version = fetchText("https://go.dev/VERSION?m=text").split("\n")[0];
    if (!version?.startsWith("go")) throw new Error(`unexpected go.dev version: ${version}`);
    note(`installing ${version}`);
    const file = `${version}.linux-${dpkgArch()}.tar.gz`;
    const tmp = mkdtempSync(join(tmpdir(), "dots-go-"));
    try {
      const tarball = join(tmp, file);
      download(`https://go.dev/dl/${file}`, tarball);
      const want = goSha256(file);
      const got = createHash("sha256").update(readFileSync(tarball)).digest("hex");
      if (got !== want) throw new Error(`${file}: sha256 ${got}, go.dev lists ${want}`);
      rmSync("/usr/local/go", { recursive: true, force: true });
      run("tar", ["--no-same-owner", "-C", "/usr/local", "-xzf", tarball]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
  installGoTools(ctx, GO_TOOLS);
}

/** The latest luarocks built against lua 5.1 (the version neovim embeds). */
function lua(): void {
  if (!which("luarocks")) {
    const tag = latestGithubTag("luarocks/luarocks");
    const version = tag.replace(/^v/, "");
    const tmp = mkdtempSync(join(tmpdir(), "dots-luarocks-"));
    try {
      const tarball = join(tmp, "luarocks.tar.gz");
      download(`https://luarocks.org/releases/luarocks-${version}.tar.gz`, tarball);
      run("tar", ["--no-same-owner", "-xzf", tarball, "-C", tmp]);
      const cwd = join(tmp, `luarocks-${version}`);
      run("./configure", ["--lua-version=5.1", "--with-lua-include=/usr/include/lua5.1"], { cwd });
      run("make", [], { cwd });
      run("make", ["install"], { cwd });
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
  if (!succeeds("luarocks", ["show", "luasocket"])) run("luarocks", ["install", "luasocket"]);
}

function ruby(ctx: Context): void {
  // the neovim gem pulls in msgpack, a native extension
  ctx.pkg.install(["ruby-full", "ruby-dev", "build-essential"]);
  installGems(["neovim"]);
}

function brew(ctx: Context): void {
  ctx.pkg.install(["build-essential", "procps", "curl", "file", "git"]);
  installHomebrew(ctx);
}

function flatpaks(ctx: Context): void {
  addFlathub();
  if (skipInContainer(ctx, "flatpak app installs")) return;
  for (const pak of FLATPAKS) {
    if (capture("flatpak", ["info", pak]).status === 0) {
      note(`flatpak already installed: ${pak}`);
      continue;
    }
    note(`installing flatpak: ${pak}`);
    run("flatpak", ["install", "--system", "--noninteractive", "flathub", pak]);
  }
}

function osReleaseField(key: string): string {
  const m = new RegExp(`^${key}=(.*)$`, "m").exec(read("/etc/os-release") ?? "");
  return (m?.[1] ?? "").replace(/^"(.*)"$/, "$1");
}

function installDocker(ctx: Context): void {
  for (const pkg of [
    "docker.io",
    "docker-doc",
    "docker-compose",
    "docker-compose-v2",
    "podman-docker",
    "containerd",
    "runc",
  ]) {
    if (apt.isInstalled(pkg)) aptRun(["remove", "-y", pkg]);
  }
  addAptRepo(
    "docker",
    "https://download.docker.com/linux/ubuntu/gpg",
    "https://download.docker.com/linux/ubuntu",
    osReleaseField("UBUNTU_CODENAME"),
    "stable",
  );
  aptUpdate();
  ctx.pkg.install([
    "docker-ce",
    "docker-ce-cli",
    "containerd.io",
    "docker-buildx-plugin",
    "docker-compose-plugin",
  ]);
  run("usermod", ["-aG", "docker", ctx.user.name]);
  enableService(ctx, "docker.service", "containerd.service");
}

function updateFirmware(ctx: Context): void {
  if (skipInContainer(ctx, "fwupd")) return;
  ctx.pkg.install(["fwupd"]);
  run("fwupdmgr", ["refresh", "--force"]);
  try {
    run("fwupdmgr", ["update", "-y", "--no-reboot-check"]);
  } catch (e) {
    // exit code 2 means there was nothing to update
    if (!(e instanceof CommandError) || e.status !== 2) throw e;
  }
}

// opt-in: docker, auto-cpufreq and firmware updates
function extras(ctx: Context): void {
  installDocker(ctx);
  installAutoCpufreq(ctx);
  updateFirmware(ctx);
}

function gnome(ctx: Context): void {
  apt.install(["gnome-shell-extensions", "gnome-shell-extension-manager", "pipx", "dconf-cli"]);
  configureGnome(ctx, {
    dconfFile: setupPath("ubuntu", "config", "gnome-settings.dconf"),
    nautilusZoom: "medium",
    extraSettings: [["org.gnome.nautilus.preferences", "executable-text-activation", "ask"]],
  });
}

function theme(ctx: Context): void {
  apt.install([
    "papirus-icon-theme",
    "gnome-themes-extra",
    "gtk2-engines-murrine",
    "sassc",
    "git",
    "flatpak",
  ]);
  configureGtkTheme(ctx);
}

export const ubuntu: Distro = {
  pkg: apt,
  plan() {
    return {
      defaults: [
        step("apt", "universe/multiverse/restricted, i386, full upgrade", configureApt),
        step("packages", "apt packages: tools, languages, neovim prerequisites", packages),
        step("apps", "desktop apps and steam", apps),
        step("system", "hostname, unattended upgrades, ssh", system),
        step("flathub", "flatpak and the flathub remote", flathub),
        step("multimedia", "codecs and restricted extras", multimedia),
        step("neovim", "neovim built from source (NVIM_REF, NVIM_REBUILD)", neovim),
        step("stow", "link the repo into $HOME, backing up files in the way", stowDotfiles),
        step("git", "git identity, only where unset", configureGit),
        step("keys", "gpg, pass and ssh keys", configureKeys),
        step("security", "ufw, host.conf, fail2ban", security),
        step("browsers", "chrome, brave and firefox from their vendors' apt repos", browsers),
        step("1password", "1password and its CLI, with the debsig policy", onePassword),
        step("shell", "oh-my-zsh, tpm, zsh login shell, fd/bat links", shell),
        step("python", "pipx black and virtualenv, pyenv", python),
        step("java", "Azul Zulu JDK from the zulu apt repo", java),
        step("rust", "rustup, rust-analyzer, rust-src, viu", (c) => installRust(c, ["viu"])),
        step("node", "nvm + node LTS, pnpm and its globals (sf, lwc server, tree-sitter)", (c) =>
          installNode(c),
        ),
        step("go", "go from go.dev into /usr/local/go, go tools", go),
        step("lua", "luarocks for lua 5.1, luasocket", lua),
        step("ruby", "neovim ruby gem", ruby),
        step("julia", "juliaup", (c) => installJulia(c)),
        step("brew", "homebrew in /home/linuxbrew", brew),
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
        step("flatpaks", "flatpak apps from flathub", flatpaks),
      ],
      optional: [
        step("gnome", "gnome settings, keybindings and extensions", gnome),
        step("theme", "papirus icons and the gruvbox gtk theme", theme),
        step("extras", "docker, auto-cpufreq, firmware updates", extras),
        step("desktop", "Hyprland + Noctalia, after its checks", desktopInstall),
        step("greeter", "noctalia-greeter on greetd, replacing gdm", desktopGreeter),
      ],
    };
  },
  verify(ctx, v) {
    const extraPath = `${ctx.user.searchPath()}:${BREW_PREFIX}/bin:/usr/games`;
    v.section("commands");
    v.commands(
      "neovim-ruby-host",
      "zsh",
      "tmux",
      "git-lfs",
      "ghostty",
      "kitty",
      "bat",
      "eza",
      "jq",
      "stow",
      "btop",
      "fastfetch",
      "gopls",
      "goimports",
      "shfmt",
      "templ",
      "rustc",
      "viu",
      "markdownlint",
      "luarocks",
      "ruby",
      "php",
      "composer",
      "python3",
      "pipx",
      "black",
      "pyenv",
      "julia",
      "google-chrome",
      "brave-browser",
      "firefox",
      "1password",
      "op",
      "ufw",
      "fail2ban-client",
      "flatpak",
      "pass",
      "gpg",
      "ssh-keygen",
    );
    v.check("steam", () => which("steam", extraPath) !== null);
    // runs it: the git-clone install has to leave a working brew
    v.runs("homebrew", `${BREW_PREFIX}/bin/brew`, ["--version"]);
    verifyCommon(ctx, v);

    v.section("distro config");
    v.check("oh-my-zsh", () => existsSync(ctx.user.path(".oh-my-zsh", "oh-my-zsh.sh")));
    v.check("zsh-autosuggestions", () =>
      existsSync(ctx.user.path(".oh-my-zsh", "custom", "plugins", "zsh-autosuggestions")),
    );
    v.check("zsh-syntax-highlighting", () =>
      existsSync(ctx.user.path(".oh-my-zsh", "custom", "plugins", "zsh-syntax-highlighting")),
    );
    v.check("fail2ban jail.local", () => existsSync("/etc/fail2ban/jail.local"));
    v.check("flathub remote", () =>
      /flathub/.test(capture("flatpak", ["remotes", "--columns=name"]).stdout),
    );
    v.check(
      "git init.defaultBranch is main",
      () => capture("git", ["config", "--global", "init.defaultBranch"]).stdout.trim() === "main",
    );
    v.check(
      "lua5.1 has luasocket",
      () => capture("lua5.1", ["-e", 'require("socket")']).status === 0,
    );
    v.check(
      "fd and bat links in ~/.local/bin",
      () =>
        readLink(ctx.user.path(".local", "bin", "fd")) === "/usr/bin/fdfind" &&
        readLink(ctx.user.path(".local", "bin", "bat")) === "/usr/bin/batcat",
    );
    // every third-party repo resolves, with no duplicate/conflicting source warnings
    // (apt-get update needs root: only checked where sudo works without a password)
    if (capture("sudo", ["-n", "true"]).status === 0) {
      v.check("apt update is clean", () => {
        const res = capture("sudo", ["-n", "apt-get", "update"]);
        return res.status === 0 && !/^(W|E):/m.test(res.stdout + res.stderr);
      });
    } else console.log("  skip  apt update is clean (needs passwordless sudo)");

    // the desktop step is opt-in; check it once hyprland or noctalia is there
    if (which("Hyprland", extraPath) || which("noctalia", extraPath)) verifyDesktop(ctx, v);
  },
};
