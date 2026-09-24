#!/usr/bin/env bash
# papirus icons + gruvbox gtk theme (opt-in: sudo ./run.sh theme)
#
# Gruvbox (medium, green accent) matches the Gruvbox Material palette the rest
# of the dots use. No -l: the stowed ~/.config/gtk-4.0/gtk.css imports the
# noctalia-rendered gruvbox colors for libadwaita apps, and -l would replace it.

configure_theme() {
  local theme_dir="${ACTUAL_HOME}/temp/Gruvbox-GTK-Theme"
  local theme="Gruvbox-Green-Dark-Compact-Medium"

  install_packages papirus-icon-theme gnome-themes-extra gtk2-engines-murrine sassc git flatpak

  as_user mkdir -p "${ACTUAL_HOME}/.themes" "${ACTUAL_HOME}/.icons" "${ACTUAL_HOME}/.config/gtk-4.0" "${ACTUAL_HOME}/temp"
  # install.sh deletes and rebuilds the theme every time, so only run it until
  # the theme is installed
  if [ -d "${ACTUAL_HOME}/.themes/${theme}" ]; then
    echo "${theme} already installed"
  else
    if [ ! -d "${theme_dir}/.git" ]; then
      as_user git clone --depth 1 https://github.com/Fausto-Korpsvart/Gruvbox-GTK-Theme.git "${theme_dir}"
    fi
    as_user bash -c "cd '${theme_dir}/themes' && ./install.sh --tweaks medium macos float --theme green --color dark --dest '${ACTUAL_HOME}/.themes' --size compact"
  fi

  flatpak override --filesystem="${ACTUAL_HOME}/.themes"
  flatpak override --filesystem="${ACTUAL_HOME}/.icons"
  flatpak override --filesystem=xdg-config/gtk-4.0

  if skip_in_container "gsettings needs a gnome session"; then
    return 0
  fi
  as_user env DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$(id -u "$ACTUAL_USER")/bus" \
    gsettings set org.gnome.desktop.interface icon-theme 'Papirus-Dark'
  as_user env DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$(id -u "$ACTUAL_USER")/bus" \
    gsettings set org.gnome.desktop.interface gtk-theme "${theme}"
}
