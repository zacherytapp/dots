#!/bin/bash

# install some necessary stuff and dev toolchain stuff
# this should be run outside of sudo as it will
# populate in $HOME -- also internet scripts = unsafe

# Get the directory of the current script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "${SCRIPT_DIR}/../utils.sh" ]; then
  print_info "error: utils.sh not found!"
  exit 1
fi

source "${SCRIPT_DIR}/../utils.sh"

sudo pacman -Syyu --noconfirm
sudo pacman -S zsh git curl sed grep --noconfirm --needed

# enable ssh
print_info "enabling sshd"
sudo systemctl enable --now sshd

print_info "Setting hostname..."
hostnamectl set-hostname "${HOSTNAME}"

function configure_git {
  git config --global init.defaultBranch main
  git config --global user.email ${USER_EMAIL}
  git config --global user.name ${USER_NAME}
}

function install_yay {
  if ! command -v yay &>/dev/null; then
    git clone https://aur.archlinux.org/yay.git && cd yay
    makepkg --noconfirm --needed -si && cd ..
    rm -rf yay
  fi
}

function install_rust {
  curl https://sh.rustup.rs -sSf | sh -s -- -y
  source ~/.bash_profile
  cargo install viu stylua --features luajit
}

function install_zsh {
  hash -r
  sudo chsh -s $(which zsh)
  sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended

  git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
  echo "bindkey '^ ' autosuggest-accept" >>$ZSH_CUSTOM/autosuggestion-settings.zsh
  source $ZSH_CUSTOM/autosuggestion-settings.zsh

  git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
}

function install_node {
  export NVM_DIR="${ACTUAL_HOME}/.nvm"
  if ! [ -d "${NVM_DIR}" ]; then
    mkdir "${NVM_DIR}"
    RESP_BODY=$(curl -s -L --connect-timeout 5 --max-time 10 -w "%{http_code}" "${NVM_REPO}" -o /tmp/github_api_response_$$)
    LATEST_TAG=$(curl -s -L --connect-timeout 5 --max-time 10 "${NVM_REPO}" | jq -r '.tag_name')
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/${LATEST_TAG}/install.sh | bash
    source $NVM_DIR/nvm.sh
    nvm install node -g
  fi

  curl -fsSL https://get.pnpm.io/install.sh | sh -
  export PNPM_HOME="/root/.local/share/pnpm"
  export PATH="$PNPM_HOME:$PATH"

  pnpm install -g @salesforce/cli neovim sql-formatter @fsouza/prettierd markdownlint-cli tree-sitter-cli
}

function install_go {
  wget https://storage.googleapis.com/golang/go${GO_VERSION}.linux-amd64.tar.gz
  sudo tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz
  export PATH=$PATH:/usr/local/go/bin
  go install golang.org/x/tools/cmd/goimports@latest
  go install github.com/nsf/gocode@latest
  go install mvdan.cc/sh/v3/cmd/shfmt@latest
  go install github.com/a-h/templ/cmd/templ@latest
}

function install_brew {
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
}

print_info "configuring git..."
configure_git

print_info "checking/installing yay..."
install_yay

print_info "installing rust and rust applications needed"
install_rust

print_info "installing and configuring zsh and oh-my-zsh"
install_zsh

print_info "installing and configuring nvm and and node"
install_node

print_info "installing and configuring golang"
install_go

print_info "installing and brew"
install_brew
