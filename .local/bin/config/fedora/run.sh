#!/usr/bin/env bash
# Fedora 44 setup.
#
#   sudo ./run.sh             run every default step in order
#   sudo ./run.sh step ...    run only the named steps (see STEPS / EXTRA_STEPS)
#   sudo ./run.sh desktop     Hyprland + Noctalia session (opt-in, checked first)
#
# Config comes from the environment (prompted for when unset and interactive):
#   USER_NAME, USER_EMAIL, SETUP_HOSTNAME (default behemoth), LOCAL_IP
#   NONINTERACTIVE=1 never prompts, SKIP_UPGRADE=1 skips `dnf upgrade`

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)

# Check if the script is run with sudo
if [ "$EUID" -ne 0 ] || [ -z "${SUDO_USER:-}" ] || [ "${SUDO_USER}" = "root" ]; then
  echo "Please run this script with sudo as your normal user"
  exit 1
fi

# Source utility functions and the package list
for file in utils.sh packages.conf; do
  if [ ! -f "${SCRIPT_DIR}/${file}" ]; then
    echo "Error: ${file} not found!"
    exit 1
  fi
done
source "${SCRIPT_DIR}/utils.sh"
source "${SCRIPT_DIR}/packages.conf"
source "${SCRIPT_DIR}/init/config.sh"
source "${SCRIPT_DIR}/init/keys.sh"
source "${SCRIPT_DIR}/init/secure.sh"
source "${SCRIPT_DIR}/apps/install_browsers.sh"
source "${SCRIPT_DIR}/apps/install_dev.sh"
source "${SCRIPT_DIR}/apps/install_claude.sh"
source "${SCRIPT_DIR}/apps/install_languages.sh"
source "${SCRIPT_DIR}/apps/install_flatpaks.sh"
source "${SCRIPT_DIR}/setup/post_install_extras.sh"
source "${SCRIPT_DIR}/../desktop/desktop.sh"

install_base_packages() {
  color_echo "green" "Installing system utilities..."
  install_packages "${SYSTEM_UTILS[@]}"
  color_echo "green" "Installing neovim pre-requisites..."
  install_packages "${NEOVIM_PRE[@]}"
}

install_apps() {
  color_echo "green" "Installing apps..."
  install_packages "${APPS[@]}"
}

# gnome/theme need the user's graphical session bus
run_in_session() {
  local uid bus
  uid=$(id -u "$ACTUAL_USER")
  bus="/run/user/${uid}/bus"
  if [ ! -S "$bus" ]; then
    color_echo "yellow" "skipped: no session bus for ${ACTUAL_USER} ($bus) - run from a logged-in desktop"
    return 0
  fi
  as_user env DBUS_SESSION_BUS_ADDRESS="unix:path=${bus}" XDG_RUNTIME_DIR="/run/user/${uid}" "$@"
}

configure_gnome() {
  install_packages pipx gnome-shell-extension-common dconf glib2
  run_in_session bash "${SCRIPT_DIR}/setup/gnome.sh"
}

configure_theme() {
  install_packages papirus-icon-theme sassc git flatpak
  run_in_session bash "${SCRIPT_DIR}/setup/theme.sh"
}

# Hyprland + Noctalia next to gnome: checks fedora >= 44, x86_64/aarch64 and
# that the lionheartp/Hyprland copr offers hyprland >= 0.55 (the dots config
# is lua), then installs; the config comes from stowing the repo
install_desktop() {
  desktop_install
}

# noctalia-greeter (copr noctalia-greeter-git) on greetd, replacing gdm
install_greeter() {
  desktop_greeter
}

# name:function, in run order
STEPS=(
  dnf:configure_dnf
  repos:enable_repos
  upgrade:system_update
  multimedia:configure_multimedia
  packages:install_base_packages
  system:configure_system
  git:configure_git
  fonts:install_nerd_fonts
  dev:install_terminal_tools
  neovim:install_neovim
  shell:configure_shell
  tmux:install_tpm
  browsers:install_browsers
  1password:install_1password
  lang:install_lang_packages
  java:install_java
  rust:install_rust
  node:install_node
  claude:install_claude
  go:install_go_tools
  lua:install_lua
  python:install_python
  ruby:install_ruby
  homebrew:install_homebrew
  apps:install_apps
  flatpak:install_flatpaks
  keys:configure_keys
  security:configure_security
)

# only run when named explicitly
EXTRA_STEPS=(
  docker:install_docker
  auto_cpufreq:install_auto_cpufreq
  firmware:update_firmware
  gnome:configure_gnome
  theme:configure_theme
  desktop:install_desktop
  greeter:install_greeter
)

find_step() {
  local entry
  for entry in "${STEPS[@]}" "${EXTRA_STEPS[@]}"; do
    if [ "${entry%%:*}" = "$1" ]; then
      echo "${entry#*:}"
      return 0
    fi
  done
  return 1
}

# validate requested steps before doing anything
selected=()
if [ $# -eq 0 ]; then
  selected=("${STEPS[@]}")
else
  for name in "$@"; do
    if ! fn=$(find_step "$name"); then
      color_echo "red" "Unknown step: $name"
      echo "steps: $(printf '%s ' "${STEPS[@]%%:*}")"
      echo "extra: $(printf '%s ' "${EXTRA_STEPS[@]%%:*}")"
      exit 1
    fi
    selected+=("${name}:${fn}")
  done
fi

prompt_var USER_NAME "Git/GPG user name"
prompt_var USER_EMAIL "Git/GPG user email"
prompt_var SETUP_HOSTNAME "Hostname" "behemoth"
prompt_var LOCAL_IP "Local IP range to allow through ufw (e.g. 192.168.1.0/24, blank to skip)"

touch "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1
color_echo "blue" "Fedora setup for ${ACTUAL_USER} ($(rpm -E %fedora)), $(get_timestamp)"
is_container && color_echo "yellow" "Running in a container: service/firewall/hardware steps are skipped"

for entry in "${selected[@]}"; do
  run_step "${entry%%:*}" "${entry#*:}"
done

if print_summary; then
  echo "setup complete. you may want to reboot your system."
  prompt_reboot
else
  exit 1
fi
