#!/usr/bin/env bash
# shellcheck disable=SC2016 # snippets expand in the user's shell
# language toolchains; sourced by run.sh. user-level tools install as $ACTUAL_USER

install_lang_packages() {
  install_packages "${LANG_TOOLS[@]}"
}

install_java() {
  # azul zulu repo (the zulu-repo rpm has no digest and rpm 6 refuses it)
  rpm --import https://repos.azul.com/azul-repo.key
  cat >/etc/yum.repos.d/zulu.repo <<'EOF'
[zulu]
name=Azul Zulu
baseurl=https://repos.azul.com/zulu/rpm
enabled=1
gpgcheck=1
gpgkey=https://repos.azul.com/azul-repo.key
EOF
  install_packages "${JAVA_PACKAGE}"
}

install_rust() {
  install_packages gcc curl
  # dotfiles source ~/.cargo/env, so rustup doesn't need to edit rc files
  as_user_sh '
    if ! command -v rustup >/dev/null; then
      curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
    fi
  '
  for crate in "${CARGO_CRATES[@]}"; do
    as_user_sh "cargo install --list | grep -q '^${crate} ' || cargo install --locked ${crate}"
  done
}

install_node() {
  install_packages curl jq

  # nvm isn't `set -e` safe, so this snippet checks results explicitly
  as_user bash -c "${USER_ENV}"'
    if [ ! -s "$NVM_DIR/nvm.sh" ]; then
      tag=$(curl -fsSL https://api.github.com/repos/nvm-sh/nvm/releases/latest | jq -r .tag_name)
      if [ -z "$tag" ] || [ "$tag" = null ]; then tag=master; fi
      mkdir -p "$NVM_DIR"
      curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${tag}/install.sh" | PROFILE=/dev/null bash || exit 1
      . "$NVM_DIR/nvm.sh"
    fi
    # only the first time: later runs would install each new lts and move default
    [ "$(nvm version default)" != N/A ] || { nvm install --lts && nvm alias default "lts/*"; }
  '

  # pnpm standalone into $PNPM_HOME; the installer's `pnpm setup` edits the
  # shell rc, so give it a throwaway HOME (.zshrc already sets PNPM_HOME)
  as_user_sh '
    if ! command -v pnpm >/dev/null; then
      tmp_home=$(mktemp -d)
      trap "rm -rf \"$tmp_home\"" EXIT
      curl -fsSL https://get.pnpm.io/install.sh | HOME="$tmp_home" SHELL=/bin/bash sh -
    fi
  '
  # only the missing globals, so a re-run doesn't upgrade or relink the rest
  as_user_sh "pkgs='${PNPM_GLOBALS[*]}'"'
    # pnpm 11+ keeps each global in its own dir, so ask pnpm rather than `pnpm root -g`
    installed=$(pnpm ls -g --depth=0 --parseable)
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

install_go_tools() {
  install_packages golang
  local tool bin
  for tool in "${GO_TOOLS[@]}"; do
    # the binary is named after the last path element (none of these end in /vN)
    bin="${tool%@*}"
    bin="${bin##*/}"
    if [ -x "${ACTUAL_HOME}/go/bin/${bin}" ]; then
      echo "go tool already installed: ${bin}"
      continue
    fi
    as_user_sh "go install ${tool}"
  done
}

install_lua() {
  # compat-lua (5.1) matches neovim's luajit; luarocks itself runs on lua 5.4.
  # luasocket comes from the lua-socket rpm: `luarocks install` as root would
  # overwrite rpm-owned files in /usr
  install_packages luarocks lua-devel lua-socket compat-lua compat-lua-devel gcc
}

install_python() {
  install_packages python3-pip python3-devel python3-neovim python3-virtualenv pipx "${PYENV_DEPS[@]}"
  for tool in "${PIPX_TOOLS[@]}"; do
    as_user_sh "pipx list --short 2>/dev/null | grep -q '^${tool} ' || pipx install ${tool}"
  done

  # pyenv
  as_user_sh '[ -d "$HOME/.pyenv" ] || curl -fsSL https://pyenv.run | bash'
}

install_ruby() {
  install_packages ruby ruby-devel gcc make redhat-rpm-config
  for gem in "${GEMS[@]}"; do
    as_user_sh "gem list -i '^${gem}\$' >/dev/null || gem install ${gem}"
  done
}

install_homebrew() {
  if [ -x /home/linuxbrew/.linuxbrew/bin/brew ]; then
    echo "homebrew already installed"
    return 0
  fi
  install_packages procps-ng curl file git gcc make
  # pre-create the prefix so the installer doesn't need sudo as the user
  mkdir -p /home/linuxbrew/.linuxbrew
  chown -R "${ACTUAL_USER}:" /home/linuxbrew
  as_user_sh 'NONINTERACTIVE=1 bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
}
