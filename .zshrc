export ZSH="$HOME/.oh-my-zsh"

ZSH_THEME="robbyrussell"

plugins=(
  git
  colorize
  poetry
  zsh-syntax-highlighting
  fast-syntax-highlighting
  zsh-autosuggestions
  zsh-autocomplete
)

source $ZSH/oh-my-zsh.sh

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
export PATH="$HOME/.poetry/bin:$PATH"

[[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

alias config='/usr/bin/git --git-dir=/home/zakk/.cfg/ --work-tree=/home/zakk'
alias sf_project="sfdx force:project:create --manifest --projectname $1"
alias sf_connect_sb="sfdx force:auth:web:login -r https://test.salesforce.com --setdefaultusername --setalias $1"
alias python="python3"

export PATH="$HOME/.local/bin:$PATH"
export PATH="$HOME/.config/bin/pmd.sh:$PATH"
export PATH="$HOME/.cargo/bin:$PATH"
export PATH="$HOME/go/bin:$PATH"
export PATH="$HOME/julia-1.10.4/bin:$PATH"
export PATH="$HOME/bin:$PATH"
export PATH="$HOME/linuxbrew/.linuxbrew/bin :$PATH"
export PATH=$PATH:/usr/local/go/bin
export PATH="/opt/pmd/bin:$PATH"
export SFDX_APEX_LOG_COLOR_MAP="$HOME/.config/nvim/lspserver/apex-colors.json"
export SF_USE_GENERIC_UNIX_KEYCHAIN=true
export PNPM_HOME="/home/zakk/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

source /home/zakk/.cargo/env

# Perl configuration
PATH="/home/zakk/perl5/bin${PATH:+:${PATH}}"
export PATH
PERL5LIB="/home/zakk/perl5/lib/perl5${PERL5LIB:+:${PERL5LIB}}"
export PERL5LIB
PERL_LOCAL_LIB_ROOT="/home/zakk/perl5${PERL_LOCAL_LIB_ROOT:+:${PERL_LOCAL_LIB_ROOT}}"
export PERL_LOCAL_LIB_ROOT
PERL_MB_OPT="--install_base \"/home/zakk/perl5\""
export PERL_MB_OPT
PERL_MM_OPT="INSTALL_BASE=/home/zakk/perl5"
export PERL_MM_OPT
ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=5'

# >>> juliaup initialize >>>

# !! Contents within this block are managed by juliaup !!

path=('/home/zakk/.juliaup/bin' $path)
export PATH

# <<< juliaup initialize <<<
export PYENV_ROOT="$HOME/.pyenv"
[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"
eval "$(starship init zsh)"

eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
