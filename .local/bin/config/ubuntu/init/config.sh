#!/usr/bin/env bash
# system-level configuration: apt, hostname, updates, ssh, flathub, codecs, git

configure_apt() {
  color_echo "yellow" "Configuring apt..."
  apt_update
  install_packages software-properties-common ca-certificates curl gpg
  add-apt-repository -y -n universe
  add-apt-repository -y -n multiverse
  add-apt-repository -y -n restricted
  # 32-bit libraries for steam/wine
  dpkg --add-architecture i386
  apt_update
  apt-get -y -q full-upgrade
}

configure_system() {
  if ! skip_in_container "hostnamectl"; then
    color_echo "yellow" "Setting hostname to ${SETUP_HOSTNAME}..."
    hostnamectl set-hostname "${SETUP_HOSTNAME}"
  fi

  # enable automatic security updates
  color_echo "yellow" "Enabling unattended upgrades..."
  install_packages unattended-upgrades
  cat >/etc/apt/apt.conf.d/20auto-upgrades <<CONF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
CONF

  # enable ssh
  color_echo "yellow" "Installing and enabling SSH..."
  install_packages openssh-server
  if ! skip_in_container "systemctl enable ssh"; then
    systemctl enable --now ssh
  fi
}

configure_flathub() {
  color_echo "yellow" "Adding Flathub..."
  install_packages flatpak
  flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
}

install_multimedia() {
  color_echo "yellow" "Installing multimedia codecs..."
  # accept the microsoft fonts EULA pulled in by ubuntu-restricted-extras
  echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | debconf-set-selections
  install_packages "${MULTIMEDIA[@]}"
}

# only fill in what's missing so a stowed ~/.gitconfig is left alone
configure_git() {
  as_user git config --global init.defaultBranch >/dev/null ||
    as_user git config --global init.defaultBranch main
  if [ -n "${USER_EMAIL}" ]; then
    as_user git config --global user.email >/dev/null ||
      as_user git config --global user.email "${USER_EMAIL}"
  fi
  if [ -n "${USER_NAME}" ]; then
    as_user git config --global user.name >/dev/null ||
      as_user git config --global user.name "${USER_NAME}"
  fi
}
