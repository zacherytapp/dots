#!/usr/bin/env bash
# shellcheck disable=SC2034,SC2016 # variables here are used by the scripts that source this file

ACTUAL_USER="${SUDO_USER:-$(id -un)}"
ACTUAL_HOME=$(getent passwd "$ACTUAL_USER" | cut -d: -f6)
TEMP_DIR="${ACTUAL_HOME}/temp"
LOG_FILE="${LOG_FILE:-/var/log/dots-fedora-setup.log}"

# PATH/env for user-level tools, used by as_user_sh
USER_ENV='
export PNPM_HOME="$HOME/.local/share/pnpm"
export NVM_DIR="$HOME/.nvm"
export PATH="$HOME/.local/bin:$HOME/.pyenv/bin:$HOME/.cargo/bin:$HOME/go/bin:$PNPM_HOME:$PNPM_HOME/bin:/home/linuxbrew/.linuxbrew/bin:$PATH"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
'

FAILED_STEPS=()
PASSED_STEPS=()

color_echo() {
  local color="$1"
  local text="$2"
  case "$color" in
  "red") echo -e "\033[0;31m$text\033[0m" ;;
  "green") echo -e "\033[0;32m$text\033[0m" ;;
  "yellow") echo -e "\033[1;33m$text\033[0m" ;;
  "blue") echo -e "\033[0;34m$text\033[0m" ;;
  *) echo "$text" ;;
  esac
}

get_timestamp() {
  date +"%Y-%m-%d %H:%M:%S"
}

log_message() {
  echo "$(get_timestamp) - $1" >>"$LOG_FILE"
}

# prompt_var VAR "question" [default]
# only prompts when VAR is unset, stdin is a tty and NONINTERACTIVE isn't set
prompt_var() {
  local var="$1" question="$2" default="${3:-}"
  if [ -n "${!var:-}" ]; then
    return 0
  fi
  if [ -z "${NONINTERACTIVE:-}" ] && [ -t 0 ]; then
    read -r -p "${question}${default:+ [$default]}: " "${var?}"
  fi
  if [ -z "${!var:-}" ]; then
    printf -v "$var" '%s' "$default"
  fi
  export "${var?}"
}

is_container() {
  if command -v systemd-detect-virt &>/dev/null && systemd-detect-virt --container --quiet; then
    return 0
  fi
  [ -f /.dockerenv ] || [ -f /run/.containerenv ]
}

# skip_if_container "description" || real_command
skip_if_container() {
  if is_container; then
    color_echo "yellow" "skipped: container - $1"
    log_message "skipped: container - $1"
    return 0
  fi
  return 1
}

enable_service() {
  skip_if_container "systemctl enable --now $*" || systemctl enable --now "$@"
}

# run a command as the real user with their HOME
as_user() {
  sudo -u "$ACTUAL_USER" -H -- "$@"
}

# run a shell snippet as the real user with user-level tools on PATH
as_user_sh() {
  as_user bash -c "${USER_ENV}"$'\nset -e\n'"$1"
}

is_pkg_installed() {
  rpm -q --whatprovides "$1" &>/dev/null
}

# installs anything not already installed; returns non-zero if any package failed
install_packages() {
  local to_install=()

  for pkg in "$@"; do
    if ! is_pkg_installed "$pkg"; then
      to_install+=("$pkg")
    fi
  done

  if [ ${#to_install[@]} -eq 0 ]; then
    echo "All specified packages are already installed."
    return 0
  fi

  echo "Installing: ${to_install[*]}"
  if dnf install -y "${to_install[@]}"; then
    return 0
  fi

  # install whatever is available so one stale name doesn't block the rest
  color_echo "red" "Error installing: ${to_install[*]} - retrying with --skip-unavailable"
  dnf install -y --skip-unavailable "${to_install[@]}"
  return 1
}

backup_file() {
  local file="$1"
  if [ -f "$file" ] && [ ! -f "$file.bak" ]; then
    cp "$file" "$file.bak"
    color_echo "green" "Backed up $file"
  fi
}

# run_step <name> <function>: runs the function in a `set -e` subshell,
# records the result and keeps going on failure
run_step() {
  local name="$1" fn="$2"
  color_echo "blue" "==> [$name]"
  log_message "start: $name"
  (
    set -e
    "$fn"
  )
  local rc=$?
  if [ $rc -eq 0 ]; then
    PASSED_STEPS+=("$name")
    color_echo "green" "<== [$name] ok"
    log_message "ok: $name"
  else
    FAILED_STEPS+=("$name")
    color_echo "red" "<== [$name] FAILED (exit $rc)"
    log_message "failed: $name (exit $rc)"
  fi
}

print_summary() {
  echo
  color_echo "blue" "==== summary ===="
  local s
  for s in "${PASSED_STEPS[@]}"; do color_echo "green" "  ok      $s"; done
  for s in "${FAILED_STEPS[@]}"; do color_echo "red" "  FAILED  $s"; done
  echo "log: $LOG_FILE"
  [ ${#FAILED_STEPS[@]} -eq 0 ]
}

prompt_reboot() {
  if [ -n "${NONINTERACTIVE:-}" ] || [ ! -t 0 ] || is_container; then
    return 0
  fi
  local choice
  read -r -p "It is time to reboot the machine. Would you like to do it now? (y/n): " choice
  if [[ $choice == [yY] ]]; then
    color_echo "green" "Rebooting..."
    reboot
  else
    color_echo "red" "Reboot canceled."
  fi
}
