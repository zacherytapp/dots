# oh-my-zsh, powerlevel10k (instant prompt and ~/.p10k.zsh) and the zsh plugins
# come from cachyos-zsh-config. Cargo's env is loaded in ~/.zshenv.
source /usr/share/cachyos-zsh-config/cachyos-config.zsh

export NVM_DIR="$HOME/.config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

export PNPM_HOME="$HOME/.local/share/pnpm"

typeset -U path
path=(
  "$HOME/.local/bin"
  "$HOME/bin"
  "$PNPM_HOME/bin"
  "$HOME/go/bin"
  /opt/pmd/bin
  $path
)

export SFDX_APEX_LOG_COLOR_MAP="$HOME/.config/nvim/lspserver/apex-colors.json"
export SF_USE_GENERIC_UNIX_KEYCHAIN=true

# lets pinentry ask for the gpg passphrase (commit signing) in terminals and SSH
export GPG_TTY=$TTY

# Gruvbox Material, matching nvim, tmux, the terminals and noctalia
export BAT_THEME="gruvbox-dark"
export FZF_DEFAULT_OPTS="$FZF_DEFAULT_OPTS \
  --color=fg:#d4be98,bg:-1,hl:#7daea3,fg+:#ddc7a1,bg+:#45403d,hl+:#7daea3 \
  --color=info:#d8a657,prompt:#a9b665,pointer:#a9b665,marker:#e78a4e,spinner:#89b482 \
  --color=header:#7daea3,border:#5a524c,gutter:-1"

source ~/.config/zsh/worktrees.zsh

# >>> juliaup initialize >>>

# !! Contents within this block are managed by juliaup !!

path=('/home/zakk/.juliaup/bin' $path)
export PATH
# Tab completion for juliaup and julia channel selection
[ -f "/home/zakk/.julia/juliaup/completions/zsh.zsh" ] && source "/home/zakk/.julia/juliaup/completions/zsh.zsh"

# <<< juliaup initialize <<<
