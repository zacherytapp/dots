#!/usr/bin/env bash
# apps that ubuntu only ships as snaps (thunderbird, chromium) come from flathub instead

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
  com.slack.Slack
  org.mozilla.Thunderbird
  org.chromium.Chromium
)

install_flatpaks() {
  flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
  if skip_in_container "flatpak app installs"; then
    return 0
  fi

  local pak
  for pak in "${FLATPAKS[@]}"; do
    if ! flatpak info "$pak" &>/dev/null; then
      echo "Installing Flatpak: $pak"
      flatpak install --system --noninteractive flathub "$pak"
    else
      echo "Flatpak already installed: $pak"
    fi
  done
}
