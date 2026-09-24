#!/usr/bin/env bash
# Behavioral tests for hooks/safety-hook.sh.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK="$SCRIPT_DIR/safety-hook.sh"
TEST_ROOT="$(mktemp -d)"
TEST_FLAG_DIR="$TEST_ROOT/flags"
TMP_REPO="$TEST_ROOT/repo"
TEST_HOME="$TEST_ROOT/home"
trap 'rm -rf "$TEST_ROOT"' EXIT
mkdir -p "$TEST_FLAG_DIR" "$TMP_REPO" "$TEST_HOME"

export CLAUDE_HOOK_FLAG_DIR="$TEST_FLAG_DIR"
export HOME="$TEST_HOME"
export SHELL=/bin/bash

run_hook() {
  local json="$1"
  printf '%s' "$json" | "$HOOK"
}

bash_json() {
  jq -cn --arg command "$1" --arg session_id "${2:-test-session}" '{
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    session_id: $session_id,
    tool_input: {command: $command}
  }'
}

permission_decision() {
  jq -r '.hookSpecificOutput.permissionDecision // .decision // empty'
}

assert_decision() {
  local name="$1" expected="$2" json="$3" actual
  actual="$(run_hook "$json" | permission_decision)"
  if [[ "$actual" != "$expected" ]]; then
    printf 'FAIL %s: expected %s, got %s\n' "$name" "$expected" "${actual:-<empty>}" >&2
    exit 1
  fi
  printf 'ok - %s\n' "$name"
}

assert_bash() {
  assert_decision "$1" "$2" "$(bash_json "$3")"
}

assert_clean_execution() {
  local name="$1" json="$2" marker="$3" stderr="$TEST_ROOT/stderr" output
  : >"$stderr"
  output="$(run_hook "$json" 2>"$stderr")"
  if [[ -s "$stderr" || -e "$marker" ]]; then
    printf 'FAIL %s: hook emitted stderr or executed fixture command\n' "$name" >&2
    exit 1
  fi
  jq -e . >/dev/null <<<"$output"
  printf 'ok - %s\n' "$name"
}

# Command recognition: separators outside quotes, substitutions, and aliases.
assert_bash "blocks rm in chained command" deny "echo ok && rm scratch.txt"
assert_bash "blocks rm in multiline command" deny $'echo ok\nrm scratch.txt'
# shellcheck disable=SC2016 # Literal command substitution is the test fixture.
assert_bash "blocks rm in command substitution" deny 'echo $(rm scratch.txt)'
assert_bash "allows separators inside quotes" approve 'echo "safe; rm scratch.txt"'
assert_bash "allows escaped separators" approve 'echo safe\; rm scratch.txt'
printf "alias del='rm'\n" >"$TEST_HOME/.bashrc"
assert_bash "expands a first-token alias" deny "del scratch.txt"

# Wrappers and nested shells are outside the recognizer's supported forms.
assert_bash "documents command wrapper bypass" approve "command rm scratch.txt"
assert_bash "documents nested shell bypass" approve 'bash -c "rm scratch.txt"'
assert_bash "documents xargs bypass" approve "printf scratch.txt | xargs rm"
assert_bash "documents sudo bypass" approve "sudo git add ."
assert_bash "documents env wrapper bypass" approve "env git add ."

# Environment-file policy.
assert_bash "blocks Bash .env reads" deny "cat .env.local"
assert_bash "blocks .env redirection" deny "printf value > .env"
assert_bash "documents source bypass" approve "source .env"
assert_decision \
  "blocks Read of .env files" deny \
  '{"hook_event_name":"PreToolUse","tool_name":"Read","tool_input":{"file_path":"/tmp/project/.env"}}'

