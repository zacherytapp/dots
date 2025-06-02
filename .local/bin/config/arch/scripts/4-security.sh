#!/bin/bash

# Get the directory of the current script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "${SCRIPT_DIR}/../utils.sh" ]; then
  print_info "error: utils.sh not found!"
  exit 1
fi

source "${SCRIPT_DIR}/../utils.sh"

function configure_keys {
  gpg --batch --full-generate-key <<EOF
%no-protection
Key-Type: rsa
Key-Length: 4096
Subkey-Type: rsa
Subkey-Length: 4096
Name-Real: ${USER_NAME}
Name-Email: ${USER_EMAIL}
Expire-Date: 0
%commit
EOF

  # list keys
  GPG_KEY=$(gpg --list-secret-keys --keyid-format LONG | grep sec | awk '{print $2}' | head -n 1)
  if [ -z "$GPG_KEY" ]; then
    echo "Error: Could not find the GPG key ID."
    exit 1
  fi
  pass init "$GPG_KEY"

  # ssh key generation
  ssh-keygen -t ed25519 -b 4096 -C "${USER_NAME} <${USER_EMAIL}>" -f ~/.ssh/id_ed25519 -q

}

function configure_ufw {
  sudo ufw limit 22/tcp
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw default deny incoming
  sudo ufw default allow outgoing
  sudo ufw allow from ${LOCAL_IP}
  sudo ufw enable
}

function configure_network_security {

  cat <<EOF >/etc/host.conf
order bind,hosts
multi on
EOF

  sudo cp ${SCRIPT_DIR}/config/jail.local /etc/fail2ban/
  sudo systemctl enable fail2ban && sudo systemctl start fail2ban

  echo "listening ports"
  netstat -tunlp
}

function install_network {
  local nmconf="/etc/NetworkManager/NetworkManager.conf"
  local nmrandomconf="/etc/NetworkManager/conf.d/randomize_mac_address.conf"

  if ! find "${nmconf}" /etc/NetworkManager/conf.d/ -type f -exec grep -q "mac-address=random" {} +; then;
    sudo tee -a "${nmrandomconf}" >/dev/null <<EOF
[connection-mac-randomization]
wifi.cloned-mac-address=random
ethernet.cloned-mac-address=random
EOF
  fi

  sudo systemctl enable --now NetworkManager

  sudo sed -i \
    -e "/^#PermitRootLogin prohibit-password$/a PermitRootLogin no" \
    -e "/^#Port 22$/i Protocol 2" \
    /etc/ssh/sshd_config
}

function install_discovery {
  local nsconf="/etc/nsswitch.conf"

  if [ -f "${nsconf}" ]; then
    if ! grep -q "^hosts: .*mdns_minimal" "${nsconf}"; then
      sudo sed -i "/^hosts:/{s/myhostname/myhostname mdns_minimal \[NOTFOUND=return\]/g}" ${nsconf};
    else
      echo "Local hostname resolution already set."
    fi
  else
    echo "${nsconf@Q} missing. Skipping."
    return
  fi
  sudo systemctl enable avahi-daemon.service
  sudo systemctl start avahi-daemon.service
}

print_info "configuring keys..."
configure_keys

print_info "configuring ufw..."
configure_ufw

print_info "setting up network stuff..."
install_network

print_info "configuring network security..."
configure_network_security

print_info "configuring discovery"
install_discovery

