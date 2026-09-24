#!/usr/bin/env bash
# gnome settings and extensions; run as the desktop user inside their session
# (run.sh's `gnome` step installs the packages and calls this)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="$HOME/.local/bin:$PATH"

gsettings set org.gnome.mutter dynamic-workspaces false
gsettings set org.gnome.desktop.wm.preferences num-workspaces 10

# set some keybindings
for i in {1..10}; do
  key=$((i % 10))
  gsettings set "org.gnome.desktop.wm.keybindings" "switch-to-workspace-$i" "['<Super>$key']"
  gsettings set "org.gnome.desktop.wm.keybindings" "move-to-workspace-$i" "['<Super><Shift>$key']"
done

# super+number otherwise launches dash apps
for i in {1..9}; do
  gsettings set "org.gnome.shell.keybindings" "switch-to-application-$i" "[]"
done

gsettings set "org.gnome.desktop.wm.keybindings" "close" "['<Super><Shift>Q']"

# usability settings
gsettings set org.gnome.desktop.peripherals.mouse accel-profile 'adaptive'
gsettings set org.gnome.desktop.sound allow-volume-above-100-percent true
gsettings set org.gnome.desktop.calendar show-weekdate true
gsettings set org.gnome.desktop.wm.preferences resize-with-right-button true
gsettings set org.gnome.desktop.wm.preferences button-layout 'appmenu:minimize,maximize,close'

# file settings
gsettings set org.gnome.nautilus.icon-view default-zoom-level 'small-plus'
gsettings set org.gtk.gtk4.Settings.FileChooser sort-directories-first true
gsettings set org.gtk.Settings.FileChooser sort-directories-first true
gsettings set org.gnome.nautilus.list-view use-tree-view true
gsettings set org.freedesktop.Tracker3.Miner.Files index-on-battery false
gsettings set org.freedesktop.Tracker3.Miner.Files index-on-battery-first-time false
gsettings set org.freedesktop.Tracker3.Miner.Files throttle 15

# Install gnome-extensions-cli only if not already installed
if ! command -v gext &>/dev/null; then
  pipx install gnome-extensions-cli --system-site-packages
fi

EXTENSIONS=(
  "just-perfection-desktop@just-perfection"
  "blur-my-shell@aunetx"
  "undecorate@sun.wxg@gmail.com"
  "tophat@fflewddur.github.io"
  "switcher@landau.fi"
  "appindicatorsupport@rgcjonas.gmail.com"
)

for ext in "${EXTENSIONS[@]}"; do
  if ! gext list --all | grep -q "$ext"; then
    echo "Installing extension: $ext"
    gext install "$ext"
  else
    echo "Extension already installed: $ext"
  fi
done

# extension settings (dump of /org/gnome/shell/extensions/)
dconf load /org/gnome/shell/extensions/ <"${SCRIPT_DIR}/gnome-settings.dconf"
