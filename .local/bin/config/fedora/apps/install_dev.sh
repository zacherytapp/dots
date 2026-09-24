#!/usr/bin/env bash
# shellcheck disable=SC2016 # snippets expand in the user's shell
# editor, terminal, shell and dev tooling; sourced by run.sh

install_nerd_fonts() {
  install_packages fontconfig curl tar xz
  local font_root="/usr/local/share/fonts/NerdFonts"
  local tmp added=0

  for font in "${NERD_FONTS[@]}"; do
    if [ -d "${font_root}/${font}" ]; then
      echo "Nerd Font already installed: ${font}"
      continue
    fi
    echo "Installing Nerd Font: ${font}"
    tmp=$(mktemp -d)
    # extract to a temp dir first so a failed download never leaves a partial font dir
    if ! curl -fsSL "https://github.com/ryanoasis/nerd-fonts/releases/latest/download/${font}.tar.xz" | tar -xJ -C "$tmp"; then
      rm -rf "$tmp"
      return 1
    fi
    mkdir -p "$font_root"
    mv "$tmp" "${font_root}/${font}"
    chmod -R a+rX "${font_root}/${font}"
    added=1
  done
  if [ "$added" -eq 1 ]; then
    fc-cache -f
  fi
}

# neovim from source; NVIM_REF picks the tag/branch, NVIM_REBUILD=1 forces a rebuild
install_neovim() {
  install_packages "${NEOVIM_PRE[@]}"
  local nvim_dir="${TEMP_DIR}/neovim"
  local ref="${NVIM_REF:-stable}"

  if [ -x /usr/local/bin/nvim ] && [ -z "${NVIM_REBUILD:-}" ]; then
    echo "neovim already installed: $(/usr/local/bin/nvim --version | head -n 1)"
    return 0
  fi

  as_user mkdir -p "${TEMP_DIR}"
  if [ ! -d "${nvim_dir}/.git" ]; then
    as_user git clone --filter=blob:none https://github.com/neovim/neovim "${nvim_dir}"
  fi
  as_user git -C "${nvim_dir}" fetch --force --tags origin "${ref}"
  as_user git -C "${nvim_dir}" checkout --force FETCH_HEAD
  as_user make -C "${nvim_dir}" CMAKE_BUILD_TYPE=RelWithDebInfo
  make -C "${nvim_dir}" install
  # make install leaves root-owned files in the build dir
  chown -R "${ACTUAL_USER}:" "${nvim_dir}"
}

# the 1password rpm rewrites 1password.repo on every install and upgrade, so
# this repo file is only a bootstrap for the first install
install_1password() {
  if is_pkg_installed 1password; then
    echo "1password already installed; its package manages 1password.repo"
    return 0
  fi
  rpm --import https://downloads.1password.com/linux/keys/1password.asc
  cat >/etc/yum.repos.d/1password.repo <<'EOF'
[1password]
name=1Password Stable Channel
baseurl=https://downloads.1password.com/linux/rpm/stable/$basearch
enabled=1
gpgcheck=1
repo_gpgcheck=1
gpgkey=https://downloads.1password.com/linux/keys/1password.asc
EOF
  install_packages 1password
}

install_terminal_tools() {
  # lazygit (atim/lazygit stopped updating; dejan/lazygit tracks releases)
  dnf copr enable -y dejan/lazygit
  install_packages lazygit

  # ghostty
  dnf copr enable -y scottames/ghostty
  install_packages ghostty

  install_packages "${DEV_TOOLS[@]}"
}

install_tpm() {
  local tpm_dir="${ACTUAL_HOME}/.tmux/plugins/tpm"

  if [ -d "$tpm_dir" ]; then
    echo "TPM is already installed in $tpm_dir"
  else
    echo "Installing Tmux Plugin Manager (TPM)..."
    as_user git clone --depth 1 https://github.com/tmux-plugins/tpm "$tpm_dir"
  fi
}

configure_shell() {
  install_packages zsh git curl
  local zsh_custom="${ACTUAL_HOME}/.oh-my-zsh/custom"

  # install oh-my-zsh, keeping any existing (stowed) .zshrc
  if [ ! -d "${ACTUAL_HOME}/.oh-my-zsh" ]; then
    as_user_sh 'RUNZSH=no CHSH=no KEEP_ZSHRC=yes sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended'
  fi

  if [ ! -d "${zsh_custom}/plugins/zsh-autosuggestions" ]; then
    as_user git clone --depth 1 https://github.com/zsh-users/zsh-autosuggestions "${zsh_custom}/plugins/zsh-autosuggestions"
  fi
  if [ ! -d "${zsh_custom}/plugins/zsh-syntax-highlighting" ]; then
    as_user git clone --depth 1 https://github.com/zsh-users/zsh-syntax-highlighting.git "${zsh_custom}/plugins/zsh-syntax-highlighting"
  fi
  if ! grep -qxF "bindkey '^ ' autosuggest-accept" "${zsh_custom}/autosuggestion-settings.zsh" 2>/dev/null; then
    echo "bindkey '^ ' autosuggest-accept" | as_user tee "${zsh_custom}/autosuggestion-settings.zsh" >/dev/null
  fi

  # usermod works without PAM, unlike chsh
  local zsh_path
  zsh_path=$(command -v zsh)
  if [ "$(getent passwd "$ACTUAL_USER" | cut -d: -f7)" != "$zsh_path" ]; then
    usermod -s "$zsh_path" "$ACTUAL_USER"
  fi
}
