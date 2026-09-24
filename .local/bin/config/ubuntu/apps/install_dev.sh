#!/usr/bin/env bash
# editor, shell, terminal tooling and 1password

# neovim from source; NVIM_REF picks the tag/branch (default stable),
# NVIM_REBUILD=1 rebuilds over an existing install
install_neovim() {
  local nvim_dir="${ACTUAL_HOME}/temp/neovim"
  local ref="${NVIM_REF:-stable}"

  install_packages "${NEOVIM_PRE[@]}"
  if [ -x /usr/local/bin/nvim ] && [ -z "${NVIM_REBUILD:-}" ]; then
    echo "neovim already installed: $(/usr/local/bin/nvim --version | head -n 1)"
    return 0
  fi

  as_user mkdir -p "${ACTUAL_HOME}/temp"
  if [ ! -d "${nvim_dir}/.git" ]; then
    as_user git clone --depth 1 --branch "${ref}" https://github.com/neovim/neovim "${nvim_dir}"
  else
    as_user git -C "${nvim_dir}" fetch --depth 1 --force origin "${ref}"
    as_user git -C "${nvim_dir}" checkout --force FETCH_HEAD
  fi
  as_user make -C "${nvim_dir}" CMAKE_BUILD_TYPE=RelWithDebInfo
  make -C "${nvim_dir}" install
  # make install leaves root-owned files in the build dir
  chown -R "${ACTUAL_USER}:" "${nvim_dir}"
}

install_1password() {
  color_echo "yellow" "Installing 1Password..."
  if ! is_pkg_installed 1password; then
    # debsig policy so dpkg can verify the package signature (postinst keeps it current)
    install -d /etc/debsig/policies/AC2D62742012EA22 /usr/share/debsig/keyrings/AC2D62742012EA22
    curl -fsSL https://downloads.1password.com/linux/debian/debsig/1password.pol \
      -o /etc/debsig/policies/AC2D62742012EA22/1password.pol
    curl -fsSL https://downloads.1password.com/linux/keys/1password.asc |
      gpg --dearmor --yes -o /usr/share/debsig/keyrings/AC2D62742012EA22/debsig.gpg
  fi
  vendor_apt_repo 1password 1password https://downloads.1password.com/linux/keys/1password.asc \
    https://downloads.1password.com/linux/debian/amd64 stable main amd64
  install_packages 1password-cli
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
  local autosuggest="${zsh_custom}/autosuggestion-settings.zsh"
  if ! grep -qxF "bindkey '^ ' autosuggest-accept" "$autosuggest" 2>/dev/null; then
    as_user sh -c "echo \"bindkey '^ ' autosuggest-accept\" > '${autosuggest}'"
  fi
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
  local name target
  for name in fd:fdfind bat:batcat; do
    target="/usr/bin/${name#*:}"
    if [ "$(readlink "${ACTUAL_HOME}/.local/bin/${name%%:*}")" != "$target" ]; then
      as_user ln -sf "$target" "${ACTUAL_HOME}/.local/bin/${name%%:*}"
    fi
  done
}

# the dotfiles put ~/.local/bin on PATH, so no `pipx ensurepath` (it edits the rc files)
install_python_tools() {
  local tool
  for tool in black virtualenv; do
    as_user_sh "pipx list --short 2>/dev/null | grep -q '^${tool} ' || pipx install ${tool}"
  done

  # pyenv
  if [ ! -d "${ACTUAL_HOME}/.pyenv" ]; then
    as_user bash -c 'curl -fsSL https://pyenv.run | bash'
  fi
}
