#!/usr/bin/env bash
# flathub and flatpak apps; sourced by run.sh

install_flatpaks() {
  # replace the fedora flatpak remote with flathub
  color_echo "yellow" "Replacing Fedora Flatpak Repo with Flathub..."
  install_packages flatpak
  flatpak remote-delete fedora --force 2>/dev/null || true
  flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo

  if skip_if_container "flatpak app installs"; then
    return 0
  fi

  # updating apps is part of upgrading, like the `upgrade` step
  if [ -z "${SKIP_UPGRADE:-}" ]; then
    flatpak update --noninteractive
  fi

  for pak in "${FLATPAKS[@]}"; do
    if ! flatpak info "$pak" &>/dev/null; then
      echo "Installing Flatpak: $pak"
      flatpak install --noninteractive flathub "$pak"
    else
      echo "Flatpak already installed: $pak"
    fi
  done
}
