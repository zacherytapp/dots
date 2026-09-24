#!/usr/bin/env bash
# Check the result of run.sh. Run as the normal user (not root).

export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$HOME/go/bin:/usr/local/go/bin:$HOME/.juliaup/bin:$HOME/.pyenv/bin:/home/linuxbrew/.linuxbrew/bin:$PATH:/usr/games"
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME/bin:$PNPM_HOME:$PATH"

COMMANDS=(
  nvim zsh tmux git gh lazygit ghostty kitty delta rg fd bat fzf eza jq stow btop fastfetch
  go gopls goimports shfmt templ cargo rustc viu tree-sitter
  node npm pnpm sf prettierd sql-formatter markdownlint
  java luarocks ruby neovim-ruby-host php composer python3 pipx black pyenv julia brew
  google-chrome brave-browser firefox 1password op
  ufw fail2ban-client flatpak steam
)

missing=0
check() {
  if "$@" &>/dev/null; then
    printf '  ok   %s\n' "$*"
  else
    printf '  MISS %s\n' "$*"
    missing=$((missing + 1))
  fi
}

echo "commands:"
for cmd in "${COMMANDS[@]}"; do
  check command -v "$cmd"
done

echo "files:"
check test -d "$HOME/.oh-my-zsh"
check test -d "$HOME/.oh-my-zsh/custom/plugins/zsh-autosuggestions"
check test -d "$HOME/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting"
check test -d "$HOME/.tmux/plugins/tpm"
check test -f "$HOME/.ssh/id_ed25519"
check test -f "$HOME/.password-store/.gpg-id"
check test -f /etc/fail2ban/jail.local
check flatpak remotes --columns=name -d | grep -qx flathub

echo "claude code:"
statusline="$HOME/.claude/statusline/statusline.sh"
statusline_renders() {
  local out cfg
  cfg=$(mktemp -d)
  out=$(printf '%s' '{"model":{"display_name":"Opus"},"cwd":"/tmp","context_window":{"context_window_size":200000,"current_usage":{"input_tokens":1000}},"rate_limits":{"five_hour":{"used_percentage":12}}}' |
    CLAUDE_CONFIG_DIR="$cfg" DBUS_SESSION_BUS_ADDRESS='' STATUSLINE_CHECK_UPDATES=false "$statusline")
  rm -rf "$cfg"
  grep -q Opus <<<"$out"
}
check command -v claude
check claude --version
check test -x "$statusline"
# shellcheck disable=SC2016 # jq expression, not shell
check jq -e '.statusLine.command == "~/.claude/statusline/statusline.sh"' "$HOME/.claude/settings.json"
check statusline_renders

echo "config:"
check test "$(git config --global init.defaultBranch)" = main
check test -n "$(git config --global user.email)"
check test -n "$(git config --global user.name)"
check test "$(getent passwd "$(id -un)" | cut -d: -f7)" = "$(command -v zsh)"
check nvim --headless -c 'lua assert(vim.version().minor >= 11)' -c q
check lua5.1 -e 'require("socket")'
# every third-party repo resolves, with no duplicate/conflicting source warnings
apt_clean() {
  local out
  out=$(sudo apt-get update 2>&1) || return 1
  ! grep -qE '^(W|E):' <<<"$out"
}
check apt_clean

# the desktop step is opt-in; check it once hyprland or noctalia is there
if command -v Hyprland &>/dev/null || command -v noctalia &>/dev/null; then
  # shellcheck source=../desktop/checks.sh
  source "$(dirname "${BASH_SOURCE[0]}")/../desktop/checks.sh"
  desktop_verify || missing=$((missing + 1))
fi

if [ "$missing" -ne 0 ]; then
  echo "verify: $missing check(s) failed"
  exit 1
fi
echo "verify: all checks passed"
