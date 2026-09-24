#!/usr/bin/env bash
# base system configuration; sourced by run.sh

configure_dnf() {
  color_echo "yellow" "Configuring DNF Package Manager..."
  # dnf5 keeps user settings in /etc/dnf/libdnf5.conf.d/, so this is safe to re-run
  dnf config-manager setopt max_parallel_downloads=10
  install_packages dnf-plugins-core dnf5-plugins
}

enable_repos() {
  color_echo "yellow" "Enabling RPM Fusion and OpenH264..."
  local fedora_version
  fedora_version=$(rpm -E %fedora)
  if ! is_pkg_installed rpmfusion-free-release || ! is_pkg_installed rpmfusion-nonfree-release; then
    dnf install -y \
      "https://download1.rpmfusion.org/free/fedora/rpmfusion-free-release-${fedora_version}.noarch.rpm" \
      "https://download1.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-${fedora_version}.noarch.rpm"
  fi
  install_packages rpmfusion-free-release-tainted rpmfusion-nonfree-release-tainted
  dnf config-manager setopt fedora-cisco-openh264.enabled=1
}

system_update() {
  if [ -n "${SKIP_UPGRADE:-}" ]; then
    color_echo "yellow" "skipped: SKIP_UPGRADE is set"
    return 0
  fi
  dnf upgrade -y --refresh
}

configure_multimedia() {
  color_echo "yellow" "Installing multimedia codecs..."
  if is_pkg_installed ffmpeg-free; then
    dnf swap -y ffmpeg-free ffmpeg --allowerasing
  else
    install_packages ffmpeg
  fi
  dnf group install -y multimedia --setopt=install_weak_deps=False --exclude=PackageKit-gstreamer-plugin
  dnf group install -y sound-and-video
  color_echo "yellow" "Installing Intel Hardware Accelerated Codecs..."
  install_packages intel-media-driver
}

configure_system() {
  color_echo "yellow" "Setting hostname..."
  skip_if_container "hostnamectl set-hostname ${SETUP_HOSTNAME}" || hostnamectl set-hostname "${SETUP_HOSTNAME}"

  color_echo "yellow" "Enabling DNF automatic updates..."
  install_packages dnf5-plugin-automatic
  if [ ! -f /etc/dnf/automatic.conf ]; then
    printf '[commands]\napply_updates = yes\n' >/etc/dnf/automatic.conf
  else
    sed -i 's/^apply_updates\s*=.*/apply_updates = yes/' /etc/dnf/automatic.conf
    # add the key under an existing [commands] rather than a second section
    if ! grep -q '^apply_updates' /etc/dnf/automatic.conf; then
      if grep -q '^\[commands\]' /etc/dnf/automatic.conf; then
        sed -i '/^\[commands\]/a apply_updates = yes' /etc/dnf/automatic.conf
      else
        printf '\n[commands]\napply_updates = yes\n' >>/etc/dnf/automatic.conf
      fi
    fi
  fi
  enable_service dnf5-automatic.timer

  color_echo "yellow" "Installing and enabling SSH..."
  install_packages openssh-server
  enable_service sshd
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
