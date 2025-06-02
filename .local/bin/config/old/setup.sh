#!/bin/bash

set -e

# Check if the script is run with sudo
if [ "$EUID" -ne 0 ]; then
  echo "Please run this script with sudo"
  exit 1
fi

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

# Set variables
ACTUAL_USER=$SUDO_USER
ACTUAL_HOME=$(eval echo ~$SUDO_USER)
LOG_FILE="/var/log/fedora_things_to_do.log"
INITIAL_DIR=$(pwd)

# Function to generate timestamps
get_timestamp() {
  date +"%Y-%m-%d %H:%M:%S"
}

# Function to log messages
log_message() {
  local message="$1"
  echo "$(get_timestamp) - $message" | tee -a "$LOG_FILE"
}

# Function to handle errors
handle_error() {
  local exit_code=$?
  local message="$1"
  if [ $exit_code -ne 0 ]; then
    color_echo "red" "ERROR: $message"
    exit $exit_code
  fi
}

# Function to prompt for reboot
prompt_reboot() {
  sudo -u $ACTUAL_USER bash -c 'read -p "It is time to reboot the machine. Would you like to do it now? (y/n): " choice; [[ $choice == [yY] ]]'
  if [ $? -eq 0 ]; then
    color_echo "green" "Rebooting..."
    reboot
  else
    color_echo "red" "Reboot canceled."
  fi
}

# Function to backup configuration files
backup_file() {
  local file="$1"
  if [ -f "$file" ]; then
    cp "$file" "$file.bak"
    handle_error "Failed to backup $file"
    color_echo "green" "Backed up $file"
  fi
}

TMP_DIR="$ACTUAL_HOME/temp"

cd $ACTUAL_HOME

if ! [ -d "${TMP_DIR}" ]; then
  mkdir temp
fi
# set dnf config
color_echo "yellow" "Configuring DNF Package Manager..."
backup_file "/etc/dnf/dnf.conf"
echo "max_parallel_downloads=10" | tee -a /etc/dnf/dnf.conf >/dev/null
sudo dnf -y install dnf-plugins-core

# install nerd-fonts
# git clone https://github.com/ryanoasis/nerd-fonts.git "${cloneDir}/nerd-fonts"
# cd "${cloneDir}/nerd-fonts"

# enable rpm fusion
sudo dnf install https://download1.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm
sudo dnf install https://download1.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-$(rpm -E %fedora).noarch.rpm

color_echo "blue" "Performing system upgrade... This may take a while..."
sudo dnf update -y && dnf upgrade -y

# install all the apps
sudo dnf install --skip-unavailable -y jq \
  ninja-build \
  cmake \
  gcc \
  make \
  gettext \
  curl \
  glibc-gconv-extra \
  git \
  kitty \
  tmux \
  vim \
  tmux \
  git \
  zsh \
  unzip \
  fzf \
  ripgrep \
  git-delta \
  gawk \
  sqlite-devel \
  fastfetch \
  btop \
  tree \
  fd-find \
  julia \
  ruby \
  ruby-devl \
  python3-pip \
  cpanminus \
  perl-core \
  php-cli \
  phpunit \
  composer \
  lua \
  akmod-nvidia \
  firefox \
  gimp \
  gmic-gimp \
  powertop \
  tuned-utils \
  gnome-shell-extension-topicons-plus `#Notification Icons for gnome` \
  timeshift \
  vlc \
  thunderbird \
  rsync \
  gnome-tweaks \
  xclip \
  obs-studio \
  clang \
  chromium \
  ansible \
  steam \
  lutris \
  cabextract \
  xorg-x11-font-utils \
  fontconfig \
  libdvdcss \
  geary \
  dnf-plugins-core \
  rpmfusion-nonfree-release-tainted \
  rpmfusion-free-release-tainted \
  pass \
  meson \
  gnome-shell-extension-pop-shell \
  gstreamer1-vaapi \
  fira-code-fonts \
  sassc \
  mozilla-ublock-origin \
  libglvnd-glx \
  libglvnd-opengl \
  pkgconfig \
  lazygit

wget -qO- https://git.io/papirus-icon-theme-install | sh
gsettings set org.gnome.desktop.interface icon-theme 'Papirus'

# set hostname
color_echo "yellow" "Setting hostname..."
hostnamectl set-hostname behemoth

# enable automatic system updates
color_echo "yellow" "Enabling DNF autoupdate..."
dnf install dnf-automatic -y
touch /etc/dnf/automatic.conf
sed -i 's/apply_updates = no/apply_updates = yes/' /etc/dnf/automatic.conf
sudo systemctl enable --now dnf-automatic.timer

# replace flathub with package manager
color_echo "yellow" "Replacing Fedora Flatpak Repo with Flathub..."
dnf install -y flatpak
flatpak remote-delete fedora --force || true
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
sudo flatpak repair
flatpak update

# enable ssh
color_echo "yellow" "Installing and enabling SSH..."
dnf install -y openssh-server
systemctl enable --now sshd

