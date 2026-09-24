#!/usr/bin/env bash
# Checks the result of run.sh. Run as your normal user, not with sudo.

set -uo pipefail

# the same tool dirs .zshrc puts on PATH
export NVM_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/nvm"
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$HOME/.local/bin:$PNPM_HOME/bin:$PNPM_HOME:$HOME/.cargo/bin:$HOME/go/bin:/opt/pmd/bin:$PATH"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

missing=()

check() {
  local desc="$1"
  shift
  if "$@" &>/dev/null; then
    printf '  ok    %s\n' "$desc"
  else
    printf '  FAIL  %s\n' "$desc"
    missing+=("$desc")
  fi
}

check_cmd() {
  local cmd
  for cmd in "$@"; do
    check "$cmd" command -v "$cmd"
  done
}

echo "commands:"
check_cmd paru git git-lfs gh lazygit zsh tmux nvim vim kitty ghostty stow rg fd fzf bat jq ctags \
  tree-sitter cmake go java ruby php composer python pipx uv perl \
  docker docker-compose lazydocker ansible tofu terraform tailscale \
  Hyprland hyprctl hyprpicker noctalia uwsm qt6ct grim slurp wl-copy dolphin \
  firefox thunderbird obsidian discord code 1password google-chrome-stable slack spotify zoom \
  ufw fail2ban-client pass gpg ssh-keygen flatpak \
  rustup cargo node npm pnpm sf stylelint opencode herdr pmd

echo "tool checks:"
check "cargo runs" cargo --version
check "node runs" node --version
check "sf runs" sf --version
check "pmd runs" pmd --version
check "nvim runs" nvim --headless +q
check "oh-my-zsh (cachyos-zsh-config)" test -f /usr/share/cachyos-zsh-config/cachyos-config.zsh
check "nvm linked at $HOME/.nvm" test -s "$HOME/.nvm/nvm.sh"
check "tpm cloned" test -x "$HOME/.tmux/plugins/tpm/tpm"
check "maple mono font" sh -c 'fc-list | grep -qi "maple mono"'
check "jetbrains mono nerd font" sh -c 'fc-list | grep -qi "JetBrainsMono Nerd"'
check "bibata cursor" test -d /usr/share/icons/Bibata-Modern-Ice

echo "user config:"
check "login shell is zsh" sh -c "getent passwd $(id -un) | grep -q '/zsh$'"
check "in docker group" sh -c "id -nG $(id -un) | tr ' ' '\n' | grep -qx docker"
check "git user.email" git config --global user.email
check "git user.name" git config --global user.name
check "gpg secret key" sh -c 'gpg --list-secret-keys --with-colons | grep -q ^sec'
check "pass initialized" test -f "$HOME/.password-store/.gpg-id"
check "ssh key" test -f "$HOME/.ssh/id_ed25519"
check "arch-update timer enabled" test -L "$HOME/.config/systemd/user/timers.target.wants/arch-update.timer"

echo "system config:"
check "fail2ban jail.local" test -f /etc/fail2ban/jail.local
check "ufw ssh rule" sudo grep -q 'dport 22' /etc/ufw/user.rules
check "mac randomization" test -f /etc/NetworkManager/conf.d/randomize_mac_address.conf
check "sshd hardening" test -f /etc/ssh/sshd_config.d/10-hardening.conf
check "mdns in nsswitch" grep -q '^hosts:.*mdns_minimal' /etc/nsswitch.conf
check "flathub remote" sh -c 'flatpak remotes --system | grep -q flathub'

echo
# shellcheck source=../desktop/checks.sh
source "$(dirname "${BASH_SOURCE[0]}")/../desktop/checks.sh"
desktop_verify || missing+=("desktop")

echo
if [ ${#missing[@]} -gt 0 ]; then
  echo "verify failed: ${missing[*]}"
  exit 1
fi
echo "verify passed"
