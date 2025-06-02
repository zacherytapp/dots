#!/usr/bin/env bash

# generate gpg key
gpg --batch --full-generate-key <<EOF
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

# list keys
GPG_KEY=$(gpg --list-secret-keys --keyid-format LONG | grep sec | awk '{print $2}' | head -n 1)
if [ -z "$GPG_KEY" ]; then
  echo "Error: Could not find the GPG key ID."
  exit 1
fi
pass init "$GPG_KEY"

# ssh key generation
ssh-keygen -t ed25519 -b 4096 -C "${USER_NAME} <${USER_EMAIL}>" -f ~/.ssh/id_ed25519 -q
