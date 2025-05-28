#!/usr/bin/env bash

FLATPAKS=(
  com.spotify.Client
  com.rustdesk.RustDesk
  com.protonvpn.www
  it.mijorus.gearlever
  com.mattjakeman.ExtensionManager
  us.zoom.Zoom
  com.github.tchx84.Flatseal
  com.discordapp.Discord
  app.openbubbles.OpenBubbles
)

for pak in "${FLATPAKS[@]}"; do
  if ! flatpak list | grep -i "$pak" &>/dev/null; then
    echo "Installing Flatpak: $pak"
    flatpak install --noninteractive flathub "$pak"
  else
    echo "Flatpak already installed: $pak"
  fi
done
