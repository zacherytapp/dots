#!/usr/bin/env bash
# shellcheck disable=SC2016,SC2317 # Literal shell syntax in policy messages; exit helpers are invoked indirectly.
# Local safety hooks for Claude Code/Pi.
#
# This script intentionally contains the hook implementation locally instead of
# delegating to upstream source files or Python modules. It handles:
#   - PreToolUse/Bash: rm, git add, git checkout, git commit, .env access
#   - PreToolUse/Read: direct reads of .env files
#   - PreToolUse/Edit|Write: source-file length speed bump
#   - UserPromptSubmit: >allow-git session toggles

set -uo pipefail

MAX_FILE_LINES="${MAX_FILE_LINES:-10000}"
FLAG_DIR="${CLAUDE_HOOK_FLAG_DIR:-/tmp/claude}"
ALLOW_TRIGGER=">allow-git"

SOURCE_EXTENSIONS=" py ts tsx js jsx rs c cpp cc cxx h hpp go java kt swift rb php cs scala m mm r jl "

approve() {
  printf '{"decision":"approve"}\n'
  exit 0
}

permission() {
  local decision="$1"
  local reason="$2"
  jq -cn --arg decision "$decision" --arg reason "$reason" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: $decision,
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

deny() { permission "deny" "$1"; }
ask() { permission "ask" "$1"; }

block_prompt() {
  local reason="$1"
  jq -cn --arg reason "$reason" '{decision:"block", reason:$reason}'
  exit 0
}

normalize_ws() {
  printf '%s' "${1-}" | sed -E 's/[[:space:]]+/ /g; s/^ //; s/ $//'
}

lower() {
  printf '%s' "${1-}" | tr '[:upper:]' '[:lower:]'
}

basename_lower() {
  local p="${1-}"
  p="${p##*/}"
  lower "$p"
}

is_allowed() {
  local flag="$1"
  local session_id="${2-}"
  [[ -n "$session_id" && -f "$FLAG_DIR/allow-git-${flag}.${session_id}" ]]
}

load_aliases() {
  local shell_path="${SHELL:-/bin/bash}"
  local alias_output=""

  if [[ "$shell_path" == *zsh* ]]; then
    alias_output=$("$shell_path" -c 'source ~/.zshrc 2>/dev/null; alias' 2>/dev/null </dev/null || true)
  else
    alias_output=$("$shell_path" -c 'source ~/.bashrc 2>/dev/null; source ~/.bash_aliases 2>/dev/null; alias' 2>/dev/null </dev/null || true)
  fi

  printf '%s\n' "$alias_output"
}

alias_value() {
  local name="$1"
  local line key value

  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    line="${line#alias }"
    [[ "$line" != *=* ]] && continue
    key="${line%%=*}"
    value="${line#*=}"
    [[ "$key" != "$name" ]] && continue

    # Strip one pair of surrounding quotes from bash/zsh alias output.
    if [[ "${value:0:1}" == "'" && "${value: -1}" == "'" ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "${value:0:1}" == '"' && "${value: -1}" == '"' ]]; then
      value="${value:1:${#value}-2}"
    fi
    printf '%s' "$value"
    return 0
  done < <(load_aliases)

  return 1
}

expand_alias_first_token() {
  local command="$1"
  local normalized first rest expansion

  normalized="$(normalize_ws "$command")"
  [[ -z "$normalized" ]] && return 0

  first="${normalized%% *}"
  if [[ "$normalized" == "$first" ]]; then
    rest=""
  else
    rest="${normalized#* }"
  fi

  case "$first" in
    git|rm|cat|less|more|head|tail|grep|rg|find|sed|awk|tee|cp|mv|touch|nano|vi|vim|emacs|code|subl|atom|gedit|/*)
      printf '%s' "$normalized"
      return 0
      ;;
  esac

  if expansion="$(alias_value "$first")"; then
    normalize_ws "$expansion $rest"
  else
    printf '%s' "$normalized"
  fi
}

split_top_level_commands() {
  local command="$1" token="" quote="" ch next
  local i=0 len=${#command}

  # This is intentionally a small command recognizer, not a shell parser. It
  # only treats separators outside quotes as command boundaries.
  while ((i < len)); do
    ch="${command:i:1}"
    next="${command:i:2}"

    if [[ -n "$quote" ]]; then
      token+="$ch"
      if [[ "$ch" == "$quote" ]]; then
        quote=""
      elif [[ "$ch" == "\\" && "$quote" == '"' && $((i + 1)) -lt len ]]; then
        i=$((i + 1))
        token+="${command:i:1}"
      fi
    else
      case "$ch" in
        "'"|'"') quote="$ch"; token+="$ch" ;;
        "\\")
          token+="$ch"
          if ((i + 1 < len)); then
            i=$((i + 1))
            token+="${command:i:1}"
          fi
          ;;
        ';'|'|'|'&'|$'\n')
          normalize_ws "$token"
          printf '\n'
          token=""
          [[ "$next" == '&&' || "$next" == '||' ]] && i=$((i + 1))
          ;;
        *) token+="$ch" ;;
      esac
    fi
    i=$((i + 1))
  done

  [[ -n "$(normalize_ws "$token")" ]] && normalize_ws "$token" && printf '\n'
}

extract_subshell_commands() {
  local command="$1"
  local len=${#command}
  local i=0 j depth inner ch two start

  # Balanced $(...) extraction, including nested command substitutions.
  while (( i < len - 1 )); do
    two="${command:i:2}"
    if [[ "$two" == '$(' ]]; then
      start=$((i + 2))
      j="$start"
      depth=1
      while (( j < len )); do
        ch="${command:j:1}"
        two="${command:j:2}"
        if [[ "$two" == '$(' ]]; then
          depth=$((depth + 1))
          j=$((j + 2))
          continue
        elif [[ "$ch" == ')' ]]; then
          depth=$((depth - 1))
          if (( depth == 0 )); then
            inner="${command:start:j-start}"
            normalize_ws "$inner"
            printf '\n'
            i="$j"
            break
          fi
        fi
        j=$((j + 1))
      done
    fi
    i=$((i + 1))
  done

  # Backtick command substitution.
  printf '%s\n' "$command" |
    grep -oE '`[^`]+`' 2>/dev/null |
    sed -E 's/^`//; s/`$//' || true
}

extract_all_commands() {
  local command="$1"
  local depth="${2:-0}"
  local sub

  (( depth > 5 )) && return 0

  while IFS= read -r sub; do
    [[ -n "$sub" ]] && expand_alias_first_token "$sub" && printf '\n'
  done < <(split_top_level_commands "$command")

  while IFS= read -r sub; do
    [[ -n "$sub" ]] && extract_all_commands "$sub" $((depth + 1))
  done < <(extract_subshell_commands "$command")
}

rm_block_reason() {
  cat <<'EOF'
Instead of using 'rm':
- MOVE files using `mv` to the TRASH directory in the CURRENT folder (create it if needed),
- Add an entry in a markdown file called `TRASH-FILES.md` in the current directory, where you show a one-liner with the file name, where it moved, and the reason to trash it, e.g.:

```text
test_script.py - moved to TRASH/ - temporary test script
data/junk.txt - moved to TRASH/ - data file we don't need
```
EOF
}

is_rm_command() {
  local command
  command="$(normalize_ws "$1")"
  [[ "$command" == "rm" || "$command" == rm\ * || "$command" =~ ^/[^[:space:]]*/rm($|[[:space:]]) ]]
}

