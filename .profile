[ -r "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"

# PATH for sh/bash login shells and the uwsm session; ~/.zshenv mirrors it for zsh.
# Prepended in reverse, so ~/.juliaup/bin ends up first.
export PNPM_HOME="$HOME/.local/share/pnpm"
for dir in /opt/pmd/bin "$HOME/go/bin" "$PNPM_HOME/bin" "$HOME/bin" "$HOME/.local/bin" "$HOME/.juliaup/bin"; do
    case ":$PATH:" in
        *":$dir:"*) ;;
        *) PATH="$dir${PATH:+:$PATH}" ;;
    esac
done
unset dir
export PATH

export NVM_DIR="$HOME/.config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm

# Untracked machine-specific settings (e.g. PATH entries installers append).
if [ -f "$HOME/.config/shell/local.sh" ]; then . "$HOME/.config/shell/local.sh"; fi
