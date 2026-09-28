. "$HOME/.cargo/env"

export NVM_DIR="$HOME/.config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm

# >>> juliaup initialize >>>

# !! Contents within this block are managed by juliaup !!

case ":$PATH:" in
    *:/home/zakk/.juliaup/bin:*)
        ;;

    *)
        export PATH=/home/zakk/.juliaup/bin${PATH:+:${PATH}}
        ;;
esac

# <<< juliaup initialize <<<

# Machine-specific settings (e.g. PATH entries that installers append) go in
# ~/.config/shell/local.sh, which is not in dots.
if [ -f "$HOME/.config/shell/local.sh" ]; then . "$HOME/.config/shell/local.sh"; fi
