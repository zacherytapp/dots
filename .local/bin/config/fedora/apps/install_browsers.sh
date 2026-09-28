#!/usr/bin/env bash

install_browsers() {
  # chrome's repo definition ships in fedora-workstation-repositories
  color_echo "yellow" "Installing Google Chrome..."
  install_packages fedora-workstation-repositories
  dnf config-manager setopt google-chrome.enabled=1
  install_packages google-chrome-stable

  color_echo "yellow" "Installing Brave..."
  dnf config-manager addrepo --overwrite \
    --from-repofile=https://brave-browser-rpm-release.s3.brave.com/brave-browser.repo
  install_packages brave-browser
}