# Git global options are recognized; broad staging and destructive restore are blocked.
assert_bash "blocks git add dot" deny "git add ."
assert_bash "blocks git -C add dot" deny "git -C /tmp add ."
assert_bash "blocks git global option before add" deny "git --no-pager add ."
assert_bash "blocks destructive checkout" deny "git checkout --force main"
assert_bash "blocks path checkout" deny "git checkout HEAD -- tracked.txt"
assert_bash "blocks working-tree restore" deny "git restore tracked.txt"
assert_bash "allows staged-only restore" approve "git restore --staged tracked.txt"
assert_bash "asks before git commit" ask "git commit -m test"
assert_bash "asks before git global option commit" ask "git --no-pager commit -m test"

run_hook '{"hook_event_name":"UserPromptSubmit","session_id":"test-session","prompt":">allow-git commit"}' >/dev/null
assert_decision \
  "allow-git commit suppresses commit prompt" approve \
  "$(bash_json "git commit -m test")"

# Repository-state behavior.
(
  cd "$TMP_REPO"
  git init -q
  git config user.email test@example.com
  git config user.name Test
  printf 'one\n' >tracked.txt
  git add tracked.txt
  git commit -qm initial

  assert_decision \
    "allows ordinary checkout in clean repository" approve \
    "$(bash_json "git checkout --quiet main" git-session)"

  printf 'two\n' >tracked.txt
  assert_decision \
    "asks before staging modified tracked files" ask \
    "$(bash_json "git add tracked.txt" git-session)"
  assert_decision \
    "allows ordinary checkout in dirty repository" approve \
    "$(bash_json "git checkout --quiet main" git-session)"
)
(
  cd "$TEST_ROOT"
  assert_decision \
    "allows ordinary checkout outside a repository" approve \
    "$(bash_json "git checkout main" git-session)"
)

# Edit/Write line-count behavior.
assert_decision \
  "allows a short source write" approve \
  "$(jq -cn '{hook_event_name:"PreToolUse",tool_name:"Write",session_id:"short",tool_input:{file_path:"short.py",content:"one"}}')"
printf 'one\ntwo\n' >"$TEST_ROOT/long.py"
edit_json="$(jq -cn --arg path "$TEST_ROOT/long.py" '{
  hook_event_name: "PreToolUse",
  tool_name: "Edit",
  session_id: "edit-length",
  tool_input: {file_path: $path, old_string: "two", new_string: "two\nthree"}
}')"
MAX_FILE_LINES=2 assert_decision "adds Edit file-length speed bump" deny "$edit_json"
MAX_FILE_LINES=2 assert_decision "allows approved Edit retry" approve "$edit_json"

# Invalid/incomplete input fails open rather than crashing.
assert_decision "allows invalid JSON" approve '{'
assert_decision "allows incomplete hook JSON" approve '{}'

# Regression: policy messages must never evaluate backticks or substitutions.
marker="$TEST_ROOT/commit-executed"
mkdir -p "$TEST_ROOT/bin"
printf '#!/usr/bin/env bash\ntouch %q\n' "$marker" >"$TEST_ROOT/bin/git"
chmod +x "$TEST_ROOT/bin/git"
PATH="$TEST_ROOT/bin:$PATH" assert_clean_execution \
  "commit denial has no command substitution" \
  "$(bash_json "git commit -a")" \
  "$marker"

marker="$TEST_ROOT/path-executed"
write_json="$(jq -cn --arg path "\$(touch $marker).py" '{
  hook_event_name: "PreToolUse",
  tool_name: "Write",
  session_id: "length-session",
  tool_input: {file_path: $path, content: "one\ntwo"}
}')"
MAX_FILE_LINES=1 assert_clean_execution \
  "file-length path has no command substitution" \
  "$write_json" \
  "$marker"

# Host wiring is checked separately from entrypoint behavior.
jq -e '
  [.hooks[][] | .hooks[] | select(.command == "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/safety-hook.sh\"")] | length == 5
' "$SCRIPT_DIR/hooks.json" >/dev/null
[[ -x "$HOOK" ]]
printf 'ok - hook host wiring\n'

printf 'all safety hook tests passed\n'
