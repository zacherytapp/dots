#!/usr/bin/env bash
# Herdr port of tmux-sessionizer: pick a project directory and open (or focus)
# a Herdr workspace rooted there. With an argument, skip the picker.
# The picker and machine logic live in sessionizer-lib.sh, shared with herdr-app;
# this file only talks to the herdr CLI.
set -euo pipefail

herdr="${HERDR_BIN_PATH:-herdr}"

notify() {
    "$herdr" notification show "$1" --body "${2:-}" >/dev/null 2>&1 || echo "$1: ${2:-}" >&2
}

machines_tsv() {
    "$herdr" machine list --json 2>/dev/null \
        | jq -r '(if type=="array" then . else .machines end)[]? | [(.label // .id), (.target // .label // .id), ""] | @tsv' 2>/dev/null \
        || true
}

add_machine() { "$herdr" machine add "$1" --label "$2"; }

open_space() {
    local name="$1" folder="$2" machine="${3:-}" on=() existing
    [[ -n "$machine" ]] && on=(--machine "$machine")
    # Focus an existing workspace with the same name instead of creating a second one.
    existing=$("$herdr" "${on[@]}" workspace list 2>/dev/null \
        | jq -r --arg n "$name" '[.result.workspaces[]? | select(.label == $n)][0].workspace_id // empty')
    if [[ -n "$existing" ]]; then
        "$herdr" "${on[@]}" workspace focus "$existing" >/dev/null
    else
        "$herdr" "${on[@]}" workspace create --cwd "$folder" --label "$name" --focus >/dev/null
    fi
}

# shellcheck source-path=SCRIPTDIR source=sessionizer-lib.sh
source "$(dirname "$0")/sessionizer-lib.sh"
sessionizer_main "$@"
