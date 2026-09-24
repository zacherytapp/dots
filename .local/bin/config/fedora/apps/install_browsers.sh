#!/usr/bin/env bash
# browsers; sourced by run.sh

install_browsers() {
  # chrome, via the repo definitions shipped by fedora-workstation-repositories
  color_echo "yellow" "Installing Google Chrome..."
  install_packages fedora-workstation-repositories
  dnf config-manager setopt google-chrome.enabled=1
  install_packages google-chrome-stable

  # brave
  color_echo "yellow" "Installing Brave..."
  dnf config-manager addrepo --overwrite \
    --from-repofile=https://brave-browser-rpm-release.s3.brave.com/brave-browser.repo
  install_packages brave-browser
}
