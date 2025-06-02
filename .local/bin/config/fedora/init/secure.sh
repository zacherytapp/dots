#!/usr/bin/env bash
#-----------------------
#--Required Packages-
#-ufw
#-fail2ban

# --- Setup UFW rules
ufw limit 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw default deny incoming
ufw default allow outgoing
ufw enable

# --- PREVENT IP SPOOFS
cat <<EOF >/etc/host.conf
order bind,hosts
multi on
EOF

# --- Enable fail2ban
cp ./init/jail.local /etc/fail2ban/
systemctl enable fail2ban
systemctl start fail2ban

echo "listening ports"
netstat -tunlp
