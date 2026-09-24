#!/usr/bin/env bash
# gruvbox gtk theme + papirus icons; run as the desktop user inside their session
# (run.sh's `theme` step installs papirus-icon-theme, sassc and git first)
#
# Gruvbox (medium, green accent) matches the Gruvbox Material palette the rest
# of the dots use. No -l: the stowed ~/.config/gtk-4.0/gtk.css imports the
# noctalia-rendered gruvbox colors for libadwaita apps, and -l would replace it.

set -e

THEME_DIR="${HOME}/temp/Gruvbox-GTK-Theme"
mkdir -p "${HOME}/.themes" "${HOME}/.icons" "${HOME}/temp"

gsettings set org.gnome.desktop.interface icon-theme 'Papirus-Dark'

if [ ! -d "${THEME_DIR}" ]; then
  git clone --depth 1 https://github.com/Fausto-Korpsvart/Gruvbox-GTK-Theme.git "${THEME_DIR}"
fi
(cd "${THEME_DIR}/themes" &&
  bash ./install.sh --tweaks medium macos float --theme green --color dark --dest "${HOME}/.themes" --size compact)

# let flatpak apps see the theme
flatpak override --user --filesystem="${HOME}/.themes:ro"
flatpak override --user --filesystem="${HOME}/.icons:ro"
flatpak override --user --filesystem=xdg-config/gtk-4.0:ro

theme=$(find "${HOME}/.themes" -maxdepth 1 -name 'Gruvbox-Green-Dark-Compact*' -printf '%f\n' | sort | head -n 1)
gsettings set org.gnome.desktop.interface gtk-theme "${theme}"
gsettings set org.gnome.desktop.interface color-scheme 'prefer-dark'