check_rm_command() {
  local command="$1" sub
  while IFS= read -r sub; do
    if is_rm_command "$sub"; then
      rm_block_reason
      return 0
    fi
  done < <(extract_all_commands "$command")
  return 1
}

env_block_reason() {
  cat <<'EOF'
Blocked: Direct access to `.env` files is not allowed for security reasons.

- Reading `.env` files could expose sensitive values
- Writing/editing `.env` files should be done manually outside Claude Code

For safe inspection, use the `env-safe` command:
- `env-safe list` - List all environment variable keys
- `env-safe list --status` - Show keys with defined/empty status
- `env-safe check KEY_NAME` - Check if a specific key exists
- `env-safe count` - Count variables in the file
- `env-safe validate` - Check `.env` file syntax
- `env-safe --help` - See all options

To modify `.env` files, please edit them manually outside of Claude Code.
EOF
}

check_env_command() {
  local command norm
  command="$1"
  norm="$(normalize_ws "$command")"

  # Safe commands may mention .env in prose/messages without reading it.
  if grep -Eqi '^(git[[:space:]]+(commit|tag)|gh[[:space:]]+(pr|issue|release)[[:space:]]+create)\b' <<<"$norm"; then
    return 1
  fi

  # Direct or indirect access to .env-like files. Keep the regexes in grep
  # instead of [[ =~ ]] so shell metacharacters like ;, |, <, and > do not
  # become parser tokens.
  if grep -Eqi '(^|[[:space:];|&])(cat|less|more|head|tail|nano|vi|vim|emacs|code|subl|atom|gedit|grep|rg|ag|ack|tee|cp|mv|touch)[[:space:]][^;|&]*\.env([.A-Za-z0-9_-]*)($|[[:space:];|&])' <<<"$norm"; then
    env_block_reason
    return 0
  fi
  if grep -Eqi '(^|[[:space:];|&])find[[:space:]][^;|&]*-name[[:space:]]+["'"'"']?\.env([.A-Za-z0-9_-]*)?' <<<"$norm"; then
    env_block_reason
    return 0
  fi
  if grep -Eqi '(^|[[:space:];|&])sed[[:space:]][^;|&]*-i[^;|&]*\.env([.A-Za-z0-9_-]*)($|[[:space:];|&])' <<<"$norm"; then
    env_block_reason
    return 0
  fi
  if grep -Eqi '(^|[[:space:];|&])(echo|printf|awk)[[:space:]][^;|&]*(>|>>)[[:space:]]*\.env([.A-Za-z0-9_-]*)($|[[:space:];|&])' <<<"$norm"; then
    env_block_reason
    return 0
  fi
  if grep -Eqi '(>|>>)[[:space:]]*\.env([.A-Za-z0-9_-]*)($|[[:space:];|&])' <<<"$norm"; then
    env_block_reason
    return 0
  fi

  # Bare env file reads/writes, but only for obvious file-access commands.
  if grep -Eqi '(^|[[:space:];|&])(cat|less|more|head|tail)[[:space:]]+["'"'"']?env["'"'"']?($|[[:space:];|&])|(>|>>)[[:space:]]*["'"'"']?env["'"'"']?($|[[:space:];|&])' <<<"$norm"; then
    env_block_reason
    return 0
  fi

  return 1
}

