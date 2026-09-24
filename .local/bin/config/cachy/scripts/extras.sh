#!/usr/bin/env bash
# Desktop steps and opt-in steps, run by name: ./run.sh greeter gaming kvm stow

# Hyprland + Noctalia: checks (distro, hyprland >= 0.55 for the lua config,
# leftover bars, display manager, gpu), then the packages. The config comes
# from stowing the repo.
step_desktop() {
  desktop_install
}

step_greeter() {
  desktop_greeter
}

step_gaming() {
  pacman_install "${GAMING[@]}"
}

step_kvm() {
  pacman_install "${KVM[@]}"

  usermod -aG libvirt "$ACTUAL_USER"
  as_user mkdir -p "$ACTUAL_HOME/.local/libvirt/images" "$ACTUAL_HOME/.local/libvirt/share"

  # reach guests on the default NAT network by name
  local nsconf="/etc/nsswitch.conf"
  if ! grep -q '^hosts:.*libvirt' "$nsconf"; then
    sed -i '/^hosts:/s/ files/ files libvirt libvirt_guest/' "$nsconf"
  fi

  # libvirt's nftables rules bypass ufw; iptables keeps them in ufw's chains
  sed -i 's/^#\?\s*firewall_backend\s*=.*/firewall_backend = "iptables"/' /etc/libvirt/network.conf

  enable_service libvirtd.socket
}

step_stow() {
  # links the repo into $HOME using the repo's .stowrc (--target=~ --no-folding)
  local repo_dir
  repo_dir=$(cd "$SCRIPT_DIR/../../../.." && pwd)
  if [ ! -f "$repo_dir/.stowrc" ]; then
    print_error "no .stowrc in $repo_dir, is .local/bin/config/ still inside the dots repo?"
    return 1
  fi

  if ! (cd "$repo_dir" && as_user stow -n .); then
    print_error "stow found conflicts; to replace existing files with the repo's versions:"
    print_error "  cd $repo_dir && stow --adopt . && git restore ."
    return 1
  fi
  (cd "$repo_dir" && as_user stow .)
}
