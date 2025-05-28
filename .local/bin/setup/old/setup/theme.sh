#!/bin/bash

wget -qO- https://git.io/papirus-icon-theme-install | sh
gsettings set org.gnome.desktop.interface icon-theme 'Papirus'

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
flatpak override --filesystem=/home/zakk/.themes
flatpak override --filesystem=/home/zakk/.icons
flatpak override --user --filesystem=xdg-config/gtk-4.0
flatpak override --filesystem=xdg-config/gtk-4.0
ln -sf "/home/zakk/.themes/rose-pine/gtk-4.0/assets" "/home/zakk/.config/gtk-4.0/"
ln -sf "/home/zakk/.themes/rose-pine/gtk-4.0/gtk.css" "/home/zakk/.config/gtk-4.0/"
ln -sf "/home/zakk/.themes/rose-pine/gtk-4.0/gtk-dark.css" "/home/zakk/.config/gtk-4.0/"

gsettings set org.gnome.desktop.interface gtk-theme "rose-pine-Green-Dark-Compact"

