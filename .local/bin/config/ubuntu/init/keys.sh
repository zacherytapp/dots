#!/usr/bin/env bash
# gpg key (for pass) and ssh key, generated as the real user

configure_keys() {
  if [ -z "${USER_NAME}" ] || [ -z "${USER_EMAIL}" ]; then
    color_echo "yellow" "skipped: USER_NAME/USER_EMAIL not set, not generating keys"
    return 0
  fi

  # generate gpg key (<email> is an exact match, a bare email matches substrings)
  if ! as_user gpg --list-secret-keys "<${USER_EMAIL}>" &>/dev/null; then
    as_user gpg --batch --full-generate-key <<KEY
%no-protection
Key-Type: rsa
Key-Length: 4096
Subkey-Type: rsa
Subkey-Length: 4096
Name-Real: ${USER_NAME}
Name-Email: ${USER_EMAIL}
Expire-Date: 0
%commit
KEY
  fi

  local gpg_key
  gpg_key=$(as_user gpg --list-secret-keys --with-colons "<${USER_EMAIL}>" | awk -F: '/^sec/ {print $5; exit}')
  if [ -z "$gpg_key" ]; then
    color_echo "red" "Error: Could not find the GPG key ID."
    return 1
  fi
  if [ ! -f "${ACTUAL_HOME}/.password-store/.gpg-id" ]; then
    as_user pass init "$gpg_key"
  fi

  # ssh key generation
  if [ ! -f "${ACTUAL_HOME}/.ssh/id_ed25519" ]; then
    as_user mkdir -p "${ACTUAL_HOME}/.ssh"
    as_user chmod 700 "${ACTUAL_HOME}/.ssh"
    as_user ssh-keygen -t ed25519 -C "${USER_NAME} <${USER_EMAIL}>" -f "${ACTUAL_HOME}/.ssh/id_ed25519" -N "" -q
  fi
}
