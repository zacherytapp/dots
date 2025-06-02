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

function configure_kvantum_theme {
  if ! [ -d "$ACTUAL_HOME/kvantum"]; then
    git clone https://github.com/rose-pine/kvantum.git
    tar -xzf ./kvantum/dist/rose-pine-iris.tar.gz
  fi

}

function configure_grub_theme {
  cd ${ACTUAL_HOME}
  git clone https://github.com/vinceliuice/grub2-themes.git
  cd grub2-themes && sudo ./install.sh -b -t stylish -s 2k
  sudo grub-mkconfig -o /boot/grub/grub.cfg
}

function configure_sddm {
  cd ${ACTUAL_HOME}

  if ! [ -d "${ACTUAL_HOME}/sddm-rose-pine" ]; then
    git clone https://github.com/lwndhrst/sddm-rose-pine.git
  fi

  if [ -d "/usr/share/sddm/themes" ]; then
    sudo mv sddm-rose-pine /usr/share/sddm/themes
  fi

  if ! [ -d "/etc/sddm.conf.d" ]; then
    sudo mkdir /etc/sddm.conf.d
  fi

  sudo cp /usr/lib/sddm/sddm.conf.d/default.conf /etc/sddm.conf.d/sddm.conf
  sudo sed -i "s/^Current=.*/Current=sddm-rose-pine/" "/etc/sddm.conf.d/sddm.conf"
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

print_info "configure_sddm_theme"
configure_sddm

print_info "setting wallpaper"
set_wallpaper
