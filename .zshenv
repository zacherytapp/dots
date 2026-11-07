[ -r "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"

export EDITOR=nvim
export VISUAL=nvim
export SUDO_EDITOR=nvim
export MANPAGER='nvim +Man!'

# PATH for every zsh, interactive or not; ~/.profile mirrors it for sh, bash and uwsm.
export PNPM_HOME="$HOME/.local/share/pnpm"
typeset -U path
path=(
  "$HOME/.juliaup/bin"
  "$HOME/.local/bin"
  "$HOME/bin"
  "$PNPM_HOME/bin"
  "$HOME/go/bin"
  /opt/pmd/bin
  $path
)
export PATH
