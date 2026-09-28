. "$HOME/.cargo/env"

export NVM_DIR="$HOME/.config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

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

# Untracked machine-specific settings (e.g. PATH entries installers append).
if [ -f "$HOME/.config/shell/local.sh" ]; then . "$HOME/.config/shell/local.sh"; fi
