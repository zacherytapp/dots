#!/bin/bash

gsettings set org.gnome.mutter dynamic-workspaces false
gsettings set org.gnome.desktop.wm.preferences num-workspaces 10

# set some keybindings
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

gsettings set "org.gnome.desktop.wm.keybindings" "close" "['<Super><Shift>Q']"

# usability settings
gsettings set org.gnome.desktop.peripherals.mouse accel-profile 'adaptive'
gsettings set org.gnome.desktop.sound allow-volume-above-100-percent true
gsettings set org.gnome.desktop.calendar show-weekdate true
gsettings set org.gnome.desktop.wm.preferences resize-with-right-button true
gsettings set org.gnome.desktop.wm.preferences button-layout 'appmenu:minimize,maximize,close'

# file settings
gsettings set org.gnome.nautilus.icon-view default-zoom-level 'standard'
gsettings set org.gnome.nautilus.preferences executable-text-activation 'ask'
gsettings set org.gtk.Settings.FileChooser sort-directories-first true
gsettings set org.gnome.nautilus.list-view use-tree-view true
gsettings set org.freedesktop.Tracker.Miner.Files index-on-battery false
gsettings set org.freedesktop.Tracker.Miner.Files index-on-battery-first-time false
gsettings set org.freedesktop.Tracker.Miner.Files throttle 15

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Source utils.sh from parent directory
source "$SCRIPT_DIR/../utils.sh"

install_packages pipx gnome-shell-extensions

# Install gnome-extensions-cli only if not already installed
if ! command -v ~/.local/bin/gext &> /dev/null; then
  pipx install gnome-extensions-cli --system-site-packages
fi

EXTENSIONS=(
  "just-perfection-desktop@just-perfection"
  "blur-my-shell@aunetx"
  "undecorate@sun.wxg@gmail.com"
  "tophat@fflewddur.github.io"
  "switcher@landau.fi"
)

for ext in "${EXTENSIONS[@]}"; do
  if ! ~/.local/bin/gext list | grep "$ext" &> /dev/null; then
    echo "Installing extension: $ext"
    ~/.local/bin/gext install "$ext"
  else
    echo "Extension already installed: $ext"
  fi
done