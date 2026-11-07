#!/usr/bin/env bash
# herdr-app port of tmux-sessionizer: pick a project directory and open (or
# focus) a Herdr space rooted there. With an argument, skip the picker.
# Opened in a popup by the `sessionizer` mod (ctrl-space f); the
# `sessionizer-bank` / `sessionizer-ref` mods call it with a folder.
# The picker and machine logic live in sessionizer-lib.sh, shared with herdr;
# this file only talks to the herdr-app and hc CLIs.
set -euo pipefail

notify() {
    notify-send -a herdr "$1" "${2:-}" 2>/dev/null || echo "$1: ${2:-}" >&2
}

machines_tsv() {
    { hc machine ls --json 2>/dev/null || echo '{"machines":[]}'; } \
        | jq -r '.machines[]? | [.name, (.target // .host // .name), (if .temporary then "temporary" else "" end)] | @tsv'
}

add_machine() { hc machine add "$1" --name "$2"; }

# Focus the space called $1 on machine $3 ("" = this computer), or make it in $2.
open_space() {
    local name="$1" folder="$2" machine="${3:-}" id
    id=$(herdr-app ls 2>/dev/null | jq -r --arg n "$name" --arg m "$machine" \
        '[.spaces[]? | select(.name == $n and ((.machine // "") == $m))][0].id // empty')
    if [[ -n "$id" ]]; then
        herdr-app "do" space.select --id "$id" >/dev/null
    else
        herdr-app "do" space.new --name "$name" --folder "$folder" --machine "$machine" >/dev/null
    fi
}

# shellcheck source-path=SCRIPTDIR source=sessionizer-lib.sh
source "$(dirname "$0")/sessionizer-lib.sh"
sessionizer_main "$@"
