#!/usr/bin/env bash
# firewall, fail2ban and spoofing protection; sourced by run.sh
#--Required Packages-
#-ufw
#-fail2ban

configure_security() {
  install_packages ufw fail2ban iproute

  # --- Setup UFW rules (ufw replaces firewalld)
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

  # --- PREVENT IP SPOOFS
  cat <<EOC >/etc/host.conf
order bind,hosts
multi on
EOC

  # --- Enable fail2ban
  install -m 644 "${SCRIPT_DIR}/init/jail.local" /etc/fail2ban/jail.local
  enable_service fail2ban

  echo "listening ports"
  ss -tunlp
}
