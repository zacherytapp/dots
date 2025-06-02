#!/usr/bin/env bash

# isntall neovim
NVIM_DIR="$ACTUAL_HOME/temp/neovim"
if ! [ -d "${NVIM_DIR}" ]; then
  git clone https://github.com/neovim/neovim "${NVIM_DIR}"
  cd "${NVIM_DIR}" && make CMAKE_BUILD_TYPE=RelWithDebInfo
  sudo make install
  cd ${ACTUAL_HOME}
fi

## install 1Password
sudo rpm --import https://downloads.1password.com/linux/keys/1password.asc
sudo sh -c 'echo -e "[1password]\nname=1Password Stable Channel\nbaseurl=https://downloads.1password.com/linux/rpm/stable/\$basearch\nenabled=1\ngpgcheck=1\nrepo_gpgcheck=1\ngpgkey=\"https://downloads.1password.com/linux/keys/1password.asc\"" > /etc/yum.repos.d/1password.repo'
sudo dnf install 1password -y

TPM_DIR="${ACTUAL_HOME}.tmux/plugins/tpm"

# Check if TPM is already installed
if [ -d "$TPM_DIR" ]; then
  echo "TPM is already installed in $TPM_DIR"
else
  echo "Installing Tmux Plugin Manager (TPM)..."
  git clone https://github.com/tmux-plugins/tpm $TPM_DIR
fi

# tmux new-session -d -s tpm_install_session
# tmux send-keys -t tpm_install_session C-s "I" C-m
# tmux attach -t tpm_install_session

# install lazygit
sudo dnf copr enable atim/lazygit -y
sudo dnf install lazygit -y

# isntall ghostty
dnf copr enable pgdev/ghostty -y
dnf install ghostty

# install oh-my-zsh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
chsh -s $(which zsh) $ACTUAL_USER
export ZSH="${ACTUAL_HOME}/.oh-my-zsh"

git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-${ACTUAL_HOME}/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
echo "bindkey '^ ' autosuggest-accept" >>$ZSH_CUSTOM/autosuggestion-settings.zsh
source $ZSH_CUSTOM/autosuggestion-settings.zsh
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-${ACTUAL_HOME}/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting

# install necessary pip items
pip install black neovim
sudo pip install virutalenv

# install oh-my-zsh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
chsh -s $(which zsh) $ACTUAL_USER
export ZSH=~/.oh-my-zsh
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
