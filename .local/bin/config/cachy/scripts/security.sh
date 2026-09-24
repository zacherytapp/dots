#!/usr/bin/env bash
# Firewall, fail2ban, network privacy, ssh hardening, mDNS and keys.

step_firewall() {
  # rules are written to /etc/ufw even while ufw is inactive
  ufw default deny incoming
  ufw default allow outgoing
  ufw limit 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  if [ -n "$LOCAL_IP" ]; then
    ufw allow from "$LOCAL_IP"
  fi

  skip_in_container "ufw enable" && return 0
  ufw --force enable
  enable_service ufw.service
}

step_fail2ban() {
  # `enable --now` leaves a running fail2ban alone, so restart it when jail.local changes
  local changed=0
  if ! cmp -s "$SCRIPT_DIR/config/jail.local" /etc/fail2ban/jail.local; then
    install -Dm644 "$SCRIPT_DIR/config/jail.local" /etc/fail2ban/jail.local
    changed=1
  fi
  enable_service fail2ban.service
  if [ "$changed" -eq 1 ] && ! is_container; then
    systemctl restart fail2ban.service
  fi
}

step_network() {
  # random MAC per connection on wifi and ethernet
  install -d /etc/NetworkManager/conf.d
  cat >/etc/NetworkManager/conf.d/randomize_mac_address.conf <<'EOF'
[connection-mac-randomization]
wifi.cloned-mac-address=random
ethernet.cloned-mac-address=random
EOF

  # sshd_config includes sshd_config.d/*.conf ahead of its own settings
  local sshd_conf=/etc/ssh/sshd_config.d/10-hardening.conf
  if [ "$(cat "$sshd_conf" 2>/dev/null)" != "PermitRootLogin no" ]; then
    install -d /etc/ssh/sshd_config.d
    echo "PermitRootLogin no" >"$sshd_conf"
    # try-: only reloads an sshd that is already running
    skip_in_container "reload sshd" || systemctl try-reload-or-restart sshd.service
  fi
}

step_discovery() {
  # resolve .local hostnames through avahi, see wiki.archlinux.org/title/Avahi
  local nsconf="/etc/nsswitch.conf"
  if ! grep -q '^hosts:.*mdns_minimal' "$nsconf"; then
    if grep -q '^hosts:.* resolve' "$nsconf"; then
      sed -i '/^hosts:/s/ resolve/ mdns_minimal [NOTFOUND=return] resolve/' "$nsconf"
    else
      sed -i '/^hosts:/s/ dns/ mdns_minimal [NOTFOUND=return] dns/' "$nsconf"
    fi
  fi
  grep '^hosts:' "$nsconf"
  enable_service avahi-daemon.service
}

step_keys() {
  if [ -z "$USER_NAME" ] || [ -z "$USER_EMAIL" ]; then
    # skip like fedora/ubuntu, so an unattended run without them still passes
    print_warning "skipped: USER_NAME/USER_EMAIL not set, not generating keys"
    return 0
  fi

  # <email> is an exact match, a bare email matches substrings
  if ! as_user gpg --list-secret-keys "<$USER_EMAIL>" &>/dev/null; then
    as_user gpg --batch --full-generate-key <<EOF
%no-protection
Key-Type: rsa
Key-Length: 4096
Subkey-Type: rsa
Subkey-Length: 4096
Name-Real: ${USER_NAME}
Name-Email: ${USER_EMAIL}
Expire-Date: 0
%commit
EOF
  fi

  if [ ! -f "$ACTUAL_HOME/.password-store/.gpg-id" ]; then
    local gpg_key
    gpg_key=$(as_user gpg --list-secret-keys --with-colons "<$USER_EMAIL>" | awk -F: '/^sec/ {print $5; exit}')
    if [ -z "$gpg_key" ]; then
      print_error "no gpg secret key for $USER_EMAIL"
      return 1
    fi
    as_user pass init "$gpg_key"
  fi

  if [ ! -f "$ACTUAL_HOME/.ssh/id_ed25519" ]; then
    as_user install -d -m 700 "$ACTUAL_HOME/.ssh"
    as_user ssh-keygen -t ed25519 -C "${USER_NAME} <${USER_EMAIL}>" -f "$ACTUAL_HOME/.ssh/id_ed25519" -N "" -q
  fi

  # ControlMaster sockets for ~/.ssh/config's ControlPath
  as_user install -d -m 700 "$ACTUAL_HOME/.ssh" "$ACTUAL_HOME/.ssh/control"
}
