# On CachyOS, oh-my-zsh, powerlevel10k (instant prompt and ~/.p10k.zsh) and the zsh
# plugins come from cachyos-zsh-config. Elsewhere, the same pieces are installed into
# ~/.oh-my-zsh as described in the README. Cargo's env is loaded in ~/.zshenv.
if [[ -r /usr/share/cachyos-zsh-config/cachyos-config.zsh ]]; then
  source /usr/share/cachyos-zsh-config/cachyos-config.zsh
else
  if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
    source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
  fi
  export ZSH="$HOME/.oh-my-zsh"
  ZSH_THEME="powerlevel10k/powerlevel10k"
  plugins=(git fzf extract zsh-autosuggestions zsh-syntax-highlighting)
  [[ -r "$ZSH/oh-my-zsh.sh" ]] && source "$ZSH/oh-my-zsh.sh"
  [[ -r ~/.p10k.zsh ]] && source ~/.p10k.zsh
fi

export NVM_DIR="$HOME/.config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# PATH (including pnpm, go and juliaup) is set in ~/.zshenv.

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

# juliaup completions; its PATH is in ~/.zshenv (juliaup's modifypath is off so it
# never rewrites these files with absolute paths)
[ -f "$HOME/.julia/juliaup/completions/zsh.zsh" ] && source "$HOME/.julia/juliaup/completions/zsh.zsh"
