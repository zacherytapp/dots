#!/usr/bin/env bash
# System steps: pacman, packages, AUR, services, hostname, flatpak.

step_preflight() {
  local pacmanconf="/etc/pacman.conf"

  # colored output and parallel downloads (CachyOS enables these already)
  sed -i -e 's/^#Color$/Color/' -e 's/^#\?ParallelDownloads.*/ParallelDownloads = 10/' "$pacmanconf"

  # full upgrade first, installing on a stale system is a partial upgrade
  pacman -Syu --noconfirm
  pacman_install base-devel git curl sudo

  # paru is packaged in the cachyos repo; build it from the AUR elsewhere
  if ! command -v paru &>/dev/null; then
    if ! pacman_install paru; then
      local build_dir
      build_dir=$(as_user mktemp -d)
      as_user git clone https://aur.archlinux.org/paru-bin.git "$build_dir/paru-bin"
      (cd "$build_dir/paru-bin" && as_user makepkg -si --noconfirm)
      rm -rf "$build_dir"
    fi
  fi
}

step_packages() {
  print_info "installing base utilities, shell tools and languages..."
  pacman_install "${BASE[@]}" "${SHELL_TOOLS[@]}" "${LANGUAGES[@]}"

  print_info "installing containers and infrastructure tools..."
  pacman_install "${CONTAINERS[@]}"

  print_info "installing desktop utilities (the session itself is the desktop step)..."
  pacman_install "${DESKTOP[@]}"

  print_info "installing apps and fonts..."
  pacman_install "${APPS[@]}" "${FONTS[@]}"

  print_info "installing printing, security and cachyos extras..."
  pacman_install "${PRINTING[@]}" "${SECURITY[@]}" "${CACHY_EXTRAS[@]}"
}

step_aur() {
  aur_install "${AUR_PACKAGES[@]}"
}

step_docker() {
  usermod -aG docker "$ACTUAL_USER"
  enable_service docker.service
}

step_services() {
  enable_service NetworkManager.service
  enable_service sshd.service
  enable_service bluetooth.service
  enable_service cups.socket
  enable_service tailscaled.service
  enable_service reflector.timer

  # cachy-update's user timer (update checks + tray notifier). Linked by hand
  # because systemctl --user needs the user's session bus, which sudo lacks.
  local wants="$ACTUAL_HOME/.config/systemd/user/timers.target.wants"
  as_user mkdir -p "$wants"
  as_user ln -sfn /usr/lib/systemd/user/arch-update.timer "$wants/arch-update.timer"
}

step_hooks() {
  # pacman hook that dumps the installed packages into the repo after every
  # transaction, so `git diff` shows drift from the curated packages.conf
  local hook=/etc/pacman.d/hooks/96-paclist.hook
  install -d -m 755 /etc/pacman.d/hooks
  sed "s|@DIR@|$SCRIPT_DIR|g; s|@USER@|$ACTUAL_USER|g" "$SCRIPT_DIR/config/hooks/96-paclist.hook" >"$hook"
  chmod 644 "$hook"
}

step_hostname() {
  skip_in_container "hostnamectl set-hostname $SETUP_HOSTNAME" && return 0
  hostnamectl set-hostname "$SETUP_HOSTNAME"
}

step_flatpak() {
  flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo

  skip_in_container "flatpak install ${FLATPAKS[*]}" && return 0
  local pak
  for pak in "${FLATPAKS[@]}"; do
    if flatpak info "$pak" &>/dev/null; then
      echo "flatpak already installed: $pak"
    else
      flatpak install --noninteractive flathub "$pak"
    fi
  done
}
