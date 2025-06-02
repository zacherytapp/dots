#!/usr/bin/env bash

# chrome install
color_echo "yellow" "Installing Google Chrome..."
if command -v dnf4 &>/dev/null; then
  dnf4 config-manager --set-enabled google-chrome
else
  dnf config-manager setopt google-chrome.enabled=1
fi
sudo dnf install -y google-chrome-stable

# brave
curl -fsS https://dl.brave.com/install.sh | sh
