[[ $- != *i* ]] && return

alias ls='ls --color=auto'
alias grep='grep --color=auto'
PS1='[\u@\h \W]\$ '
. "$HOME/.cargo/env"

# >>> juliaup initialize >>>

# !! Contents within this block are managed by juliaup !!

case ":$PATH:" in
    *:/home/zakk/.juliaup/bin:*)
        ;;

    *)
        export PATH=/home/zakk/.juliaup/bin${PATH:+:${PATH}}
        ;;
esac
# Tab completion for juliaup and julia channel selection
[ -f "/home/zakk/.julia/juliaup/completions/bash.sh" ] && source "/home/zakk/.julia/juliaup/completions/bash.sh"

# <<< juliaup initialize <<<

# Untracked machine-specific settings (e.g. PATH entries installers append).
if [ -f "$HOME/.config/shell/local.sh" ]; then . "$HOME/.config/shell/local.sh"; fi
