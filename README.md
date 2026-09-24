# Zakk's Dotfiles

## Overview

This Mostly used for Salesforce/Javascript development - but trying to use some semi-sane defaults.

## Setup

Pick your OS, run its steps, then finish with the [steps for every OS](#all-operating-systems) and
[link the dotfiles](#install-instructions).

- [Arch Linux / CachyOS](#arch-linux--cachyos)
- [Fedora](#fedora)
- [Debian / Ubuntu](#debian--ubuntu)
- [All operating systems](#all-operating-systems)

### Arch Linux / CachyOS

The base system (kernel, bootloader, snapper, NVIDIA/Intel drivers, Hyprland + Noctalia, audio, fonts)
comes from the CachyOS installer and isn't listed here. On CachyOS, `oh-my-zsh-git` is pulled in by
`cachyos-zsh-config`, so the [Oh My Zsh](#all-operating-systems) install step can be skipped.

**Install paru (AUR helper)**

```
sudo pacman -S --needed base-devel git
git clone https://aur.archlinux.org/paru.git && cd paru && makepkg -si
```

**Shell, CLI and editors**

```
sudo pacman -S --needed zsh kitty ghostty tmux git github-cli lazygit fzf ripgrep \
stow unzip ctags vim neovim tree-sitter-cli cmake gettext
```

**Languages and runtimes**

```
sudo pacman -S --needed go jdk-openjdk ruby php php-apache composer \
python-pip python-pipx python-websockets uv
```

**Containers and infrastructure**

```
sudo pacman -S --needed docker docker-compose docker-buildx lazydocker \
ansible opentofu terraform tailscale
sudo systemctl enable --now docker tailscaled
sudo usermod -aG docker $USER
```

**Desktop applications**

```
sudo pacman -S --needed obsidian discord thunderbird libreoffice-fresh remmina \
nautilus gimp darktable digikam opencv gpu-screen-recorder playerctl flatpak
```

**CachyOS extras and gaming**

```
sudo pacman -S --needed cachy-update cachyos-samba-settings dmemcg-booster \
appmenu-gtk-module libdbusmenu-glib cachyos-gaming-meta cachyos-gaming-applications protonup-qt
```

**AUR packages**

```
paru -S 1password google-chrome slack-desktop spotify visual-studio-code-bin zoom
```

**Installed outside pacman**

- [rustup](https://rustup.rs): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- Node via [NVM](#all-operating-systems), plus [pnpm](https://pnpm.io/installation) for global packages:
  - `pnpm add -g @salesforce/cli @salesforce/lwc-language-server stylelint opencode-ai`

**User services**

- `systemctl --user enable --now arch-update.timer` (from `cachy-update`: update checks and the tray
  notifier)

**Desktop (Hyprland + Noctalia)**

- CachyOS: `sudo ./.local/bin/config/cachy/run.sh` (default `desktop` step). Packages come from
  `cachyos-hypr-noctalia` and the cachyos repo.
- Arch: `.local/bin/config/arch/run.sh` (`scripts/2-configure_hypr.sh`). Packages come from `[extra]`, plus the
  AUR for swash and Bibata.

See [Hyprland + Noctalia desktop](#hyprland--noctalia-desktop) for what the installer checks.

### Fedora

**Packages**

- `sudo dnf install zsh kitty tmux git unzip fzf ripgrep vim ttf-ms-fonts python-dev python3-dev libssl-dev python3-pip gimp flatpak`
- `sudo dnf -y install ninja-build cmake gcc make unzip gettext curl`

**Neovim**

- [Build Neovim from source](#build-neovim-from-source-fedora-debian--ubuntu)

**Java: Zulu17**

- [Zulu17 Download](https://www.azul.com/core-post-download/?endpoint=zulu&uuid=65bccb64-a1f4-4c8c-964e-24c6d8a03ddb)
- Alternatively, `wget https://www.azul.com/core-post-download/?endpoint=zulu&uuid=65bccb64-a1f4-4c8c-964e-24c6d8a03ddb`

**Desktop (Hyprland + Noctalia)**

- Fedora 44+: `sudo ./.local/bin/config/fedora/run.sh desktop`. Hyprland comes from the `lionheartp/Hyprland`
  copr, Noctalia from Fedora.

See [Hyprland + Noctalia desktop](#hyprland--noctalia-desktop) for what the installer checks.

### Debian / Ubuntu

**Packages**

```
sudo apt install zsh kitty tmux git fzf ripgrep vim python3-pip gimp \
flatpak lua5.4 liblua5.4-dev ruby-full ninja-build gettext cmake unzip curl \
perl curl neofetch xclip ca-certificates curl php-cli php-zip
```

**Lua and LuaRocks**

- `sudo apt install lua5.4 liblua5.4-dev`
- Follow these instructions:
  - `wget https://luarocks.org/releases/luarocks-3.11.1.tar.gz`
  - `tar zxpf luarocks-3.11.1.tar.gz`
  - `cd luarocks-3.11.1`
  - `./configure && make && sudo make install`
  - `sudo luarocks install luasocket`

**Ruby**

- `gem install neovim`

**Neovim**

- [Build Neovim from source](#build-neovim-from-source-fedora-debian--ubuntu)

**Java: Zulu17**

- [Zulu17 Download](https://www.azul.com/core-post-download/?endpoint=zulu&uuid=9f020a32-d669-4f80-b4be-7a2551d0e7df)
- Alternatively, `wget https://www.azul.com/core-post-download/?endpoint=zulu&uuid=9f020a32-d669-4f80-b4be-7a2551d0e7df`

**Desktop (Hyprland + Noctalia)**

- Ubuntu 26.04+: `sudo ./.local/bin/config/ubuntu/run.sh desktop`. Hyprland comes from the Ubuntu archive,
  Noctalia from `pkg.noctalia.dev`.
- Ubuntu 26.04 ships Hyprland 0.53, so the Ubuntu check refuses to install until the archive has
  0.55 (26.10) or a newer Hyprland is already installed, e.g. built from source.

See [Hyprland + Noctalia desktop](#hyprland--noctalia-desktop) for what the installer checks.

### All operating systems

Run these after your OS's steps.

- [ ] Install Nerd Fonts. Dank Mono, Fira Code and Maple Font are ideal
- [ ] [Oh My Zsh](https://github.com/robbyrussell/oh-my-zsh) (skip on CachyOS)
  - `sh -c "$(curl -fsSL https://raw.githubusercontent.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"`
- [ ] [Spaceship Prompt](https://github.com/denysdovhan/spaceship-prompt)
  - `git clone https://github.com/denysdovhan/spaceship-prompt.git "$ZSH_CUSTOM/themes/spaceship-prompt"`
  - `ln -s "$ZSH_CUSTOM/themes/spaceship-prompt/spaceship.zsh-theme" "$ZSH_CUSTOM/themes/spaceship.zsh-theme"`
- [ ] [Zsh Autosuggestions](https://github.com/zsh-users/zsh-autosuggestions)
  - `git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions`
  * `echo "bindkey '^ ' autosuggest-accept" >> $ZSH_CUSTOM/autosuggestion-settings.zsh`
  * `source $ZSH_CUSTOM/autosuggestion-settings.zsh`
- [ ] [Zsh Syntax Highlighting](https://github.com/zsh-users/zsh-syntax-highlighting)
  - `git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting`
- [ ] [NVM](https://github.com/nvm-sh/nvm)
  - `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash`
  - `source ~/.zshrc`
  - `nvm install node -g`
  - Install other node/neovim dependenices:
    - `npm install -g neovim`
    - `npm install -g sql-formatter`
    - `npm install -g tree-sitter`
- [ ] Install [SFDX CLI](https://github.com/salesforcecli/cli/)
  - `npm install -g @salesforce/cli`
- [ ] [PMD](#pmd) in `/opt/pmd`
- [ ] [TPM](https://github.com/tmux-plugins/tpm), which `tmux.conf` loads; press prefix + I in tmux
  to install the plugins:
  - `git clone --depth 1 https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm`
- [ ] VS Code extensions (settings, keybindings, snippets and MCP servers are stowed from
  `.config/Code/User`):
  - `xargs -L1 code --install-extension < .local/bin/config/vscode-extensions.txt`

#### Flatpak (if needed)

- `flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo`
- `flatpak update`

#### Build Neovim from source (Fedora, Debian / Ubuntu)

Arch and CachyOS get Neovim from pacman. See
[Neovim Documentation](https://github.com/neovim/neovim/blob/master/INSTALL.md#install-from-source) for more:

- `git clone https://github.com/neovim/neovim`
- `cd neovim && make CMAKE_BUILD_TYPE=RelWithDebInfo`
- `sudo make install`

#### PMD

- `wget https://github.com/pmd/pmd/releases/download/pmd_releases%2F7.0.0-rc4/pmd-dist-7.0.0-rc4-bin.zip`
- `unzip` PMD
- Copy to `/opt/pmd`

## Install Instructions

Dotfiles are managed with [GNU Stow](https://www.gnu.org/software/stow/). The repo mirrors
`$HOME` directly (`.zshrc`, `.config/nvim`, `.local/bin/...`), and `stow .` symlinks every
file into place. `.stowrc` sets the target to `~` and enables `--no-folding`, so only files
are linked: directories already in `~/.config` are merged with the repo rather than
replaced, and apps that drop logs, sockets or backups next to their config never write into
this repo. `.stow-local-ignore` keeps repo-only files (`README.md`, `AGENTS.md`, `.local/bin/config/`,
git files) out of `$HOME`.

`.local/bin/config/` holds the per-distro install scripts. It sits under `.local/bin` but is
never linked, so run them from the repo checkout.

**Fresh machine (repo wins)**

```
git clone git@github.com:zacherytapp/dots.git ~/projects/dots
cd ~/projects/dots
stow -n -v .   # dry run: shows links and conflicts
stow .
```

Distro installers ship default files (`~/.bashrc`, `~/.zshrc`, `kitty.conf`, ...) that make
stow refuse with a conflict. To replace them with the repo's versions, adopt them and then
discard the adopted content:

```
stow --adopt .   # moves the existing files into the repo and links them
git restore .    # throws the adopted content away, keeping the repo versions
```

To skip parts that don't apply to a machine (e.g. no Hyprland, or no wallpapers), pass
`--ignore` regexes: `stow --ignore='walls' --ignore='hypr' .`

**Machine with newer config (machine wins)**

Run the same `stow --adopt .`, but review with `git diff` and commit instead of restoring.

**Keeping things in sync**

Editing a linked file edits the repo directly. Adding a new file means creating it in the
repo and running `stow -R .`. Some apps (GUI settings panels, Noctalia, qt6ct) save by
writing a new file and renaming it over the old one, which replaces the symlink with a
regular file. If `git status` stays clean after changing a setting, run `stow --adopt .`
to pull the file back into the repo.

- Remove all links: `stow -D .`
- Relink after adding or removing files: `stow -R .`

## Hyprland + Noctalia desktop

The desktop is [Hyprland](https://hypr.land) (Lua config, so **0.55 or newer**) with the
[Noctalia](https://noctalia.dev) v5 shell for the bar, launcher, notifications, lock screen,
idle, OSD, clipboard and screenshots, started through uwsm.

| Path | What it is |
| --- | --- |
| `.config/hypr/` | Hyprland Lua config (`config/*.lua`); `colors.lua` holds the palette |
| `.config/noctalia/config.toml` | Noctalia config: bar, widgets, plugins, idle, wallpaper, templates |
| `.config/noctalia/palettes/GruvboxMaterial.json` | the custom palette Noctalia themes everything with |
| `.config/uwsm/env` | session environment (Qt platform theme, cursor, NVIDIA lines) |
| `.config/walls/` | wallpapers; Noctalia's picker and default wallpaper point here |

**Installing.** `.local/bin/config/desktop/` is shared by every distro installer; the command for each OS
is in its [Setup](#setup) section. It runs checks first and only installs if they pass:
supported distro and release, architecture, and a Hyprland package new enough for the Lua
config. It also warns about leftover bars (waybar, hyprpanel, ags), the old Quickshell
Noctalia v4, the display manager in use, and NVIDIA GPUs.

`sudo ./.local/bin/config/<distro>/run.sh greeter` is opt-in on every distro: it sets up noctalia-greeter
on greetd as the login screen, replacing gdm/sddm, and turns on passwordless greeter sync.

**Gruvbox everywhere.** Everything uses Gruvbox Material (dark, medium):

- Noctalia uses `palettes/GruvboxMaterial.json`.
- Its templates render the same colors for GTK 3/4, Qt (qt5ct/qt6ct), KDE apps (kdeglobals),
  kitty, ghostty, alacritty and btop.
- The rendered files are committed too, so apps are themed before Noctalia's first run.
- Hyprland (`colors.lua`), Neovim (`sainnhe/gruvbox-material`), tmux (ukiyo with Material
  overrides), herdr, fzf, bat/delta and the Fedora/Ubuntu GNOME GTK theme use the same hex
  values.

**Noctalia settings drift.** Noctalia reads `~/.config/noctalia/*.toml`, then applies
whatever the settings window saved to `~/.local/state/noctalia/settings.toml` on top. That
file isn't stowed, so GUI changes never show up in `git status`. Run `noctalia-sync` to see
what the GUI changed compared with the repo. Copy the lines you want into `config.toml`,
then run `noctalia-sync --clear` so the repo file is the only source again.

## AI agent config

- `.agents/` is the shared skills and hooks repo (see `.agents/AGENTS.md`). It used to be a
  standalone local git repo at `~/.agents`. Run `npm install && npm run check` inside it to
  validate skills and hooks.
- `.claude/` and `.pi/agent/` hold only user settings, rules and relative skill symlinks into
  `~/.agents/skills`.
- The status line in `.claude/settings.json` runs
  [ClaudeCodeStatusLine](https://github.com/daniel3303/ClaudeCodeStatusLine), which is cloned rather
  than tracked:
  `git clone https://github.com/daniel3303/ClaudeCodeStatusLine ~/.claude/statusline`

Not tracked on purpose: credentials, history, sessions, caches and project memory. Files that
other tools generate are also left out, and those tools recreate them:

- `~/.claude/hooks/herdr-agent-state.sh` is written by the herdr integration.
- The `plannotator*` skill copies in `~/.claude/skills` come from the Plannotator installer.
- `~/.claude/plugins` comes from `/plugin install`.
- `~/.pi/agent/{npm,install,bin}` are managed by pi.

Skill installers (`npx skills`, Plannotator) replace whole skill directories, which turns
stow's per-file links back into regular files. After updating skills, run `stow --adopt .`.

## TODO:

- [ ] Instructions for installing python
- [ ] Instructions for installing ruby
- [ ] Instructions for installing lua
- [ ] Instructions for configuring various needed npm packages

## Arch Linux TODO:

- [ ] Configure Ansible for Arch Linux
- [ ] Figure out how to open Gwenview from Dolphin
- [ ] Figure out how to make electron apps open faster using Ozone for Hyprland
- [ ] Solve Plymouth Splash Screen Issue
- [x] Ensure consistent theming across all used applications (Gruvbox Material)
- [ ] Solve issue with OpenBubbles not opening Dolphin
