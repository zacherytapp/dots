#!/bin/bash

# Get the directory of the current script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "${SCRIPT_DIR}/../utils.sh" ]; then
  print_info "error: utils.sh not found!"
  exit 1
fi

source "${SCRIPT_DIR}/../utils.sh"

if [ ! -f "${SCRIPT_DIR}/packages.conf" ]; then
  print_info "error: packages.conf not found!"
  exit 1
fi

source "${SCRIPT_DIR}/packages.conf"

print_info "installing gaming stuff..."
install_packages "${GAMING[@]}"
