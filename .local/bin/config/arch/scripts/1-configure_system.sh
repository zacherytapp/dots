#!/bin/bash

FLATPAKS=(
  com.spotify.Client
  com.rustdesk.RustDesk
  com.protonvpn.www
  it.mijorus.gearlever
  com.mattjakeman.ExtensionManager
  us.zoom.Zoom
  com.github.tchx84.Flatseal
  com.discordapp.Discord
  app.openbubbles.OpenBubbles
)

# Get the directory of the current script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "${SCRIPT_DIR}/../utils.sh" ]; then
  print_info "error: utils.sh not found!"
  exit 1
fi

source "${SCRIPT_DIR}/../utils.sh"

function install_neovim_deps {
  sudo gem install ruby
  cpan
  sudo cpan install Neovim::Ext
}

function enable_multilib {
  local pacmanconf="/etc/pacman.conf"

  if [[ $(uname -m) = "x86_64" ]]; then
    sudo sed -i \
      -e "s/^#\[multilib\]$/\[multilib\]/g" \
      -e "/^\[multilib\]$/{n;s/^#Include = /Include = /}" "${pacmanconf}"
    sudo pacman -Sy
  else
    print_info "Multilib not applicable for 32-bit installations. Skipping."
    print_info "Arch discontinued 32-bit support in early 2017. Consider upgrading to a 64-bit."
  fi
}

function configure_flatpak {
  sudo pacman -S flatpak
  flatpak update

  for pak in "${FLATPAKS[@]}"; do
    if ! flatpak list | grep -i "$pak" &>/dev/null; then
      print_info "installing flatpak: $pak"
      flatpak install --noninteractive flathub "$pak"
    else
      echo "Flatpak already installed: $pak"
    fi
  done
}

function enable_services {
  sudo systemctl enable firewalld --now && sudo systemctl start firewalld
  sudo systemctl enable reflector.timer --now && sudo systemctl start reflector.timer
  sudo systemctl enable NetworkManager --now && sudo systemctl start NetworkManager
  sudo systemctl enable systemd-networkd --now && sudo systemctl start systemd-networkd
  # sudo systemctl enable bluetooth.service --now && sudo systemctl start bluetooth.service
  sudo systemctl enable sshd --now && sudo systemctl start sshd
}

function install_tpm {
  TPM_DIR="${ACTUAL_HOME}.tmux/plugins/tpm"

  if [ -d "$TPM_DIR" ]; then
    echo "TPM is already installed in $TPM_DIR"
  else
    echo "Installing Tmux Plugin Manager (TPM)..."
    git clone https://github.com/tmux-plugins/tpm $TPM_DIR
  fi
}

# print_info "installing kvm"
# install_kvm

print_info "configuring multilib"
enable_multilib

print_info "enabling services"
enable_services

print_info "configuring flatpak"
configure_flatpak
