#!/usr/bin/env bash

# Exit on any error
set -e

# Check if the script is run with sudo
if [ "$EUID" -ne 0 ]; then
  echo "Please run this script with sudo"
  exit 1
fi

# Set variables
DEV=true # dev will prevent some initial stuff from running for speed
ACTUAL_USER=$SUDO_USER
ACTUAL_HOME=$(eval echo ~$SUDO_USER)
LOG_FILE="/var/log/fedora_things_to_do.log"
INITIAL_DIR=$(pwd)
TEMP_DIR="${ACTUAL_HOME}/temp"
if ! [ -d "${TEMP_DIR}" ]; then
  mkdir "${ACTUAL_HOME}/temp"
fi

# Source utility functions
source utils.sh

# Source the package list
if [ ! -f "packages.conf" ]; then
  echo "Error: packages.conf not found!"
  exit 1
fi

source packages.conf

# set dnf config
color_echo "yellow" "Configuring DNF Package Manager..."
backup_file "/etc/dnf/dnf.conf"
echo "max_parallel_downloads=10" | tee -a /etc/dnf/dnf.conf >/dev/null
sudo dnf -y install dnf-plugins-core

# enable rpm fusion
sudo dnf install -y https://download1.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm
sudo dnf install -y https://download1.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-$(rpm -E %fedora).noarch.rpm

if [[ "$DEV_ONLY" == false ]]; then
  dnf update -y && dnf upgrade -y
  git clone https://github.com/ryanoasis/nerd-fonts.git "${TEMP_DIR}/nerd-fonts"
fi

# color_echo "green" "Installing system utilities..."
install_packages "${SYSTEM_UTILS[@]}"

color_echo "green" "Installing development tools..."
install_packages "${DEV_TOOLS[@]}"

color_echo "green" "Installing language tools..."
install_packages "${LANG_TOOLS[@]}"

color_echo "green" "Installing apps..."
install_packages "${APPS[@]}"

color_echo "green" "Installing neovim pre-requisites..."
install_packages "${NEOVIM_PRE[@]}"

initial setup
color_echo "green" "configuring initial setup"
. init/config.sh

# keys
color_echo "green" "configuring keys"
. fedora/init/keys.sh

# security
color_echo "green" "configuring security"
. fedora/init/secure.sh

# browsers
color_echo "green" "installing browsers and tools"
. fedora/apps/install_browsers.sh

# developer tools
color_echo "green" "installing developer tools"
. fedora/apps/install_dev.sh
. fedora/apps/install_languages.sh

# flatpak
color_echo "green" "installing flatpaks"
. fedora/apps/install_flatpaks.sh

# gnome
# color_echo "green" "configuring gnome"
#   . setup/gnome.sh

echo "setup complete. you may want to reboot your system."