read_env_reason() {
  cat <<'EOF'
Blocked: Direct access to `.env` files is not allowed for security reasons.

Reading `.env` files could expose sensitive API keys, passwords, and secrets.

For safe inspection, use the `env-safe` command in Bash:
- `env-safe list` - List all environment variable keys
- `env-safe list --status` - Show keys with defined/empty status
- `env-safe check KEY_NAME` - Check if a specific key exists

To view `.env` contents, please do so manually outside of Claude Code.
EOF
}

check_read_env_path() {
  local file_path="$1" base
  base="$(basename_lower "$file_path")"
  [[ "$base" == ".env" || "$base" == .env.* ]]
}

git_add_wildcard_reason() {
  cat <<'EOF'
BLOCKED: Wildcard patterns are not allowed in git add!

DO NOT use wildcards like `git add *.py` or `git add *`

Instead, use:
- `git add <specific-files>` to stage specific files
- `git ls-files -m "*.py" | xargs git add` if you really need pattern matching

This restriction prevents accidentally staging unwanted files.
EOF
}

git_add_danger_reason() {
  cat <<'EOF'
BLOCKED: Dangerous git add pattern detected!

DO NOT use:
- `git add -A`, `git add -a`, `git add --all` (adds ALL files)
- `git add .` (adds entire current directory)
- `git add ../` or similar parent directory patterns
- `git add *` (wildcard patterns)

Instead, use:
- `git add <specific-files>` to stage specific files
- `git add <specific-directory>/` to stage a specific directory with confirmation
- `git add -u` to stage all modified/deleted files, but not untracked

This restriction prevents accidentally staging unwanted files.
EOF
}

