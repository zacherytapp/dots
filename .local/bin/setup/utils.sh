#!/usr/bin/env bash

USER_EMAIL=""
USER_NAME=""
USER_DIR=""

if [ -z "${USER_EMAIL}" ]; then;
  echo "please ensure user email is entered"
  echo "what is the user email?"
  read USER_EMAIL
fi

if [ -z "${USER_NAME}" ]; then;
  echo "please ensure user name is entered"
  echo "what is the user name?"
  read USER_NAME
fi

if [ -z "${USER_DIR}" ]; then;
  echo "please ensure user directory is entered"
  echo "what is the user dir?"
  read USER_DIR
fi

is_pkg_installed() {
  rpm -q "$1" &> /dev/null
}

is_grp_installed() {
  dnf group list installed ids -q | grep -Fxq "$1" &> /dev/null
}

install_packages() {
  local items_to_process=("$@")
  local to_install=()

  for item in "${items_to_process[@]}"; do
    if ! is_pkg_installed "$item" && ! is_grp_installed "$item"; then
      to_install+=("$item")
    fi
  done

  if [ ${#to_install[@]} -ne 0 ]; then
    echo "Installing: ${to_install[*]}"
    if sudo dnf install --skip-unavailable -y "${to_install[@]}"; then
      echo "Successfully installed: ${to_install[*]}"
    else
      echo "Error installing: ${to_install[*]}" >&2
    fi
  else
    echo "All specified packages and groups are already installed or no items to install."
  fi
}

get_timestamp() {
    date +"%Y-%m-%d %H:%M:%S"
}

log_message() {
    local message="$1"
    echo "$(get_timestamp) - $message" | tee -a "$LOG_FILE"
}

handle_error() {
    local exit_code=$?
    local message="$1"
    if [ $exit_code -ne 0 ]; then
        color_echo "red" "ERROR: $message"
        exit $exit_code
    fi
}

prompt_reboot() {
    sudo -u $ACTUAL_USER bash -c 'read -p "It is time to reboot the machine. Would you like to do it now? (y/n): " choice; [[ $choice == [yY] ]]'
    if [ $? -eq 0 ]; then
        color_echo "green" "Rebooting..."
        reboot
    else
        color_echo "red" "Reboot canceled."
    fi
}

backup_file() {
    local file="$1"
    if [ -f "$file" ]; then
        cp "$file" "$file.bak"
        handle_error "Failed to backup $file"
        color_echo "green" "Backed up $file"
    fi
}

color_echo() {
    local color="$1"
    local text="$2"
    case "$color" in
        "red")     echo -e "\033[0;31m$text\033[0m" ;;
        "green")   echo -e "\033[0;32m$text\033[0m" ;;
        "yellow")  echo -e "\033[1;33m$text\033[0m" ;;
        "blue")    echo -e "\033[0;34m$text\033[0m" ;;
        *)         echo "$text" ;;
    esac
}
