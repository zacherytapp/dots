#!/bin/bash

# Get the directory of the current script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "${SCRIPT_DIR}/../utils.sh" ]; then
  print_info "error: utils.sh not found!"
  exit 1
fi

source "${SCRIPT_DIR}/../utils.sh"

function install_plymouth {
  local mkinitcpioconf="/etc/mkinitcpio.conf"
  local grubconf="/etc/default/grub"

  if ! grep -q "^HOOKS=(.*plymouth.*)$" "${mkinitcpioconf}"; then
    sudo sed -i '/^HOOKS=/s/ kms / kms plymouth /' "${mkinitcpioconf}"
    sudo mkinitcpio -P
  fi

  if [ -f "${grubconf}" ] && ! sudo grep -q "^GRUB_CMDLINE_LINUX_DEFAULT=.*splash" "${grubconf}"; then
    show_info "Updating GRUB defaults for splash screen."
    sudo sed -i '/^GRUB_CMDLINE_LINUX_DEFAULT=/s/"$/ splash"/g' "${grubconf}"
    sudo grub-mkconfig -o /boot/grub/grub.cfg
  fi

  if [ "$(sudo bootctl is-installed)" = yes ]; then
    local efidir
    local conf
    efidir="$(bootctl -p)"
    while read -r conf; do
      if ! grep -q "^options.*splash" "${conf}"; then
        sudo sed -i "/^options/s/$/ splash/" "${conf}"
      fi
    done < <(sudo find "${efidir}"/loader/entries/ -name "*.conf")
  fi
}

function configure_grub_theme {
  cd ${ACTUAL_HOME}
  git clone https://github.com/vinceliuice/grub2-themes.git
  cd grub2-themes && sudo ./install.sh -b -t stylish -s 2k
  sudo grub-mkconfig -o /boot/grub/grub.cfg
}

# noctalia-greeter on greetd (replaces the old rose-pine sddm theme); it
# picks up the gruvbox wallpaper and palette through noctalia's greeter sync
function configure_greeter {
  local desktop_sh
  desktop_sh="$(cd "${SCRIPT_DIR}/../.." && pwd)/desktop/desktop.sh"
  sudo bash -c 'ACTUAL_USER="$1" && source "$2" && desktop_greeter' _ "${SUDO_USER:-$USER}" "${desktop_sh}"
}

function configure_laptop {
  sudo systemctl enable tlp.service
  sudo systemctl start tlp.service
}

function set_wallpaper {
  if ! [ -d "${ACTUAL_HOME}/.config/assets/backgrounds" ]; then
    mkdir ${ACTUAL_HOME}/.config/assets
    mkdir ${ACTUAL_HOME}/.config/assets/backgrounds
    cp -r ${SCRIPT_DIR}/assets/backgrounds ${ACTUAL_HOME}/.config/assets/
  fi
}

print_info "configuring plymouth"
install_plymouth

print_info "configuring grub2"
configure_grub_theme

print_info "configuring laptop specific settings"
configure_laptop

print_info "configuring noctalia-greeter"
configure_greeter

print_info "setting wallpaper"
set_wallpaper
