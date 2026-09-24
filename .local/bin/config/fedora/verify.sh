#!/usr/bin/env bash
# shellcheck disable=SC2016 # snippets expand in the user's shell
# checks the result of run.sh; run as the normal user (not sudo)

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
source "${SCRIPT_DIR}/utils.sh"

if [ "$EUID" -eq 0 ]; then
  echo "run verify.sh as your normal user"
  exit 1
fi

eval "$USER_ENV"

missing=()

check() {
  local desc="$1"
  shift
  if "$@" &>/dev/null; then
    color_echo "green" "  ok       $desc"
  else
    color_echo "red" "  MISSING  $desc"
    missing+=("$desc")
  fi
}

COMMANDS=(
  nvim zsh tmux git lazygit ghostty kitty rg fd fzf bat delta jq stow fastfetch btop htop
  go gopls goimports shfmt templ cargo rustup viu
  node npm pnpm sf prettierd sql-formatter markdownlint
  java luarocks lua luajit tree-sitter
  python3 pipx black pyenv ruby gem php composer phpunit perl cpanm julia clang
  google-chrome brave-browser 1password firefox chromium-browser thunderbird vlc
  ffmpeg flatpak pass gpg ssh ufw fail2ban-client ansible
)

color_echo "blue" "commands"
for cmd in "${COMMANDS[@]}"; do
  check "$cmd" command -v "$cmd"
done

color_echo "blue" "tools"
check "neovim from source (/usr/local/bin/nvim)" test -x /usr/local/bin/nvim
check "nvim runs" nvim --headless +q
check "homebrew" test -x /home/linuxbrew/.linuxbrew/bin/brew
check "luasocket" lua -e 'require("socket")'
check "neovim gem" gem list -i neovim
check "pynvim" python3 -c "import pynvim"
check "nerd fonts" test -d /usr/local/share/fonts/NerdFonts/FiraCode
check "flathub remote" bash -c "flatpak remotes --system | grep -q flathub"

color_echo "blue" "claude code"
statusline="$HOME/.claude/statusline/statusline.sh"
statusline_renders() {
  local out cfg
  cfg=$(mktemp -d)
  out=$(printf '%s' '{"model":{"display_name":"Opus"},"cwd":"/tmp","context_window":{"context_window_size":200000,"current_usage":{"input_tokens":1000}},"rate_limits":{"five_hour":{"used_percentage":12}}}' |
    CLAUDE_CONFIG_DIR="$cfg" DBUS_SESSION_BUS_ADDRESS='' STATUSLINE_CHECK_UPDATES=false "$statusline")
  rm -rf "$cfg"
  grep -q Opus <<<"$out"
}
check "claude" command -v claude
check "claude runs" claude --version
check "statusline executable" test -x "$statusline"
check "settings.json statusLine" jq -e '.statusLine.command == "~/.claude/statusline/statusline.sh"' "$HOME/.claude/settings.json"
check "statusline renders" statusline_renders

color_echo "blue" "shell"
check "oh-my-zsh" test -d "$HOME/.oh-my-zsh"
check "zsh-autosuggestions" test -d "$HOME/.oh-my-zsh/custom/plugins/zsh-autosuggestions"
check "zsh-syntax-highlighting" test -d "$HOME/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting"
check "login shell is zsh" bash -c "getent passwd $(id -un) | cut -d: -f7 | grep -q zsh"
check "tmux plugin manager" test -d "$HOME/.tmux/plugins/tpm"

color_echo "blue" "config"
check "git user.name" git config --global user.name
check "git user.email" git config --global user.email
check "git init.defaultBranch=main" bash -c '[ "$(git config --global init.defaultBranch)" = main ]'
if [ -n "${USER_EMAIL:-}" ]; then
  check "gpg key" gpg --list-secret-keys "<$USER_EMAIL>"
  check "pass store" test -f "$HOME/.password-store/.gpg-id"
  check "ssh key" test -f "$HOME/.ssh/id_ed25519"
fi
check "fail2ban jail.local" test -f /etc/fail2ban/jail.local
check "dnf automatic apply_updates" grep -q '^apply_updates = yes' /etc/dnf/automatic.conf

# the desktop step is opt-in; check it once hyprland or noctalia is there
if command -v Hyprland &>/dev/null || command -v noctalia &>/dev/null; then
  source "${SCRIPT_DIR}/../desktop/checks.sh"
  desktop_verify || missing+=("desktop")
fi

echo
if [ ${#missing[@]} -eq 0 ]; then
  color_echo "green" "verify: all checks passed"
else
  color_echo "red" "verify: ${#missing[@]} missing: ${missing[*]}"
  exit 1
fi
