#!/usr/bin/env bash
# Ubuntu 26.04 LTS setup.
#
#   sudo ./run.sh             run the default steps in order
#   sudo ./run.sh go node     run only the named steps
#   sudo ./run.sh --list      list steps
#   sudo ./run.sh desktop     Hyprland + Noctalia session (opt-in, checked first)
#
# Configure with USER_NAME, USER_EMAIL, SETUP_HOSTNAME and LOCAL_IP (prompted for
# when unset and interactive; NONINTERACTIVE=1 never prompts).

# shellcheck disable=SC2329 # step functions are called indirectly through STEPS
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)

# Source utility functions and the package list
source "${SCRIPT_DIR}/utils.sh"

if [ ! -f "${SCRIPT_DIR}/packages.conf" ]; then
  echo "Error: packages.conf not found!"
  exit 1
fi
source "${SCRIPT_DIR}/packages.conf"

source "${SCRIPT_DIR}/init/config.sh"
source "${SCRIPT_DIR}/init/keys.sh"
source "${SCRIPT_DIR}/init/secure.sh"
source "${SCRIPT_DIR}/apps/install_browsers.sh"
source "${SCRIPT_DIR}/apps/install_dev.sh"
source "${SCRIPT_DIR}/apps/install_languages.sh"
source "${SCRIPT_DIR}/apps/install_flatpaks.sh"
source "${SCRIPT_DIR}/setup/gnome.sh"
source "${SCRIPT_DIR}/setup/theme.sh"
source "${SCRIPT_DIR}/setup/post_install_extras.sh"
source "${SCRIPT_DIR}/../desktop/desktop.sh"

# Hyprland + Noctalia next to gnome: checks ubuntu >= 26.04 on amd64 and that
# the archive offers hyprland >= 0.55 (the dots config is lua; 26.04 ships
# 0.53, so this refuses there unless a newer hyprland is already installed,
# e.g. built from source), then adds pkg.noctalia.dev and installs
install_desktop() {
  desktop_install
}

# noctalia-greeter on greetd, replacing gdm
install_greeter() {
  desktop_greeter
}

install_base_packages() {
  color_echo "green" "Installing system utilities..."
  install_packages "${SYSTEM_UTILS[@]}"
  color_echo "green" "Installing development tools..."
  install_packages "${DEV_TOOLS[@]}"
  color_echo "green" "Installing language tools..."
  install_packages "${LANG_TOOLS[@]}"
  color_echo "green" "Installing neovim pre-requisites..."
  install_packages "${NEOVIM_PRE[@]}"
}

install_apps() {
  color_echo "green" "Installing apps..."
  install_packages "${APPS[@]}"
  # steam's license prompt
  echo "steam steam/question select I AGREE" | debconf-set-selections
  echo "steam steam/license note ''" | debconf-set-selections
  install_packages steam-installer
}

# step name -> function, in run order
STEPS=(
  apt:configure_apt
  packages:install_base_packages
  apps:install_apps
  system:configure_system
  flathub:configure_flathub
  multimedia:install_multimedia
  git:configure_git
  keys:configure_keys
  security:configure_security
  browsers:install_browsers
  neovim:install_neovim
  1password:install_1password
  shell:install_shell
  python:install_python_tools
  java:install_java
  rust:install_rust
  node:install_node
  go:install_go
  lua:install_lua
  ruby:install_ruby_tools
  julia:install_julia
  brew:install_brew
  flatpaks:install_flatpaks
)

# only run when named explicitly
OPTIONAL_STEPS=(
  gnome:configure_gnome
  theme:configure_theme
  extras:post_install_extras
  desktop:install_desktop
  greeter:install_greeter
)

if [ "${1:-}" = "--list" ] || [ "${1:-}" = "-l" ]; then
  echo "default steps:"
  printf '  %s\n' "${STEPS[@]%%:*}"
  echo "optional steps (run by name):"
  printf '  %s\n' "${OPTIONAL_STEPS[@]%%:*}"
  exit 0
fi

# Check if the script is run with sudo
if [ "$EUID" -ne 0 ] || [ -z "${SUDO_USER:-}" ] || [ "$SUDO_USER" = "root" ]; then
  echo "Please run this script with sudo as your normal user"
  exit 1
fi

# `sudo -E` keeps the user's HOME/XDG dirs; root must not write into them
export HOME=/root
unset XDG_CACHE_HOME XDG_CONFIG_HOME XDG_DATA_HOME XDG_STATE_HOME XDG_RUNTIME_DIR

step_function() {
  local entry
  for entry in "${STEPS[@]}" "${OPTIONAL_STEPS[@]}"; do
    if [ "${entry%%:*}" = "$1" ]; then
      echo "${entry#*:}"
      return 0
    fi
  done
  return 1
}

selected=()
if [ $# -eq 0 ]; then
  selected=("${STEPS[@]%%:*}")
else
  for name in "$@"; do
    if ! step_function "$name" >/dev/null; then
      color_echo "red" "unknown step: $name (see --list)"
      exit 1
    fi
    selected+=("$name")
  done
fi

load_config
log_message "running steps: ${selected[*]}"

for name in "${selected[@]}"; do
  run_step "$name" "$(step_function "$name")"
done

print_summary
status=$?
if [ $# -eq 0 ] && [ "$status" -eq 0 ]; then
  prompt_reboot
fi
exit "$status"
