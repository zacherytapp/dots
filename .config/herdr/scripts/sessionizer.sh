#!/usr/bin/env bash
# usage: sessionizer.sh [dir]
# Open (or focus) a herdr workspace rooted at dir, picked with fzf if omitted.
set -euo pipefail

herdr="${HERDR_BIN_PATH:-herdr}"

dots="$HOME/Projects/dots"

search_dirs=(
    "$HOME/.config"
    "$HOME/.local"
    "$HOME/Projects"
    "$HOME/Projects/boiler"
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
    # find, not fd: hidden/gitignored dirs must show up; -xtype d keeps symlinks.
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
# Keep dots/.config/nvim distinct from the live ~/.config/nvim workspace.
[[ "$selected" == "$dots"/?* ]] && name="dots_$name"

existing=$("$herdr" workspace list 2>/dev/null \
    | jq -r --arg n "$name" '[.result.workspaces[]? | select(.label == $n)][0].workspace_id // empty')

if [[ -n "$existing" ]]; then
    "$herdr" workspace focus "$existing" >/dev/null
else
    "$herdr" workspace create --cwd "$selected" --label "$name" --focus >/dev/null
fi
