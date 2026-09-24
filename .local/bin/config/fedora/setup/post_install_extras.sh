#!/usr/bin/env bash
# optional extras; sourced by run.sh and only run when named:
#   sudo ./run.sh docker auto_cpufreq firmware

install_docker() {
  color_echo "yellow" "Installing Docker..."
  local old=(docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate
    docker-logrotate docker-selinux docker-engine-selinux docker-engine)
  local installed=()
  for pkg in "${old[@]}"; do
    rpm -q "$pkg" &>/dev/null && installed+=("$pkg")
  done
  if [ ${#installed[@]} -ne 0 ]; then
    dnf remove -y --noautoremove "${installed[@]}"
  fi

  install_packages dnf-plugins-core
  dnf config-manager addrepo --overwrite --from-repofile=https://download.docker.com/linux/fedora/docker-ce.repo
  install_packages docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  usermod -aG docker "$ACTUAL_USER"
  enable_service docker containerd
}

# auto-cpufreq replaces tuned/power-profiles-daemon; its installer is interactive
install_auto_cpufreq() {
  if skip_if_container "auto-cpufreq (systemd daemon)"; then
    return 0
  fi
  if [ -n "${NONINTERACTIVE:-}" ]; then
    color_echo "yellow" "skipped: auto-cpufreq installer is interactive"
    return 0
  fi
  local dir="${TEMP_DIR}/auto-cpufreq"
  if [ ! -d "$dir" ]; then
    as_user git clone --depth 1 https://github.com/AdnanHodzic/auto-cpufreq.git "$dir"
  fi
  echo -e "Please select the \"i\" option to install when the installer prompts"
  (cd "$dir" && ./auto-cpufreq-installer)
  auto-cpufreq --install
}

update_firmware() {
  if skip_if_container "fwupd firmware updates"; then
    return 0
  fi
  color_echo "yellow" "Checking for firmware updates..."
  install_packages fwupd
  fwupdmgr refresh --force
  fwupdmgr get-updates || true # exits non-zero when there is nothing to update
  fwupdmgr update -y --no-reboot-check || true
}
