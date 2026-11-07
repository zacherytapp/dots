#
# ~/.bashrc
#

# If not running interactively, don't do anything
[[ $- != *i* ]] && return

alias ls='ls --color=auto'
alias grep='grep --color=auto'
PS1='[\u@\h \W]\$ '
[ -r "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"

# juliaup completions; its PATH is in ~/.profile (juliaup's modifypath is off so it
# never rewrites these files with absolute paths)
[ -f "$HOME/.julia/juliaup/completions/bash.sh" ] && source "$HOME/.julia/juliaup/completions/bash.sh"

# Untracked machine-specific settings (e.g. PATH entries installers append).
if [ -f "$HOME/.config/shell/local.sh" ]; then . "$HOME/.config/shell/local.sh"; fi
