#
# ~/.bash_profile
#

[[ -f ~/.bashrc ]] && . ~/.bashrc

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

# Machine-specific settings (e.g. PATH entries that installers append) go in
# ~/.config/shell/local.sh, which is not in dots.
if [ -f "$HOME/.config/shell/local.sh" ]; then . "$HOME/.config/shell/local.sh"; fi
