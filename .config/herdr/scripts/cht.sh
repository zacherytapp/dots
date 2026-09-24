#!/usr/bin/env bash
# Herdr port of tmux-cht.sh: pick a language or command, ask a question,
# and page the answer from cht.sh.
set -euo pipefail

languages="golang lua nodejs typescript javascript rust python fish bash zsh sql html css"
commands="find xargs sed awk rg fd git docker kubectl systemctl tmux ssh curl jq"

selected=$(printf '%s\n%s\n' "${languages// /$'\n'}" "${commands// /$'\n'}" \
    | fzf --prompt='cht.sh> ')
[[ -z "$selected" ]] && exit 0

read -rp "query: " query

if printf '%s\n' "$languages" | grep -qw -- "$selected"; then
    url="cht.sh/$selected/${query// /+}"
else
    url="cht.sh/$selected~${query// /+}"
fi

curl -s "$url" | less -R