# chrome install
color_echo "yellow" "Installing Google Chrome..."
if command -v dnf4 &>/dev/null; then
  dnf4 config-manager --set-enabled google-chrome
else
  dnf config-manager setopt google-chrome.enabled=1
fi
sudo dnf install -y google-chrome-stable

# brave
curl -fsS https://dl.brave.com/install.sh | sh

# multimedia
color_echo "yellow" "Installing multimedia codecs..."
dnf swap ffmpeg-free ffmpeg --allowerasing -y
dnf update @multimedia --setopt="install_weak_deps=False" --exclude=PackageKit-gstreamer-plugin -y
dnf4 install @sound-and-video -y
dnf4 update @sound-and-video -y
color_echo "yellow" "Installing Intel Hardware Accelerated Codecs..."
dnf -y install intel-media-driver

# enhance security
if ! [ -d "./secure-linux" ]; then
  echo "Enhancing your Linux system's security"
  sudo dnf install ufw fail2ban -y
  sudo systemctl enable --now ufw.service
  sudo systemctl disable --now firewalld.service
  git clone https://github.com/ChrisTitusTech/secure-linux
  chmod +x ./secure-linux/secure.sh
  sudo ./secure-linux/secure.sh
fi

# install autocpufreq
# echo "Installing auto-cpufreq"
# echo -e "Please select the \"i\" option to install when the installer prompts"
# git clone https://github.com/AdnanHodzic/auto-cpufreq.git
# chmod +x ./auto-cpufreq/auto-cpufreq-installer
# sudo ./auto-cpufreq/auto-cpufreq-installer
# sudo auto-cpufreq --install

# docker
# color_echo "yellow" "Installing Docker..."
# dnf remove -y docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-selinux docker-engine-selinux docker-engine --noautoremove
# dnf -y install dnf-plugins-core
# dnf-3 config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
# dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
# systemctl enable --now docker
# systemctl enable --now containerd

# firmare updates
# color_echo "yellow" "Checking for firmware updates..."
# sudo fwupdmgr get-devices
# sudo fwupdmgr refresh --force
# sudo fwupdmgr get-updates
# sudo fwupdmgr update -y

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

# oh-my-zsh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
chsh -s $(which zsh) $ACTUAL_USER
export ZSH=~/.oh-my-zsh
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting

# flathub stuff
flatpak install -y flathub com.spotify.Client
flatpak install -y flathub com.rustdesk.RustDesk
flatpak install -y flathub com.protonvpn.www
flatpak install -y flathub it.mijorus.gearlever
flatpak install -y flathub com.mattjakeman.ExtensionManager
flatpak install -y flathub us.zoom.Zoom
flatpak install -y flathub com.github.tchx84.Flatseal

# jdk
sudo yum install -y https://cdn.azul.com/zulu/bin/zulu-repo-1.0.0-1.noarch.rpm
curl -O https://cdn.azul.com/zulu/bin/zulu-repo-1.0.0-1.noarch.rpm
sudo rpm --import https://www.azul.com/wp-content/uploads/2021/05/0xB1998361219BD9C9.txt
sudo yum install zulu21-jdk -y

# install rust
curl https://sh.rustup.rs -sSf | sh -s -- -y

NVM_REPO="https://api.github.com/repos/nvm-sh/nvm/releases/latest"
LATEST_TAG=""

NVIM_DIR="$ACTUAL_HOME/temp/neovim"
if ! [ -d "${NVIM_DIR}" ]; then
  git clone https://github.com/neovim/neovim "${NVIM_DIR}/neovim"
fi

cd "${ACTUAL_HOME}"
THEME_DIR="${ACTUAL_HOME}/temp/Rose-Pine-GTK-Theme"
mkdir ".themes"
mkdir ".icons"
# install rose-pine gtk
if ! [ -d "${THEME_DIR}" ]; then
  mkdir "${THEME_DIR}/temp/Rose-Pine-GTK-Theme"
  git clone https://github.com/Fausto-Korpsvart/Rose-Pine-GTK-Theme.git "${THEME_DIR}"
fi
cd "${THEME_DIR}/themes"
sh ./install.sh --tweaks macos float --name rose-pine --color dark --theme green --dest "/home/zakk/.themes" --size compact -l
sudo flatpak override --filesystem=/home/zakk/.themes
sudo flatpak override --filesystem=/home/zakk/.icons
flatpak override --user --filesystem=xdg-config/gtk-4.0
sudo flatpak override --filesystem=xdg-config/gtk-4.0
ln -sf "/home/zakk/.themes/rose-pine/gtk-4.0/assets" "/home/zakk/.config/gtk-4.0/"
ln -sf "/home/zakk/.themes/rose-pine/gtk-4.0/gtk.css" "/home/zakk/.config/gtk-4.0/"
ln -sf "/home/zakk/.themes/rose-pine/gtk-4.0/gtk-dark.css" "/home/zakk/.config/gtk-4.0/"

gsettings set org.gnome.desktop.interface gtk-theme "rose-pine-Green-Dark-Compact"

