#!/usr/bin/env bash
# firewall (ufw), fail2ban and host.conf hardening

configure_security() {
  install_packages ufw fail2ban

  # --- Setup UFW rules (these only edit ufw's config until it is enabled)
  ufw limit 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  if [ -n "${LOCAL_IP}" ]; then
    ufw allow from "${LOCAL_IP}"
  fi
  ufw default deny incoming
  ufw default allow outgoing
  if ! skip_in_container "ufw enable"; then
    ufw --force enable
  fi

  # --- PREVENT IP SPOOFS
  cat <<CONF >/etc/host.conf
order hosts,bind
multi on
CONF

  # --- Enable fail2ban
  # `enable --now` leaves a running fail2ban alone, so restart it when jail.local changes
  local changed=0
  if ! cmp -s "${SCRIPT_DIR}/init/jail.local" /etc/fail2ban/jail.local; then
    cp "${SCRIPT_DIR}/init/jail.local" /etc/fail2ban/jail.local
    changed=1
  fi
  if ! skip_in_container "systemctl enable fail2ban"; then
    systemctl enable --now fail2ban
    if [ "$changed" -eq 1 ]; then
      systemctl restart fail2ban
    fi
    echo "listening ports"
    ss -tunlp
  fi
}
