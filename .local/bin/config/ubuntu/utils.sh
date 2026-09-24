#!/usr/bin/env bash
# shellcheck disable=SC2034 # variables here are consumed by the scripts that source this file

export DEBIAN_FRONTEND=noninteractive

ACTUAL_USER="${SUDO_USER:-$(id -un)}"
ACTUAL_HOME=$(getent passwd "$ACTUAL_USER" | cut -d: -f6)
LOG_FILE="/var/log/ubuntu_setup.log"

FAILED_STEPS=()

color_echo() {
  local color="$1"
  local text="$2"
  case "$color" in
  "red") echo -e "\033[0;31m$text\033[0m" ;;
  "green") echo -e "\033[0;32m$text\033[0m" ;;
  "yellow") echo -e "\033[1;33m$text\033[0m" ;;
  "blue") echo -e "\033[0;34m$text\033[0m" ;;
  *) echo "$text" ;;
  esac
}

get_timestamp() {
  date +"%Y-%m-%d %H:%M:%S"
}

log_message() {
  local message="$1"
  echo "$(get_timestamp) - $message" | tee -a "$LOG_FILE"
}

# only prompt when a human is there to answer
can_prompt() {
  [ "${NONINTERACTIVE:-0}" != "1" ] && [ -t 0 ]
}

# prompt_var <VAR> <question> <default>
prompt_var() {
  local var="$1" question="$2" default="$3"
  if [ -z "${!var:-}" ]; then
    if can_prompt; then
      read -r -p "$question " "${var?}"
    fi
    if [ -z "${!var:-}" ]; then
      printf -v "$var" '%s' "$default"
    fi
  fi
  export "${var?}"
}

load_config() {
  prompt_var USER_NAME "what is your full name (for git/gpg)?" ""
  prompt_var USER_EMAIL "what is your email (for git/gpg)?" ""
  prompt_var SETUP_HOSTNAME "what should the hostname be? [behemoth]" "behemoth"
  prompt_var LOCAL_IP "what is the local ip range to allow through ufw (e.g. 192.168.1.0/24)?" ""
}

is_container() {
  if command -v systemd-detect-virt &>/dev/null && systemd-detect-virt --container --quiet; then
    return 0
  fi
  [ -f /.dockerenv ] || [ -f /run/.containerenv ]
}

# skip_in_container <what> -- returns 0 (and logs) when the caller should skip
skip_in_container() {
  if is_container; then
    color_echo "yellow" "skipped: container ($1)"
    return 0
  fi
  return 1
}

# run a command as the real user with their HOME
as_user() {
  sudo -u "$ACTUAL_USER" -H "$@"
}

# run a bash snippet as the real user with the user-level toolchains on PATH
# shellcheck disable=SC2016 # expanded by the user shell
as_user_sh() {
  as_user bash -c '
    export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$HOME/go/bin:/usr/local/go/bin:$PATH"
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    export PNPM_HOME="$HOME/.local/share/pnpm"
    export PATH="$PNPM_HOME/bin:$PNPM_HOME:$PATH"
    '"$1"
}

is_pkg_installed() {
  dpkg-query -W -f='${Status}' "$1" 2>/dev/null | grep -q "install ok installed"
}

apt_update() {
  apt-get update -q
}

install_packages() {
  local to_install=()

  for pkg in "$@"; do
    if ! is_pkg_installed "$pkg"; then
      to_install+=("$pkg")
    fi
  done

  if [ ${#to_install[@]} -eq 0 ]; then
    echo "all packages already installed"
    return 0
  fi

  echo "Installing: ${to_install[*]}"
  apt-get install -y -q "${to_install[@]}"
}

# add_apt_repo <name> <key url> <uris> <suites> <components> [arch]
# writes /etc/apt/keyrings/<name>.gpg and /etc/apt/sources.list.d/<name>.sources
add_apt_repo() {
  local name="$1" key_url="$2" uris="$3" suites="$4" components="$5" arch="${6:-$(dpkg --print-architecture)}"
  local keyring="/etc/apt/keyrings/${name}.gpg"

  install -d -m 0755 /etc/apt/keyrings
  local tmp_key
  tmp_key=$(mktemp)
  curl -fsSL "$key_url" -o "$tmp_key"
  # vendors ship either ascii-armored or binary keys
  if grep -q -- "-----BEGIN PGP" "$tmp_key"; then
    gpg --dearmor --yes -o "$keyring" "$tmp_key"
  else
    install -m 0644 "$tmp_key" "$keyring"
  fi
  rm -f "$tmp_key"
  chmod 0644 "$keyring"

  cat >"/etc/apt/sources.list.d/${name}.sources" <<EOF
Types: deb
URIs: ${uris}
Suites: ${suites}
Components: ${components}
Architectures: ${arch}
Signed-By: ${keyring}
EOF
}

# latest_github_tag <owner/repo> -- follows the releases/latest redirect (no API rate limit)
latest_github_tag() {
  curl -fsSI "https://github.com/$1/releases/latest" |
    awk -F/ 'tolower($0) ~ /^location:/ {print $NF}' | tr -d '\r'
}

backup_file() {
  local file="$1"
  if [ -f "$file" ] && [ ! -f "$file.bak" ]; then
    cp "$file" "$file.bak"
    color_echo "green" "Backed up $file"
  fi
}

# run_step <name> <function> -- runs a step, records failures and keeps going
run_step() {
  local name="$1" fn="$2"
  color_echo "blue" "==> [$name] starting"
  log_message "step $name: start"
  # errexit is ignored inside an `if` condition, so run the subshell on its own
  (
    set -eo pipefail
    "$fn"
  )
  local rc=$?
  if [ "$rc" -eq 0 ]; then
    color_echo "green" "==> [$name] done"
    log_message "step $name: ok"
  else
    color_echo "red" "==> [$name] FAILED"
    log_message "step $name: FAILED"
    FAILED_STEPS+=("$name")
  fi
}

print_summary() {
  echo
  if [ ${#FAILED_STEPS[@]} -eq 0 ]; then
    color_echo "green" "setup complete. all steps succeeded."
    return 0
  fi
  color_echo "red" "setup finished with failed steps: ${FAILED_STEPS[*]}"
  color_echo "red" "see $LOG_FILE and re-run with: sudo $0 ${FAILED_STEPS[*]}"
  return 1
}

prompt_reboot() {
  if can_prompt && ! is_container; then
    read -r -p "It is time to reboot the machine. Would you like to do it now? (y/n): " choice
    if [[ $choice == [yY] ]]; then
      color_echo "green" "Rebooting..."
      reboot
    fi
  fi
  color_echo "yellow" "you may want to reboot your system."
}
