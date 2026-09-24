#!/usr/bin/env bash
# CachyOS setup: installs everything the dotfiles need on a fresh install.
#
#   sudo ./run.sh                 # all default steps
#   sudo ./run.sh node pmd        # only these steps
#   sudo ./run.sh gaming kvm stow # opt-in steps
#   sudo ./run.sh greeter         # noctalia-greeter on greetd as the login screen
#
# Settings come from the environment, or a prompt when run interactively:
#   USER_NAME, USER_EMAIL, SETUP_HOSTNAME (default behemoth), LOCAL_IP,
#   NONINTERACTIVE=1 to never prompt.

set -uo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)

# shellcheck source=utils.sh
source "$SCRIPT_DIR/utils.sh"
# shellcheck source=packages.conf
source "$SCRIPT_DIR/packages.conf"
# shellcheck source=scripts/system.sh
source "$SCRIPT_DIR/scripts/system.sh"
# shellcheck source=scripts/dev.sh
source "$SCRIPT_DIR/scripts/dev.sh"
# shellcheck source=scripts/security.sh
source "$SCRIPT_DIR/scripts/security.sh"
# shellcheck source=scripts/extras.sh
source "$SCRIPT_DIR/scripts/extras.sh"
# shellcheck source=../desktop/desktop.sh
source "$SCRIPT_DIR/../desktop/desktop.sh"

DEFAULT_STEPS=(
  preflight
  packages
  aur
  desktop
  shell
  git
  rust
  node
  pmd
  tmux
  herdr
  docker
  services
  hooks
  firewall
  fail2ban
  network
  discovery
  keys
  hostname
  flatpak
)
OPTIONAL_STEPS=(greeter gaming kvm stow)

usage() {
  echo "usage: sudo $0 [step ...]"
  echo "default steps: ${DEFAULT_STEPS[*]}"
  echo "opt-in steps:  ${OPTIONAL_STEPS[*]}"
}

main() {
  if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
    usage
    exit 0
  fi

  local steps=("$@")
  [ ${#steps[@]} -eq 0 ] && steps=("${DEFAULT_STEPS[@]}")

  local step
  for step in "${steps[@]}"; do
    if ! declare -F "step_${step}" >/dev/null; then
      print_error "unknown step: $step"
      usage
      exit 1
    fi
  done

  check_root "$@"

  ACTUAL_USER="$SUDO_USER"
  ACTUAL_HOME=$(getent passwd "$ACTUAL_USER" | cut -d: -f6)
  NVM_DIR="$ACTUAL_HOME/.config/nvm"
  PNPM_HOME="$ACTUAL_HOME/.local/share/pnpm"
  export ACTUAL_USER ACTUAL_HOME NVM_DIR PNPM_HOME

  # `sudo -E` keeps the user's HOME, so root-run tools (pacman hooks, fc-cache)
  # would leave root-owned files in ~/.cache and break paru
  export HOME=/root
  unset XDG_CONFIG_HOME XDG_CACHE_HOME XDG_DATA_HOME XDG_STATE_HOME

  prompt_var USER_NAME "full name for git and keys?"
  prompt_var USER_EMAIL "email for git and keys?"
  prompt_var SETUP_HOSTNAME "hostname? [behemoth]" "behemoth"
  prompt_var LOCAL_IP "local network to allow through ufw (e.g. 192.168.1.0/24, blank to skip)?"

  touch "$LOG_FILE"
  log_message "setup started for $ACTUAL_USER: ${steps[*]}"
  is_container && print_warning "running in a container: services, firewall and hostname are skipped"

  for step in "${steps[@]}"; do
    run_step "$step" "step_${step}"
  done

  print_summary
}

main "$@"
