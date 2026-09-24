#!/usr/bin/env bash
# gnome settings, keybindings and extensions (opt-in: sudo ./run.sh gnome)

GNOME_EXTENSIONS=(
  "just-perfection-desktop@just-perfection"
  "blur-my-shell@aunetx"
  "undecorate@sun.wxg@gmail.com"
  "tophat@fflewddur.github.io"
  "switcher@landau.fi"
)

# gsettings, dconf and gext need the user's session bus
user_bus() {
  echo "/run/user/$(id -u "$ACTUAL_USER")/bus"
}

user_gsettings() {
  as_user env DBUS_SESSION_BUS_ADDRESS="unix:path=$(user_bus)" gsettings "$@"
}

# gext (pipx, ~/.local/bin) with the session bus
user_gext() {
  as_user_sh "export DBUS_SESSION_BUS_ADDRESS='unix:path=$(user_bus)' XDG_RUNTIME_DIR='$(dirname "$(user_bus)")'; gext $*"
}

configure_gnome() {
  install_packages gnome-shell-extensions gnome-shell-extension-manager pipx

  if ! as_user_sh 'command -v gext' &>/dev/null; then
    as_user pipx install gnome-extensions-cli --system-site-packages
  fi

  if skip_in_container "gsettings/gnome extensions need a gnome session"; then
    return 0
  fi
  if [ ! -S "$(user_bus)" ]; then
    color_echo "yellow" "skipped: no session bus for ${ACTUAL_USER} ($(user_bus)) - run from a logged-in desktop"
    return 0
  fi

  user_gsettings set org.gnome.mutter dynamic-workspaces false
  user_gsettings set org.gnome.desktop.wm.preferences num-workspaces 10

  # set some keybindings; ubuntu dock binds <Super>N to app launchers, free those first
  local i key
  for i in $(seq 1 9); do
    user_gsettings set org.gnome.shell.keybindings "switch-to-application-$i" "[]"
  done
  for i in $(seq 1 10); do
    key=$((i % 10))
    user_gsettings set org.gnome.desktop.wm.keybindings "switch-to-workspace-$i" "['<Super>$key']"
    user_gsettings set org.gnome.desktop.wm.keybindings "move-to-workspace-$i" "['<Super><Shift>$key']"
  done
  user_gsettings set org.gnome.desktop.wm.keybindings close "['<Super><Shift>Q']"

  # usability settings
  user_gsettings set org.gnome.desktop.peripherals.mouse accel-profile 'adaptive'
  user_gsettings set org.gnome.desktop.sound allow-volume-above-100-percent true
  user_gsettings set org.gnome.desktop.calendar show-weekdate true
  user_gsettings set org.gnome.desktop.wm.preferences resize-with-right-button true
  user_gsettings set org.gnome.desktop.wm.preferences button-layout 'appmenu:minimize,maximize,close'

  # file settings
  user_gsettings set org.gnome.nautilus.icon-view default-zoom-level 'medium'
  user_gsettings set org.gnome.nautilus.preferences executable-text-activation 'ask'
  user_gsettings set org.gtk.Settings.FileChooser sort-directories-first true
  user_gsettings set org.gnome.nautilus.list-view use-tree-view true
  # localsearch (formerly tracker) indexing
  # captured first: `grep -q` closing the pipe early would fail it under pipefail
  local schemas
  schemas=$(user_gsettings list-schemas)
  if grep -qx org.freedesktop.Tracker3.Miner.Files <<<"$schemas"; then
    user_gsettings set org.freedesktop.Tracker3.Miner.Files index-on-battery false
    user_gsettings set org.freedesktop.Tracker3.Miner.Files index-on-battery-first-time false
    user_gsettings set org.freedesktop.Tracker3.Miner.Files throttle 15
  fi

  local ext installed
  # --all includes disabled ones, so a re-run doesn't re-enable what the user turned off
  installed=$(user_gext list --all)
  for ext in "${GNOME_EXTENSIONS[@]}"; do
    if ! grep -qF "$ext" <<<"$installed"; then
      echo "Installing extension: $ext"
      user_gext install "'$ext'"
    else
      echo "Extension already installed: $ext"
    fi
  done

  # extension settings
  as_user env DBUS_SESSION_BUS_ADDRESS="unix:path=$(user_bus)" \
    dconf load /org/gnome/shell/extensions/ <"${SCRIPT_DIR}/setup/gnome-settings.dconf"
}
