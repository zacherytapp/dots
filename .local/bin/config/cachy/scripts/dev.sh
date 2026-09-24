#!/usr/bin/env bash
# User-level dev tooling: shell, git, rust, node, pmd, tmux, herdr.

step_shell() {
  # oh-my-zsh, powerlevel10k and the zsh plugins come from cachyos-zsh-config
  local zsh_path
  zsh_path=$(command -v zsh)
  if [ "$(getent passwd "$ACTUAL_USER" | cut -d: -f7)" != "$zsh_path" ]; then
    usermod -s "$zsh_path" "$ACTUAL_USER"
  fi
}

step_git() {
  # only fill in what's missing so a stowed ~/.gitconfig is left alone
  as_user git config --global init.defaultBranch >/dev/null ||
    as_user git config --global init.defaultBranch main

  if [ -n "$USER_EMAIL" ]; then
    as_user git config --global user.email >/dev/null ||
      as_user git config --global user.email "$USER_EMAIL"
  fi
  if [ -n "$USER_NAME" ]; then
    as_user git config --global user.name >/dev/null ||
      as_user git config --global user.name "$USER_NAME"
  fi
}

# re-runs only install what's missing; upgrading is left to the tools
# themselves (rustup update, nvm install node, pnpm update -g, ...)
step_rust() {
  # .zshrc sources ~/.cargo/env, which only the rustup.rs installer creates
  if [ ! -x "$ACTUAL_HOME/.cargo/bin/rustup" ]; then
    as_user_sh "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path"
  fi
  # no-op once they're installed
  as_user_sh "rustup component add --toolchain stable ${RUSTUP_COMPONENTS[*]}"
}

# shellcheck disable=SC2016 # snippets expand in the user shell
step_node() {
  # .zshrc looks in \$XDG_CONFIG_HOME/nvm, falling back to ~/.nvm
  as_user mkdir -p "$NVM_DIR"
  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    local tag
    tag=$(latest_github_tag nvm-sh/nvm)
    # PROFILE=/dev/null keeps the installer out of the (stowed) shell rc files
    as_user_sh "curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/${tag}/install.sh | PROFILE=/dev/null bash"
  fi
  # -L too: a dangling link would make `ln -s` fail
  if [ ! -e "$ACTUAL_HOME/.nvm" ] && [ ! -L "$ACTUAL_HOME/.nvm" ]; then
    as_user ln -s "$NVM_DIR" "$ACTUAL_HOME/.nvm"
  fi

  as_user_sh '. "$NVM_DIR/nvm.sh" && { [ "$(nvm version default)" != N/A ] || { nvm install node && nvm alias default node; }; }'

  # standalone pnpm into $PNPM_HOME; the installer's `pnpm setup` edits the
  # shell rc, so give it a throwaway HOME (.zshrc already sets PNPM_HOME)
  if [ ! -x "$PNPM_HOME/bin/pnpm" ] && [ ! -x "$PNPM_HOME/pnpm" ]; then
    as_user_sh 'tmp_home=$(mktemp -d) && curl -fsSL https://get.pnpm.io/install.sh | HOME="$tmp_home" SHELL=/bin/bash sh - ; rc=$?; rm -rf "$tmp_home"; exit $rc'
  fi

  # only the missing globals, so a re-run doesn't upgrade or relink the rest
  as_user_sh ". \"\$NVM_DIR/nvm.sh\" && pkgs='${PNPM_GLOBALS[*]}'"'
    # pnpm 11+ keeps each global in its own dir, so ask pnpm rather than `pnpm root -g`
    installed=$(pnpm ls -g --depth=0 --parseable) || exit 1
    missing=""
    for pkg in $pkgs; do
      printf "%s\n" "$installed" | grep -q "/node_modules/$pkg\$" || missing="$missing $pkg"
    done
    if [ -n "$missing" ]; then
      pnpm add -g $missing
    else
      echo "pnpm globals already installed"
    fi
  '
}

step_pmd() {
  if [ -x /opt/pmd/bin/pmd ]; then
    echo "PMD already installed: $(readlink -f /opt/pmd)"
    return 0
  fi

  local tag version
  tag=$(latest_github_tag pmd/pmd)
  version="${tag#pmd_releases/}"
  if [ -z "$version" ]; then
    print_error "could not resolve the latest PMD release"
    return 1
  fi

  local tmp
  tmp=$(mktemp -d)
  curl -fsSL -o "$tmp/pmd.zip" "https://github.com/pmd/pmd/releases/download/${tag}/pmd-dist-${version}-bin.zip"
  unzip -q -o "$tmp/pmd.zip" -d /opt
  rm -rf "$tmp"
  ln -sfn "/opt/pmd-bin-${version}" /opt/pmd
}

step_tmux() {
  # tmux.conf runs ~/.tmux/plugins/tpm/tpm; install plugins with prefix + I
  local tpm_dir="$ACTUAL_HOME/.tmux/plugins/tpm"
  if [ -d "$tpm_dir" ]; then
    echo "tpm already installed in $tpm_dir"
  else
    as_user git clone --depth 1 https://github.com/tmux-plugins/tpm "$tpm_dir"
  fi
}

step_herdr() {
  # installs to ~/.local/bin, which .zshrc already puts on PATH
  if [ -x "$ACTUAL_HOME/.local/bin/herdr" ]; then
    echo "herdr already installed: $(as_user "$ACTUAL_HOME/.local/bin/herdr" --version)"
    return 0
  fi
  as_user mkdir -p "$ACTUAL_HOME/.local/bin"
  as_user_sh "curl -fsSL https://herdr.dev/install.sh | sh"
}