commit_a_reason() {
  cat <<'EOF'
Avoid `git commit -a` without a message flag. Use `gcam "message"` instead, which is an alias for `git commit -a -m`.
EOF
}

canonicalize_git_command() {
  local raw="$1" parts=() canonical_parts=(git) part
  local i=1
  read -r -a parts <<<"$(normalize_ws "$raw")"
  [[ "${parts[0]-}" == git ]] || { normalize_ws "$raw"; return 0; }

  # Recognize common Git global options so policy checks still see the
  # subcommand. Wrappers such as sudo/env/bash are intentionally unsupported.
  while ((i < ${#parts[@]})); do
    part="${parts[i]}"
    case "$part" in
      -C|-c|--git-dir|--work-tree|--namespace)
        i=$((i + 2))
        ;;
      --git-dir=*|--work-tree=*|--namespace=*|--no-pager|--paginate|--literal-pathspecs|--no-optional-locks)
        i=$((i + 1))
        ;;
      *) break ;;
    esac
  done
  canonical_parts+=("${parts[@]:i}")
  printf '%s' "${canonical_parts[*]}"
}

first_git_add_directory_arg() {
  local norm="$1" part prev=""
  read -r -a parts <<<"$norm"
  for part in "${parts[@]}"; do
    if [[ "$prev" == "add" && "$part" != -* && "$part" == */ ]]; then
      printf '%s' "${part%/}"
      return 0
    fi
    prev="$part"
  done
  return 1
}

git_status_code_for() {
  git status --porcelain -- "$1" 2>/dev/null | head -n 1 | cut -c1-2
}

