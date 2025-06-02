#!/usr/bin/env bash

HOSTNAME="behemoth"

# set hostname
color_echo "yellow" "Setting hostname..."
hostnamectl set-hostname "${HOSTNAME}"

# enable automatic system updates
color_echo "yellow" "Enabling DNF autoupdate..."
dnf install dnf-automatic -y
touch /etc/dnf/automatic.conf
sed -i 's/apply_updates = no/apply_updates = yes/' /etc/dnf/automatic.conf
systemctl enable --now dnf-automatic.timer

# Update some codec and chipset stuff
sudo dnf config-manager setopt fedora-cisco-openh264.enabled=1

# replace flathub with package manager
color_echo "yellow" "Replacing Fedora Flatpak Repo with Flathub..."
dnf install -y flatpak
flatpak remote-delete fedora --force || true
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak repair
flatpak update

# enable ssh
color_echo "yellow" "Installing and enabling SSH..."
dnf install -y openssh-server
systemctl enable --now sshd

# multimedia
color_echo "yellow" "Installing multimedia codecs..."
dnf swap ffmpeg-free ffmpeg --allowerasing -y
dnf update @multimedia --setopt="install_weak_deps=False" --exclude=PackageKit-gstreamer-plugin -y
dnf4 install @sound-and-video -y
dnf4 update @sound-and-video -y
color_echo "yellow" "Installing Intel Hardware Accelerated Codecs..."
dnf -y install intel-media-driver

# config
git config --global init.defaultBranch main
git config --global user.email "${USER_EMAIL}"
git config --global user.name "${USER_NAME}"
