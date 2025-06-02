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

print_info "installing kvm tools..."
install_packages "${KVM[@]}"

function install_kvm {
  local libvirtlocaldir="${ACTUAL_HOME}/.local/libvirt"
  local nsconf="/etc/nsswitch.conf"
  local libvirtnetworkconf="/etc/libvirt/network.conf"

  print_info "Adding $(whoami) to libvirt group."
  sudo usermod -aG libvirt "$(whoami)"

  print_info "Creating local libvirt directories."
  mkdir -p "${libvirtlocaldir}"/{images,share}
  sudo chown "${ACTUAL_USER}":libvirt-qemu "${libvirtlocaldir}/images"

  if [ -f "${nsconf}" ] && ! grep -q "^hosts: .*libvirt" "${nsconf}"; then
    print_info "Enabling access to VMs on un-isolated bridge network."
    sudo sed -i "/^hosts/{s/files/files libvirt libvirt_guest/g}" "${nsconf}"
  fi

  print_info "Setting libvirt to use iptables (for UFW compatibility)."
  sudo sed -i 's/^#\?firewall_backend = "nftables"/firewall_backend = "iptables"/g' "${libvirtnetworkconf}"

  sudo systemctl enable libvirtd
  sudo systemctl start libvirtd
}
