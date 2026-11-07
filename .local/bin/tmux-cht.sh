#!/usr/bin/env bash
# Pick a language or command, ask a question, and open the cht.sh answer in a
# new tmux window. The lists are inline (kept in sync with herdr/scripts/cht.sh).
set -uo pipefail

languages="golang lua nodejs typescript javascript rust python fish bash zsh sql html css"
commands="find xargs sed awk rg fd git docker kubectl systemctl tmux ssh curl jq"

selected=$(printf '%s\n%s\n' "${languages// /$'\n'}" "${commands// /$'\n'}" | fzf)
[[ -z "$selected" ]] && exit 0

read -rp "Enter Query: " query
query="${query// /+}"

if printf '%s\n' "$languages" | grep -qw -- "$selected"; then
    url="cht.sh/$selected/$query"
else
    url="cht.sh/$selected~$query"
fi

# Pass the URL as an argument so quotes in the query can't break the command.
# shellcheck disable=SC2016 # $1 expands in the child shell
tmux neww bash -c 'echo "curl $1"; curl -s "$1" | less -R' _ "$url"
