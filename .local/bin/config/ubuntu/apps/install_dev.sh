#!/usr/bin/env bash
# editor, shell, terminal tooling and 1password

# build neovim's latest stable release from source
install_neovim() {
  local nvim_dir="${ACTUAL_HOME}/temp/neovim"

  install_packages "${NEOVIM_PRE[@]}"
  as_user mkdir -p "${ACTUAL_HOME}/temp"
  if [ ! -d "${nvim_dir}/.git" ]; then
    as_user git clone --depth 1 --branch stable https://github.com/neovim/neovim "${nvim_dir}"
  else
    as_user git -C "${nvim_dir}" fetch --depth 1 --force origin tag stable
    as_user git -C "${nvim_dir}" checkout --force stable
  fi
  as_user make -C "${nvim_dir}" CMAKE_BUILD_TYPE=RelWithDebInfo
  make -C "${nvim_dir}" install
}

install_1password() {
  color_echo "yellow" "Installing 1Password..."
  add_apt_repo 1password https://downloads.1password.com/linux/keys/1password.asc \
    https://downloads.1password.com/linux/debian/amd64 stable main amd64

  # debsig policy so dpkg can verify the package signature
  install -d /etc/debsig/policies/AC2D62742012EA22 /usr/share/debsig/keyrings/AC2D62742012EA22
  curl -fsSL https://downloads.1password.com/linux/debian/debsig/1password.pol \
    -o /etc/debsig/policies/AC2D62742012EA22/1password.pol
  curl -fsSL https://downloads.1password.com/linux/keys/1password.asc |
    gpg --dearmor --yes -o /usr/share/debsig/keyrings/AC2D62742012EA22/debsig.gpg

  apt_update
  install_packages 1password 1password-cli
  # the package adds its own 1password.list; keep only our .sources entry
  rm -f /etc/apt/sources.list.d/1password.list
}

# oh-my-zsh, plugins, tpm and zsh as the login shell
install_shell() {
  local zsh_custom="${ACTUAL_HOME}/.oh-my-zsh/custom"

  if [ ! -d "${ACTUAL_HOME}/.oh-my-zsh" ]; then
    as_user sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended --keep-zshrc
  fi

  if [ ! -d "${zsh_custom}/plugins/zsh-autosuggestions" ]; then
    as_user git clone https://github.com/zsh-users/zsh-autosuggestions "${zsh_custom}/plugins/zsh-autosuggestions"
  fi
  as_user sh -c "echo \"bindkey '^ ' autosuggest-accept\" > '${zsh_custom}/autosuggestion-settings.zsh'"
  if [ ! -d "${zsh_custom}/plugins/zsh-syntax-highlighting" ]; then
    as_user git clone https://github.com/zsh-users/zsh-syntax-highlighting.git "${zsh_custom}/plugins/zsh-syntax-highlighting"
  fi

  # tmux plugin manager
  if [ ! -d "${ACTUAL_HOME}/.tmux/plugins/tpm" ]; then
    as_user git clone https://github.com/tmux-plugins/tpm "${ACTUAL_HOME}/.tmux/plugins/tpm"
  fi

  if [ "$(getent passwd "$ACTUAL_USER" | cut -d: -f7)" != "$(command -v zsh)" ]; then
    chsh -s "$(command -v zsh)" "$ACTUAL_USER" || skip_in_container "chsh"
  fi

  # ubuntu ships fd and bat as fdfind and batcat
  as_user mkdir -p "${ACTUAL_HOME}/.local/bin"
  as_user ln -sf /usr/bin/fdfind "${ACTUAL_HOME}/.local/bin/fd"
  as_user ln -sf /usr/bin/batcat "${ACTUAL_HOME}/.local/bin/bat"
}

install_python_tools() {
  as_user pipx ensurepath
  as_user pipx install black
  as_user pipx install virtualenv

  # pyenv
  if [ ! -d "${ACTUAL_HOME}/.pyenv" ]; then
    as_user bash -c 'curl -fsSL https://pyenv.run | bash'
  fi
}
