#!/usr/bin/env bash
# Herdr port of `bind -r O select-window -t :logs` and friends: focus the tab
# with the given name in the active workspace, creating it if it is missing.
set -euo pipefail

herdr="${HERDR_BIN_PATH:-herdr}"
name="${1:?usage: goto-tab.sh <tab-name>}"
workspace="${HERDR_ACTIVE_WORKSPACE_ID:-${HERDR_WORKSPACE_ID:-}}"

args=()
[[ -n "$workspace" ]] && args=(--workspace "$workspace")

tab=$("$herdr" tab list "${args[@]}" 2>/dev/null \
    | jq -r --arg n "$name" '[.result.tabs[]? | select((.custom_label // .label) == $n)][0].tab_id // empty')

if [[ -n "$tab" ]]; then
    "$herdr" tab focus "$tab" >/dev/null
else
    "$herdr" tab create "${args[@]}" --label "$name" --focus >/dev/null
fi
