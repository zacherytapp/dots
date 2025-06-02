#!/bin/bash

USER_EMAIL=""
USER_NAME=""
USER_DIR=""
LOCAL_IP=""
ACTUAL_USER=$SUDO_USER
ACTUAL_HOME=$(eval echo ~$SUDO_USER)
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)

LOG_FILE="$SCRIPT_DIR/simple_hyprland_install.log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

if [ -z "${USER_EMAIL}" ]; then
  echo "please ensure user email is entered"
  echo "what is the user email?"
  read USER_EMAIL
fi

if [ -z "${USER_NAME}" ]; then
  echo "please ensure user name is entered"
  echo "what is the user name?"
  read USER_NAME
fi

if [ -z "${USER_DIR}" ]; then
  echo "please ensure user directory is entered"
  echo "what is the user dir?"
  read USER_DIR
fi

if [ -z "${LOCAL_IP}" ]; then
  echo "please ensure user directory is entered"
  echo "what is the local ip range? (192.168.1.0/24)"
  read LOCAL_IP
fi

function check_root {
  if [ "$EUID" -ne 0 ]; then
    print_error "please run as root"
    log_message "script not run as root. Exiting."
    exit 1
  fi

  # Store the original user for later use
  SUDO_USER=$(logname)
  log_message "Original user is $SUDO_USER"
}

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

function print_error {
  echo -e "${RED}$1${NC}"
}

function print_success {
  echo -e "${GREEN}$1${NC}"
}

function print_warning {
  echo -e "${YELLOW}$1${NC}"
}

function print_info {
  echo -e "${BLUE}$1${NC}"
}

function print_bold_blue {
  echo -e "${BLUE}${BOLD}$1${NC}"
}

function log_message {
  echo "$(date): $1" >>"$LOG_FILE"
}

function ask_confirmation {
  while true; do
    read -p "$(print_warning "$1 (y/n): ")" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      log_message "Operation accepted by user."
      return 0 # User confirmed
    elif [[ $REPLY =~ ^[Nn]$ ]]; then
      log_message "Operation cancelled by user."
      print_error "Operation cancelled."
      return 1 # User cancelled
    else
      print_error "Invalid input. Please answer y or n."
    fi
  done
}

is_installed() {
  pacman -Qi "$1" &>/dev/null
}

is_group_installed() {
  pacman -Qg "$1" &>/dev/null
}

install_packages() {
  local packages=("$@")
  local to_install=()

  for pkg in "${packages[@]}"; do
    if ! is_installed "$pkg" && ! is_group_installed "$pkg"; then
      to_install+=("$pkg")
    fi
  done

  if [ ${#to_install[@]} -ne 0 ]; then
    print_info "installing ${to_install[*]}"
    yay -S --noconfirm ${to_install[@]}
  fi
}

function run_command {
  local cmd="$1"
  local description="$2"
  local ask_confirm="${3:-yes}"
  local use_sudo="${4:-yes}"

  local full_cmd=""
  if [[ "$use_sudo" == "no" ]]; then
    full_cmd="sudo -u $SUDO_USER $cmd"
  else
    full_cmd="$cmd"
  fi

  log_message "Attempting to run: $description"
  print_info "\nCommand: $full_cmd"
  if [[ "$ask_confirm" == "yes" ]]; then
    if ! ask_confirmation "$description"; then
      log_message "$description was skipped by user choice."
      return 1
    fi
  else
    print_info "\n$description"
  fi

  while ! eval "$full_cmd"; do
    print_error "Command failed."
    log_message "Command failed: $cmd"
    if [[ "$ask_confirm" == "yes" ]]; then
      if ! ask_confirmation "Retry $description?"; then
        print_warning "$description was not completed."
        log_message "$description was not completed due to failure and user chose not to retry."
        return 1
      fi
    else
      print_warning "$description failed and will not be retried."
      log_message "$description failed and was not retried (auto mode)."
      return 1
    fi
  done

  print_success "$description completed successfully."
  log_message "$description completed successfully."
  return 0
}

function run_script {
  local script="$SCRIPT_DIR/$1"
  local description="$2"
  if ask_confirmation "\nExecute '$description' script"; then
    while ! bash "$script"; do
      print_error "$description script failed."
      if ! ask_confirmation "Retry $description"; then
        return 1 # User chose not to retry
      fi
    done
    print_success "\n$description completed successfully."
  else
    return 1
  fi
}

function check_root {
  if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root"
    log_message "Script not run as root. Exiting."
    exit 1
  fi

  SUDO_USER=$(logname)
  log_message "Original user is $SUDO_USER"
}
