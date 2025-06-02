#!/usr/bin/env bash

# Funtion to echo colored text
color_echo() {
  local color="$1"
  local text="$2"
  case "$color" in
  "red") echo -e "\033[0;31m$text\033[0m" ;;
  "green") echo -e "\033[0;32m$text\033[0m" ;;
  "yellow") echo -e "\033[1;33m$text\033[0m" ;;
  "blue") echo -e "\033[0;34m$text\033[0m" ;;
  *) echo "$text" ;;
  esac
}

# install autocpufreq
echo "Installing auto-cpufreq"
echo -e "Please select the \"i\" option to install when the installer prompts"
git clone https://github.com/AdnanHodzic/auto-cpufreq.git
chmod +x ./auto-cpufreq/auto-cpufreq-installer
./auto-cpufreq/auto-cpufreq-installer
auto-cpufreq --install

# docker
color_echo "yellow" "Installing Docker..."
dnf remove -y docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-selinux docker-engine-selinux docker-engine --noautoremove
dnf -y install dnf-plugins-core
dnf-3 config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
systemctl enable --now containerd

# generate gpg key
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
gpgKeyId=$(gpg --list-secret-keys --keyid-format LONG | grep sec | awk '{print $2}' | head -n 1)
if [ -z "$gpgKeyId" ]; then
  echo "Error: Could not find the GPG key ID."
  exit 1
fi
pass init "$gpgKeyId"

# firmare updates
color_echo "yellow" "Checking for firmware updates..."
fwupdmgr get-devices
fwupdmgr refresh --force
fwupdmgr get-updates
fwupdmgr update -y