modified_files_for_args() {
  local norm="$1" part after_add=false status modified=()
  read -r -a parts <<<"$norm"
  for part in "${parts[@]}"; do
    if [[ "$after_add" == false ]]; then
      [[ "$part" == "add" ]] && after_add=true
      continue
    fi
    [[ "$part" == -* ]] && continue
    status="$(git_status_code_for "$part")"
    [[ -z "$status" ]] && continue
    [[ "$status" == *\?* ]] && continue
    modified+=("$part")
  done
  ((${#modified[@]})) || return 1
  printf '%s\n' "${modified[@]}"
}

join_first_files() {
  local limit="${1:-5}" count=0 total=0 out="" file
  shift || true
  total="$#"
  for file in "$@"; do
    ((count++))
    ((count > limit)) && break
    if [[ -z "$out" ]]; then out="$file"; else out+=", $file"; fi
  done
  if (( total > limit )); then
    out+=" (+$((total - limit)) more)"
  fi
  printf '%s' "$out"
}

check_git_add_single() {
  local raw="$1" session_id="$2" norm dir dry files=() modified=() new=() line file status reason
  norm="$(canonicalize_git_command "$raw")"

  [[ "$norm" == git\ add\ * ]] || [[ "$norm" == git\ commit\ * ]] || return 1

  # Always allow dry-run probes.
  if [[ "$norm" == *--dry-run* || "$norm" =~ (^|[[:space:]])-n($|[[:space:]]) ]]; then
    return 1
  fi

  if [[ "$norm" == git\ add\ * && "$norm" == *\** ]]; then
    git_add_wildcard_reason
    return 0
  fi

  if [[ "$norm" == git\ add\ * && ( "$norm" =~ (^|[[:space:]])-[A-Za-z]*[Aa][A-Za-z]*($|[[:space:]]) || "$norm" =~ (^|[[:space:]])--all($|[[:space:]]) || "$norm" =~ (^|[[:space:]])\.($|[[:space:]]) || "$norm" =~ (^|[[:space:]])\.\./[^[:space:]]*($|[[:space:]]) ) ]]; then
    git_add_danger_reason
    return 0
  fi

  if [[ "$norm" == git\ commit\ * ]]; then
    if [[ "$norm" =~ (^|[[:space:]])-[A-Za-z]*a[A-Za-z]*($|[[:space:]]) && ! "$norm" =~ (^|[[:space:]])-[A-Za-z]*m[A-Za-z]*($|[[:space:]]) ]]; then
      commit_a_reason
      return 0
    fi
    return 1
  fi

  if dir="$(first_git_add_directory_arg "$norm")"; then
    if ! dry="$(git add --dry-run -- "$dir/" 2>/dev/null)"; then
      printf 'ASK:%s\n' "Staging directory $dir/ (couldn't verify file status)"
      return 0
    fi
    while IFS= read -r line; do
      [[ "$line" == add\ * ]] || continue
      file="${line#add }"
      file="${file#\'}"; file="${file%\'}"
      [[ -n "$file" ]] && files+=("$file")
    done <<<"$dry"

    ((${#files[@]})) || return 1

    for file in "${files[@]}"; do
      status="$(git_status_code_for "$file")"
      if [[ "$status" == *\?* ]]; then
        new+=("$file")
      else
        modified+=("$file")
      fi
    done

    ((${#modified[@]})) || return 1
    if is_allowed staging "$session_id"; then return 1; fi
    reason="Staging directory $dir/ with modified files: $(join_first_files 5 "${modified[@]}")"
    printf 'ASK:%s\n' "$reason"
    return 0
  fi

  mapfile -t modified < <(modified_files_for_args "$norm" || true)
  if ((${#modified[@]})); then
    if is_allowed staging "$session_id"; then return 1; fi
    reason="Staging modified files: $(join_first_files 5 "${modified[@]}")"
    printf 'ASK:%s\n' "$reason"
    return 0
  fi

  return 1
}

destructive_checkout_reason() {
  local detail="$1"
  printf 'DANGEROUS COMMAND DETECTED!\n\n%s\n\nThis command can destroy uncommitted work. Inspect `git diff` or save work with `git stash` first.\n' "$detail"
}

check_git_checkout_single() {
  local raw="$1" norm
  norm="$(canonicalize_git_command "$raw")"
  [[ "$norm" == git\ checkout* ]] || return 1

  if [[ "$norm" =~ (^|[[:space:]])(-f|--force)($|[[:space:]]) ]]; then
    destructive_checkout_reason '`git checkout --force` discards uncommitted changes.'
    return 0
  fi
  if [[ "$norm" =~ ^git[[:space:]]+checkout[[:space:]]+\.($|[[:space:]]) ]]; then
    destructive_checkout_reason '`git checkout .` discards changes in the current directory.'
    return 0
  fi
  if [[ "$norm" =~ ^git[[:space:]]+checkout[[:space:]].*[[:space:]]--[[:space:]]+ ]]; then
    destructive_checkout_reason '`git checkout <tree-ish> -- <paths>` overwrites local paths.'
    return 0
  fi

  # Ordinary branch switching is left to Git's own overwrite checks. A dirty
  # tree or a non-Git directory is not, by itself, a reason to deny checkout.
  return 1
}

check_git_restore_single() {
  local raw="$1" norm
  norm="$(canonicalize_git_command "$raw")"
  [[ "$norm" == git\ restore* ]] || return 1
  [[ "$norm" =~ (^|[[:space:]])--help($|[[:space:]]) ]] && return 1
  if [[ "$norm" =~ (^|[[:space:]])--staged($|[[:space:]]) && ! "$norm" =~ (^|[[:space:]])--worktree($|[[:space:]]) ]]; then
    return 1
  fi
  destructive_checkout_reason '`git restore` discards working-tree changes.'
  return 0
}

check_git_commit_single() {
  local raw="$1" session_id="$2" norm
  norm="$(canonicalize_git_command "$raw")"
  [[ "$norm" == git\ commit* ]] || return 1
  if is_allowed commit "$session_id"; then
    return 1
  fi
  printf 'ASK:%s\n' "Git commit requires your approval."
  return 0
}

is_source_file() {
  local file_path="$1" base ext
  base="${file_path##*/}"
  ext="${base##*.}"
  [[ "$base" == "$ext" ]] && return 1
  ext="$(lower "$ext")"
  [[ "$SOURCE_EXTENSIONS" == *" $ext "* ]]
}

line_count_string() {
  local content="${1-}"
  [[ -z "$content" ]] && { printf '0'; return 0; }
  printf '%s' "$content" | awk 'END {print NR}'
}

resulting_line_count() {
  local tool_name="$1" file_path="$2" input_json="$3" content old new replace_all current current_lines old_lines new_lines occurrences resulting

  if [[ "$tool_name" == "Write" ]]; then
    content="$(jq -r '.tool_input.content // ""' <<<"$input_json")"
    line_count_string "$content"
    return 0
  fi

  [[ "$tool_name" == "Edit" ]] || { printf '0'; return 0; }
  [[ -f "$file_path" ]] || { printf '0'; return 0; }

  old="$(jq -r '.tool_input.old_string // ""' <<<"$input_json")"
  new="$(jq -r '.tool_input.new_string // ""' <<<"$input_json")"
  replace_all="$(jq -r '.tool_input.replace_all // false' <<<"$input_json")"

  current="$(<"$file_path")"
  current_lines="$(line_count_string "$current")"
  old_lines="$(line_count_string "$old")"
  new_lines="$(line_count_string "$new")"

  if [[ -z "$old" ]]; then
    printf '%s' "$current_lines"
    return 0
  fi

  if [[ "$replace_all" == "true" ]]; then
    # Approximate literal occurrence count. Good enough for the speed bump.
    occurrences=$(grep -Fo -- "$old" "$file_path" 2>/dev/null | wc -l | tr -d ' ')
    (( occurrences < 1 )) && occurrences=1
  else
    occurrences=1
  fi

  resulting=$(( current_lines + occurrences * (new_lines - old_lines) ))
  (( resulting < 0 )) && resulting=0
  printf '%s' "$resulting"
}

check_file_length() {
  local input_json="$1" tool_name="$2" session_id="$3" file_path="$4" resulting flag reason

  [[ "$tool_name" == "Edit" || "$tool_name" == "Write" ]] || return 1
  is_source_file "$file_path" || return 1

  resulting="$(resulting_line_count "$tool_name" "$file_path" "$input_json")"
  [[ "$resulting" =~ ^[0-9]+$ ]] || return 1
  (( resulting <= MAX_FILE_LINES )) && return 1

  mkdir -p "$FLAG_DIR" 2>/dev/null || true
  flag="$FLAG_DIR/file-length-warning.${session_id:-global}"
  if [[ -f "$flag" ]]; then
    rm -f "$flag" 2>/dev/null || true
    return 1
  fi
  : >"$flag" 2>/dev/null || true

  printf -v reason '**File length limit exceeded (%s lines > %s lines).**\n\nThe resulting file `%s` would be %s lines long.\n\nTo maintain code quality and modularity, files should be kept under %s lines.\n\n**Please pause and ask the user:**\n"This operation would create a file with %s lines. Would you like me to:\n1. Refactor the code into smaller, more modular files?\n2. Proceed with the large file anyway?"\n\n**Only retry this operation if the user approves proceeding with the large file.**\nOtherwise, work on refactoring the code into smaller modules.' "$resulting" "$MAX_FILE_LINES" "$file_path" "$resulting" "$MAX_FILE_LINES" "$resulting"
  printf '%s' "$reason"
  return 0
}

handle_user_prompt() {
  local input_json="$1" session_id prompt arg message label active=() name
  session_id="$(jq -r '.session_id // ""' <<<"$input_json")"
  prompt="$(jq -r '.prompt // .user_prompt // ""' <<<"$input_json")"
  prompt="$(normalize_ws "$(lower "$prompt")")"

  [[ -n "$prompt" ]] || exit 0
  [[ "$prompt" == "$ALLOW_TRIGGER" || "$prompt" == "$ALLOW_TRIGGER "* ]] || exit 0

  [[ -n "$session_id" ]] || block_prompt "No session ID available."
  mkdir -p "$FLAG_DIR" 2>/dev/null || true
  arg="${prompt#"$ALLOW_TRIGGER"}"
  arg="$(normalize_ws "$arg")"

  case "$arg" in
    off)
      rm -f "$FLAG_DIR/allow-git-staging.${session_id}" "$FLAG_DIR/allow-git-commit.${session_id}" 2>/dev/null || true
      message="Git approval prompts restored."
      ;;
    staging|commit)
      : >"$FLAG_DIR/allow-git-${arg}.${session_id}"
      message="Git $arg allowed for this session.
Use >allow-git off to restore approval prompts."
      ;;
    status)
      for name in staging commit; do
        [[ -f "$FLAG_DIR/allow-git-${name}.${session_id}" ]] && active+=("$name")
      done
      if ((${#active[@]})); then
        label="$(IFS=', '; printf '%s' "${active[*]}")"
        message="Active: $label
Use >allow-git off to restore prompts."
      else
        message="All git operations require approval."
      fi
      ;;
    *)
      : >"$FLAG_DIR/allow-git-staging.${session_id}"
      : >"$FLAG_DIR/allow-git-commit.${session_id}"
      message="Git staging and commit allowed for this session.
Use >allow-git off to restore approval prompts."
      ;;
  esac

  block_prompt "$message"
}

main() {
  local input_json hook_event tool_name session_id command file_path reason sub result block_reasons=() ask_reasons=()

  input_json="$(cat)"
  if ! jq -e . >/dev/null 2>&1 <<<"$input_json"; then
    approve
  fi

  hook_event="$(jq -r '.hook_event_name // ""' <<<"$input_json")"
  tool_name="$(jq -r '.tool_name // ""' <<<"$input_json")"
  session_id="$(jq -r '.session_id // ""' <<<"$input_json")"

  if [[ "$hook_event" == "UserPromptSubmit" || ( -z "$tool_name" && "$input_json" == *"$ALLOW_TRIGGER"* ) ]]; then
    handle_user_prompt "$input_json"
    exit 0
  fi

  case "$tool_name" in
    Bash)
      command="$(jq -r '.tool_input.command // ""' <<<"$input_json")"
      [[ -n "$command" ]] || approve

      if reason="$(check_rm_command "$command")"; then
        block_reasons+=("$reason")
      fi
      if reason="$(check_env_command "$command")"; then
        block_reasons+=("$reason")
      fi

      while IFS= read -r sub; do
        [[ -z "$sub" ]] && continue
        if result="$(check_git_add_single "$sub" "$session_id")"; then
          if [[ "$result" == ASK:* ]]; then ask_reasons+=("${result#ASK:}"); else block_reasons+=("$result"); fi
        fi
        if result="$(check_git_checkout_single "$sub")"; then
          block_reasons+=("$result")
        fi
        if result="$(check_git_restore_single "$sub")"; then
          block_reasons+=("$result")
        fi
        if result="$(check_git_commit_single "$sub" "$session_id")"; then
          if [[ "$result" == ASK:* ]]; then ask_reasons+=("${result#ASK:}"); else block_reasons+=("$result"); fi
        fi
      done < <(extract_all_commands "$command")
      ;;
    Read)
      file_path="$(jq -r '.tool_input.file_path // ""' <<<"$input_json")"
      if check_read_env_path "$file_path"; then
        block_reasons+=("$(read_env_reason)")
      fi
      ;;
    Edit|Write)
      file_path="$(jq -r '.tool_input.file_path // ""' <<<"$input_json")"
      if reason="$(check_file_length "$input_json" "$tool_name" "$session_id" "$file_path")"; then
        block_reasons+=("$reason")
      fi
      ;;
    *)
      approve
      ;;
  esac

  if ((${#block_reasons[@]})); then
    if ((${#block_reasons[@]} == 1)); then
      deny "${block_reasons[0]}"
    else
      reason="Multiple safety checks failed:\n\n"
      local idx=1
      for sub in "${block_reasons[@]}"; do
        reason+="$idx. $sub\n\n"
        idx=$((idx + 1))
      done
      deny "$(printf '%b' "$reason")"
    fi
  fi

  if ((${#ask_reasons[@]})); then
    if ((${#ask_reasons[@]} == 1)); then
      ask "${ask_reasons[0]}"
    else
      reason="Approval required: $(IFS='; '; printf '%s' "${ask_reasons[*]}")"
      ask "$reason"
    fi
  fi

  approve
}

main "$@"
