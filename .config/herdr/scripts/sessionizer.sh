#!/usr/bin/env bash
# Herdr port of tmux-sessionizer: pick a project directory and open (or focus)
# a Herdr workspace rooted there. With an argument, skip the picker.
set -euo pipefail

herdr="${HERDR_BIN_PATH:-herdr}"

dots="$HOME/projects/dots"

# Directories whose immediate children are candidates — tmux-sessionizer's list
# (~/.config covers nvim, tmux, herdr, ...), plus the dotfiles repo's configs
# and the Documents/Downloads subfolders.
search_dirs=(
    "$HOME/.config"
    "$HOME/.local"
    "$HOME/projects"
    "$HOME/Projects"
    "$HOME/projects/boiler"
    "$HOME/work"
    "$HOME/personal"
    "$dots"
    "$dots/.config"
    "$dots/.local"
    "$HOME/Documents"
    "$HOME/Downloads"
)

notify() {
    "$herdr" notification show "$1" --body "${2:-}" >/dev/null 2>&1 || echo "$1: ${2:-}" >&2
}

if [[ $# -ge 1 ]]; then
    selected="$1"
else
    existing_dirs=()
    for d in "${search_dirs[@]}"; do [[ -d "$d" ]] && existing_dirs+=("$d"); done
    # find (not fd) so hidden and gitignored dirs like ~/projects/dots/.config
    # show up; -xtype d also keeps symlinked dirs.
    selected=$(find "${existing_dirs[@]}" -mindepth 1 -maxdepth 1 -xtype d \
            ! -name .git 2>/dev/null \
        | sed "s|^$HOME|~|" | sort -u \
        | fzf --prompt='project> ' --height=100%)
fi

[[ -z "${selected:-}" ]] && exit 0
selected="${selected/#\~/$HOME}"
selected="${selected%/}"

if [[ ! -d "$selected" ]]; then
    notify "sessionizer" "no such directory: $selected"
    exit 1
fi

name=$(basename "$selected" | tr . _)
# Keep dotfiles-repo copies (e.g. dots/.config/nvim) apart from the live ~/.config ones.
[[ "$selected" == "$dots"/?* ]] && name="dots_$name"

# Focus an existing workspace with the same name instead of creating a second one.
existing=$("$herdr" workspace list 2>/dev/null \
    | jq -r --arg n "$name" '[.result.workspaces[]? | select(.label == $n)][0].workspace_id // empty')

if [[ -n "$existing" ]]; then
    "$herdr" workspace focus "$existing" >/dev/null
else
    "$herdr" workspace create --cwd "$selected" --label "$name" --focus >/dev/null
fi