## install NVM
RESP_BODY=$(curl -s -L --connect-timeout 5 --max-time 10 -w "%{http_code}" "${NVM_REPO}" -o /tmp/github_api_response_$$)
LATEST_TAG=$(curl -s -L --connect-timeout 5 --max-time 10 "${NVM_REPO}" | jq -r '.tag_name')
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/${latestTag}/install.sh | bash
export NVM_DIR=$ACTUAL_HOME/.nvm
source $NVM_DIR/nvm.sh
nvm install node -g

# install pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -
export PNPM_HOME="/root/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

pnpm install -g @salesforce/cli neovim tree-sitter-cli sql-formatter @fsouza/prettierd

## install 1Password
sudo rpm --import https://downloads.1password.com/linux/keys/1password.asc &&
  sudo sh -c 'echo -e "[1password]\nname=1Password Stable Channel\nbaseurl=https://downloads.1password.com/linux/rpm/stable/\$basearch\nenabled=1\ngpgcheck=1\nrepo_gpgcheck=1\ngpgkey=\"https://downloads.1password.com/linux/keys/1password.asc\"" > /etc/yum.repos.d/1password.repo' &&
  sudo dnf install 1password -y

gsettings set "org.gnome.desktop.wm.keybindings" "switch-to-workspace-1" "['<Super>1']"
gsettings set "org.gnome.desktop.wm.keybindings" "switch-to-workspace-2" "['<Super>2']"
gsettings set "org.gnome.desktop.wm.keybindings" "switch-to-workspace-3" "['<Super>3']"
gsettings set "org.gnome.desktop.wm.keybindings" "switch-to-workspace-4" "['<Super>4']"
gsettings set "org.gnome.desktop.wm.keybindings" "switch-to-workspace-5" "['<Super>5']"
gsettings set "org.gnome.desktop.wm.keybindings" "switch-to-workspace-6" "['<Super>6']"
gsettings set "org.gnome.desktop.wm.keybindings" "switch-to-workspace-7" "['<Super>7']"
gsettings set "org.gnome.desktop.wm.keybindings" "switch-to-workspace-8" "['<Super>8']"
gsettings set "org.gnome.desktop.wm.keybindings" "switch-to-workspace-9" "['<Super>9']"
gsettings set "org.gnome.desktop.wm.keybindings" "switch-to-workspace-10" "['<Super>0']"

gsettings set "org.gnome.desktop.wm.keybindings" "move-to-workspace-1" "['<Super><Shift>1']"
gsettings set "org.gnome.desktop.wm.keybindings" "move-to-workspace-2" "['<Super><Shift>2']"
gsettings set "org.gnome.desktop.wm.keybindings" "move-to-workspace-3" "['<Super><Shift>3']"
gsettings set "org.gnome.desktop.wm.keybindings" "move-to-workspace-4" "['<Super><Shift>4']"
gsettings set "org.gnome.desktop.wm.keybindings" "move-to-workspace-5" "['<Super><Shift>5']"
gsettings set "org.gnome.desktop.wm.keybindings" "move-to-workspace-6" "['<Super><Shift>6']"
gsettings set "org.gnome.desktop.wm.keybindings" "move-to-workspace-7" "['<Super><Shift>7']"
gsettings set "org.gnome.desktop.wm.keybindings" "move-to-workspace-8" "['<Super><Shift>8']"
gsettings set "org.gnome.desktop.wm.keybindings" "move-to-workspace-9" "['<Super><Shift>9']"
gsettings set "org.gnome.desktop.wm.keybindings" "move-to-workspace-10" "['<Super><Shift>0']"

gsettings set org.gnome.desktop.wm.keybindings close '[<Super><Shift>Q]'

# usability settings
gsettings set org.gnome.desktop.peripherals.mouse accel-profile 'adaptive'
gsettings set org.gnome.desktop.sound allow-volume-above-100-percent true
gsettings set org.gnome.desktop.calendar show-weekdate true
gsettings set org.gnome.desktop.wm.preferences resize-with-right-button true
gsettings set org.gnome.desktop.wm.preferences button-layout 'appmenu:minimize,maximize,close'
gsettings set org.gnome.shell.overrides workspaces-only-on-primary false

# file settings
gsettings set org.gnome.nautilus.icon-view default-zoom-level 'standard'
gsettings set org.gnome.nautilus.preferences executable-text-activation 'ask'
gsettings set org.gtk.Settings.FileChooser sort-directories-first true
gsettings set org.gnome.nautilus.list-view use-tree-view true
gsettings set org.freedesktop.Tracker.Miner.Files index-on-battery false
gsettings set org.freedesktop.Tracker.Miner.Files index-on-battery-first-time false
gsettings set org.freedesktop.Tracker.Miner.Files throttle 15

# ssh-keygen

# install golang
GO_VERSION="1.24.3"
wget wget https://storage.googleapis.com/golang/go$GO_VERSION.linux-amd64.tar.gz
tar -C /usr/local -xzf go$GO_VERSION.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
go install golang.org/x/tools/cmd/goimports@latest
go install github.com/nsf/gocode@latest

# add custom domains to hostname
