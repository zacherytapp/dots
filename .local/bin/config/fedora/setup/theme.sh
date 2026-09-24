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

find_theme() {
  find "${HOME}/.themes" -maxdepth 1 -name 'Gruvbox-Green-Dark-Compact*' -printf '%f\n' | sort | head -n 1
}

# install.sh deletes and rebuilds the theme every time, so only run it until
# the theme is installed
theme=$(find_theme)
if [ -n "${theme}" ]; then
  echo "${theme} already installed"
else
  if [ ! -d "${THEME_DIR}" ]; then
    git clone --depth 1 https://github.com/Fausto-Korpsvart/Gruvbox-GTK-Theme.git "${THEME_DIR}"
  fi
  (cd "${THEME_DIR}/themes" &&
    bash ./install.sh --tweaks medium macos float --theme green --color dark --dest "${HOME}/.themes" --size compact)
  theme=$(find_theme)
fi

# let flatpak apps see the theme
flatpak override --user --filesystem="${HOME}/.themes:ro"
flatpak override --user --filesystem="${HOME}/.icons:ro"
flatpak override --user --filesystem=xdg-config/gtk-4.0:ro

if [ -z "${theme}" ]; then
  echo "Gruvbox-Green-Dark-Compact* not found in ${HOME}/.themes" >&2
  exit 1
fi
gsettings set org.gnome.desktop.interface gtk-theme "${theme}"
gsettings set org.gnome.desktop.interface color-scheme 'prefer-dark'
