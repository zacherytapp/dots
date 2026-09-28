#!/usr/bin/env bash

configure_security() {
  install_packages ufw fail2ban iproute

  if skip_if_container "ufw rules and enable (needs netfilter)"; then
    :
  else
    systemctl disable --now firewalld 2>/dev/null || true
    ufw limit 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw default deny incoming
    ufw default allow outgoing
    if [ -n "${LOCAL_IP}" ]; then
      ufw allow from "${LOCAL_IP}"
    fi
    ufw --force enable
    systemctl enable --now ufw
  fi

  cat <<EOC >/etc/host.conf
order bind,hosts
multi on
EOC

  # `enable --now` leaves a running fail2ban alone, so restart it when jail.local changes
  local changed=0
  if ! cmp -s "${SCRIPT_DIR}/init/jail.local" /etc/fail2ban/jail.local; then
    install -m 644 "${SCRIPT_DIR}/init/jail.local" /etc/fail2ban/jail.local
    changed=1
  fi
  enable_service fail2ban
  if [ "$changed" -eq 1 ] && ! is_container; then
    systemctl restart fail2ban
  fi

  echo "listening ports"
  ss -tunlp
}
