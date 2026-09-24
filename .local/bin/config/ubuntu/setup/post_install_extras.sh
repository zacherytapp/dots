#!/usr/bin/env bash
# docker, auto-cpufreq and firmware updates (opt-in: sudo ./run.sh extras)

install_docker() {
  color_echo "yellow" "Installing Docker..."
  local pkg
  for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
    if is_pkg_installed "$pkg"; then
      apt-get remove -y "$pkg"
    fi
  done

  # shellcheck disable=SC1091
  add_apt_repo docker https://download.docker.com/linux/ubuntu/gpg \
    https://download.docker.com/linux/ubuntu "$(. /etc/os-release && echo "${UBUNTU_CODENAME}")" stable
  apt_update
  install_packages docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  usermod -aG docker "$ACTUAL_USER"

  if ! skip_in_container "systemctl enable docker"; then
    systemctl enable --now docker containerd
  fi
}

install_auto_cpufreq() {
  # only useful on laptops
  if skip_in_container "auto-cpufreq"; then
    return 0
  fi
  if ! ls /sys/class/power_supply/BAT* &>/dev/null; then
    color_echo "yellow" "skipped: no battery, not installing auto-cpufreq"
    return 0
  fi
  if command -v auto-cpufreq &>/dev/null; then
    return 0
  fi
  local src="${ACTUAL_HOME}/temp/auto-cpufreq"
  if [ ! -d "$src" ]; then
    as_user git clone https://github.com/AdnanHodzic/auto-cpufreq.git "$src"
  fi
  (cd "$src" && ./auto-cpufreq-installer --install)
  auto-cpufreq --install
}

update_firmware() {
  if skip_in_container "fwupd"; then
    return 0
  fi
  color_echo "yellow" "Checking for firmware updates..."
  install_packages fwupd
  fwupdmgr refresh --force
  # exit code 2 means there was nothing to update
  fwupdmgr update -y --no-reboot-check || [ $? -eq 2 ]
}

post_install_extras() {
  install_docker
  install_auto_cpufreq
  update_firmware
}
