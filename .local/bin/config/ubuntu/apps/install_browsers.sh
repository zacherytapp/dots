#!/usr/bin/env bash
# browsers from their vendors' apt repos (ubuntu's firefox/chromium debs are snap shims)

install_chrome() {
  color_echo "yellow" "Installing Google Chrome..."
  add_apt_repo google-chrome https://dl.google.com/linux/linux_signing_key.pub \
    https://dl.google.com/linux/chrome/deb/ stable main amd64
  # chrome's postinst writes its own google-chrome.list; drop it so apt doesn't see the repo twice
  rm -f /etc/apt/sources.list.d/google-chrome.list
  apt_update
  install_packages google-chrome-stable
  rm -f /etc/apt/sources.list.d/google-chrome.list
}

install_brave() {
  color_echo "yellow" "Installing Brave..."
  add_apt_repo brave-browser https://brave-browser-apt-release.s3.brave.com/brave-browser-archive-keyring.gpg \
    https://brave-browser-apt-release.s3.brave.com/ stable main
  apt_update
  install_packages brave-browser
}

install_firefox() {
  color_echo "yellow" "Installing Firefox from Mozilla's apt repo..."
  add_apt_repo mozilla https://packages.mozilla.org/apt/repo-signing-key.gpg \
    https://packages.mozilla.org/apt mozilla main
  # prefer mozilla's deb over ubuntu's snap transitional package
  cat >/etc/apt/preferences.d/mozilla <<CONF
Package: *
Pin: origin packages.mozilla.org
Pin-Priority: 1000
CONF
  apt_update
  install_packages firefox
}

install_browsers() {
  install_chrome
  install_brave
  install_firefox
}
