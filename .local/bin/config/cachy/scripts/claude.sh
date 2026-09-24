#!/usr/bin/env bash
# Claude Code and its statusline. ~/.claude isn't stowed, so it's built here.

CLAUDE_STATUSLINE_REPO="https://github.com/daniel3303/ClaudeCodeStatusLine"
# shellcheck disable=SC2088 # claude code expands the ~ itself
CLAUDE_STATUSLINE_CMD="~/.claude/statusline/statusline.sh"

step_claude() {
  pacman_install "${CLAUDE_DEPS[@]}"

  # native installer: ~/.local/bin/claude -> ~/.local/share/claude/versions/<v>,
  # updated by claude itself afterwards
  if [ -x "$ACTUAL_HOME/.local/bin/claude" ]; then
    echo "claude already installed: $(as_user "$ACTUAL_HOME/.local/bin/claude" --version)"
  else
    as_user_sh "set -o pipefail; curl -fsSL https://claude.ai/install.sh | bash"
  fi

  claude_statusline_repo
  claude_statusline_settings
}

# clone at the pinned tag; an older checkout moves forward to it, a newer one
# (the statusline offers `git pull` when a release is out) is left alone
claude_statusline_repo() {
  local dir="$ACTUAL_HOME/.claude/statusline"
  local tag="$CLAUDE_STATUSLINE_TAG"

  if [ ! -d "$dir/.git" ]; then
    if [ -e "$dir" ]; then
      echo "$dir exists but isn't a git clone; move it aside and re-run" >&2
      return 1
    fi
    as_user mkdir -p "$ACTUAL_HOME/.claude"
    as_user git clone --quiet "$CLAUDE_STATUSLINE_REPO" "$dir"
    as_user git -C "$dir" checkout --quiet -B "$(as_user git -C "$dir" symbolic-ref --short HEAD)" "$tag"
    return 0
  fi

  if ! as_user git -C "$dir" rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
    as_user git -C "$dir" fetch --quiet --tags origin
  fi
  local want_rev
  want_rev=$(as_user git -C "$dir" rev-parse -q --verify "${tag}^{commit}") || {
    echo "statusline tag $tag not found in $CLAUDE_STATUSLINE_REPO" >&2
    return 1
  }
  if [ "$(as_user git -C "$dir" rev-parse HEAD)" = "$want_rev" ]; then
    echo "statusline already at $tag"
  elif as_user git -C "$dir" merge-base --is-ancestor HEAD "$tag"; then
    as_user git -C "$dir" merge --ff-only --quiet "$tag"
  else
    echo "statusline is ahead of $tag, leaving it"
  fi
}

# merge statusLine into settings.json, keeping every other key; a statusLine
# pointing somewhere else is the user's choice and is left alone
claude_statusline_settings() {
  local settings="$ACTUAL_HOME/.claude/settings.json"
  local want current merged
  want=$(jq -nc --arg cmd "$CLAUDE_STATUSLINE_CMD" '{type: "command", command: $cmd}')

  if [ ! -s "$settings" ]; then
    as_user mkdir -p "$ACTUAL_HOME/.claude"
    jq -n --argjson want "$want" '{statusLine: $want}' | as_user tee "$settings" >/dev/null
    echo "created $settings"
    return 0
  fi

  current=$(jq -r '.statusLine.command // empty' "$settings")
  if [ "$current" = "$CLAUDE_STATUSLINE_CMD" ]; then
    echo "statusLine already set in $settings"
    return 0
  fi
  if [ -n "$current" ]; then
    print_warning "statusLine in $settings runs $current, leaving it"
    return 0
  fi

  # rewrite in place so the file keeps its mode, owner and any symlink
  merged=$(jq --argjson want "$want" '.statusLine = $want' "$settings")
  printf '%s\n' "$merged" | as_user tee "$settings" >/dev/null
  echo "added statusLine to $settings"
}
