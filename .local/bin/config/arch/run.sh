#!/bin/bash

clear

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)

source "${SCRIPT_DIR}/utils.sh"

# run pre-config
print_info "run some pre-config"
sh ${SCRIPT_DIR}/scripts/0-preconfigure.sh

if [ ! -f "${SCRIPT_DIR}/packages.conf" ]; then
  print_info "error: packages.conf not found!"
  exit 1
fi

source "${SCRIPT_DIR}/packages.conf"

if [ ! -f "${SCRIPT_DIR}/utils.sh" ]; then
  print_info "error: utils.sh not found!"
  exit 1
fi

cd ${ACTUAL_HOME}

print_info "Installing system utilities..."
install_packages "${SYSTEM_UTILS[@]}"

print_info "Installing fonts..."
install_packages "${FONTS[@]}"

print_info "installing dev tools..."
install_packages "${DEV_TOOLS[@]}"

print_info "installing hyprland stuff..."
install_packages "${HYPR[@]}"

print_info "installing apps..."
install_packages "${APPS[@]}"

print_info "installing printing stuff..."
install_packages "${PRINTING[@]}"

print_info "installing graphics stuff..."
install_packages "${GRAPHICS[@]}"

cd ${SCRIPT_DIR}

print_info "configuring the system"
sh ${SCRIPT_DIR}/scripts/1-configure_system.sh

print_info "configuring hyprland"
sh ${SCRIPT_DIR}/scripts/2-configure_hypr.sh

print_info "configuring plymouth and grub"
sh ${SCRIPT_DIR}/scripts/3-configure-desktop-extras.sh

print_info "configuring security stuff"
sh ${SCRIPT_DIR}/scripts/4-security.sh

# enter root
# [ "$(whoami)" != "root" ] && exec sudo -- "$0" "$@"
# check_root
