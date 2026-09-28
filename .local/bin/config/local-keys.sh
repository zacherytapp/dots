#!/usr/bin/env bash
# Git filter that keeps machine-local keys of stowed JSON settings files out of
# commits. Apps write local state into files that are linked from this repo
# (/auto-mode-setup puts `autoMode` in ~/.claude/settings.json, pi saves its
# provider and model in ~/.pi/agent/settings.json). .gitattributes sends those
# files through this filter: the keys stay on disk, git diff ignores them, and
# they never reach a commit.
#
#   local-keys.sh install        register the filter in this clone (once per clone)
#   local-keys.sh clean <path>   stdin -> the shared part of <path>, for the index
#   local-keys.sh smudge <path>  stdin -> the checked-out file, with <path>'s local
#                                keys put back
#
# git deletes a file before it smudges the new version, so clean saves the local
# keys under .git/local-keys/ and smudge restores them from there; a checkout,
# restore or pull keeps them.
#
# git counts a file whose size changed as modified without running the filter,
# so after a local-only change git status can list the file while git diff is
# empty. `git add` it to refresh the index; nothing gets staged.
#
# To cover another file, add it to .gitattributes and to shared() below.
set -euo pipefail

prog=${0##*/}
die() { printf '%s: %s\n' "$prog" "$*" >&2; exit 1; }

# jq program that maps the whole file to the part that belongs in dots
shared() {
  case $1 in
  .claude/settings.json) echo 'del(.autoMode)' ;;
  .pi/agent/settings.json) echo '{packages}' ;;
  *) echo '.' ;;
  esac
}

# where clean keeps the local keys of <path> for smudge
saved() {
  local dir
  dir=$(git rev-parse --git-path local-keys)
  mkdir -p "$dir"
  printf '%s/%s.json' "$dir" "${1//\//%}"
}

case ${1:-} in
install)
  repo=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
  # git runs filters from the top of the work tree, so a relative path works.
  # A new worktree can check out the settings files before this script, and
  # has no local keys yet, so smudge passes the content through until it exists.
  git -C "$repo" config filter.local-keys.clean '.local/bin/config/local-keys.sh clean %f'
  git -C "$repo" config filter.local-keys.smudge \
    'f=.local/bin/config/local-keys.sh; if [ -x "$f" ]; then "$f" smudge %f; else cat; fi'
  # fail closed: without jq, git add errors instead of committing local keys
  git -C "$repo" config filter.local-keys.required true
  echo "local-keys filter registered in $repo"
  ;;
clean)
  [[ $# -eq 2 ]] || die "usage: $prog clean <path>"
  in=$(cat)
  jq --indent 2 "$(shared "$2")" <<<"$in"
  file=$(saved "$2")
  if keys=$(jq -c "($(shared "$2")) as \$s
      | with_entries(select(.key as \$k | \$s | has(\$k) | not))" <<<"$in") \
    && [[ $keys != '{}' ]]; then
    printf '%s\n' "$keys" >"$file.tmp" && mv "$file.tmp" "$file"
  else
    rm -f "$file"
  fi
  ;;
smudge)
  [[ $# -eq 2 ]] || die "usage: $prog smudge <path>"
  in=$(cat)
  file=$(saved "$2")
  # Without saved keys (a fresh clone), or if either side isn't a JSON object,
  # check out the shared part as is.
  if [[ -f $file ]] && out=$(jq --indent 2 --slurpfile keys "$file" '. + $keys[0]' \
    <<<"$in" 2>/dev/null); then
    printf '%s\n' "$out"
  else
    printf '%s\n' "$in"
  fi
  ;;
*) die "usage: $prog install | clean <path> | smudge <path>" ;;
esac
