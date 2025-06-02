#!/bin/bash

# Get the directory of the current script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "${SCRIPT_DIR}/../utils.sh" ]; then
  print_info "error: utils.sh not found!"
  exit 1
fi

source "${SCRIPT_DIR}/../utils.sh"

function configure_hypr {
  sudo systemctl enable sddm.service
  mkdir -p $ACTUAL_HOME/.config/hypr/ && cp -r ${SCRIPT_DIR}/config/hypr/hyprland.conf /home/$USER/.config/hypr/
  cp -r ${SCRIPT_DIR}/config/dunst /home/$USER/.config/
  cp -r ${SCRIPT_DIR}/config/waybar /home/$USER/.config/
  cp -r ${SCRIPT_DIR}/config/tofi /home/$USER/.config/
  cp -r ${SCRIPT_DIR}/config/hypr/hyprlock.conf /home/$USER/.config/hypr/
  cp -r ${SCRIPT_DIR}/config/wlogout /home/$USER/.config/ && cp -r ${SCRIPT_DIR}/config/wlogout /home/$USER/.config/assets/
  cp -r ${SCRIPT_DIR}/config/hypr/hypridle.conf /home/$USER/.config/hypr/
}

print_info "configuring hypr"
configure_hypr
