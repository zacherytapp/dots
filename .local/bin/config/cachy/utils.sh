#!/usr/bin/env bash
# Shared helpers for the CachyOS setup. Sourced by run.sh.

LOG_FILE="/var/log/dots-setup.log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

FAILED_STEPS=()
PASSED_STEPS=()

color_echo() {
  local color="$1"
  local text="$2"
  case "$color" in
  "red") echo -e "${RED}${text}${NC}" ;;
  "green") echo -e "${GREEN}${text}${NC}" ;;
  "yellow") echo -e "${YELLOW}${text}${NC}" ;;
  "blue") echo -e "${BLUE}${text}${NC}" ;;
  *) echo "$text" ;;
  esac
}

print_info() { color_echo "blue" "$1"; }
print_success() { color_echo "green" "$1"; }
print_warning() { color_echo "yellow" "$1"; }
print_error() { color_echo "red" "$1"; }

log_message() {
  echo "$(date +"%Y-%m-%d %H:%M:%S") - $1" >>"$LOG_FILE"
}

# docker/podman/systemd-nspawn: no init system, no kernel modules
is_container() {
  if command -v systemd-detect-virt &>/dev/null && systemd-detect-virt --container --quiet; then
    return 0
  fi
  [ -f /.dockerenv ] || [ -f /run/.containerenv ]
}

# prints the skip notice and returns 0 when in a container, so callers can do
#   skip_in_container "what" && return 0
skip_in_container() {
  if is_container; then
    print_warning "skipped: container ($1)"
    log_message "skipped: container ($1)"
    return 0
  fi
  return 1
}

check_root() {
  if [ "$EUID" -ne 0 ]; then
    print_error "please run with sudo: sudo $0 $*"
    exit 1
  fi
  if [ -z "${SUDO_USER:-}" ] || [ "$SUDO_USER" = "root" ]; then
    print_error "run via sudo from your normal user account, not as root directly"
    exit 1
  fi
}

# run a command as the invoking (non-root) user with their HOME
as_user() {
  sudo -u "$ACTUAL_USER" -H "$@"
}

# run a bash snippet as the invoking user with their tool dirs on PATH
as_user_sh() {
  sudo -u "$ACTUAL_USER" -H \
    NVM_DIR="$NVM_DIR" PNPM_HOME="$PNPM_HOME" \
    PATH="$ACTUAL_HOME/.local/bin:$PNPM_HOME/bin:$ACTUAL_HOME/.cargo/bin:$ACTUAL_HOME/go/bin:/opt/pmd/bin:/usr/local/bin:/usr/bin:/bin" \
    bash -c "$1"
}

# ask for a value when unset and a person is at the keyboard, else use the default
prompt_var() {
  local var="$1"
  local question="$2"
  local default="${3:-}"
  if [ -z "${!var:-}" ] && [ "${NONINTERACTIVE:-0}" != "1" ] && [ -t 0 ]; then
    read -rp "$question " "${var?}"
  fi
  if [ -z "${!var:-}" ]; then
    printf -v "$var" '%s' "$default"
  fi
  export "${var?}"
}

pacman_install() {
  pacman -S --needed --noconfirm "$@"
}

# paru refuses to run as root; it escalates with sudo itself
aur_install() {
  as_user paru -S --needed --noconfirm --skipreview "$@"
}

enable_service() {
  skip_in_container "systemctl enable --now $*" && return 0
  systemctl enable --now "$@"
}

# resolves a GitHub "latest release" tag without the rate-limited API
latest_github_tag() {
  curl -fsSLI -o /dev/null -w '%{url_effective}' "https://github.com/$1/releases/latest" | sed 's#.*/tag/##'
}

# run_step <name> <function>: runs the function in a subshell with errexit so
# the first failing command ends the step; failures are recorded, not fatal
run_step() {
  local name="$1"
  local func="$2"
  local rc

  echo
  color_echo "blue" "${BOLD}==> ${name}"
  log_message "start: $name"

  (
    set -eo pipefail
    "$func"
  )
  rc=$?

  if [ "$rc" -eq 0 ]; then
    PASSED_STEPS+=("$name")
    print_success "ok: $name"
    log_message "ok: $name"
  else
    FAILED_STEPS+=("$name")
    print_error "failed: $name (exit $rc)"
    log_message "failed: $name (exit $rc)"
  fi
}

print_summary() {
  echo
  color_echo "blue" "${BOLD}==> summary"
  [ ${#PASSED_STEPS[@]} -gt 0 ] && print_success "passed: ${PASSED_STEPS[*]}"
  if [ ${#FAILED_STEPS[@]} -gt 0 ]; then
    print_error "failed: ${FAILED_STEPS[*]}"
    print_error "log: $LOG_FILE"
    return 1
  fi
  print_success "all steps passed. you may want to reboot."
}
