#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "${SCRIPT_DIR}/../utils.sh" ]; then
  print_info "error: utils.sh not found!"
  exit 1
fi

source "${SCRIPT_DIR}/../utils.sh"

DESKTOP_SH="$(cd "${SCRIPT_DIR}/../.." && pwd)/desktop/desktop.sh"

function configure_hypr {
  sudo bash -c 'ACTUAL_USER="$1" && source "$2" && desktop_install' _ "${SUDO_USER:-$USER}" "${DESKTOP_SH}"
}

print_info "configuring hypr"
configure_hypr
