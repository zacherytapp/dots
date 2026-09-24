#!/usr/bin/env bash
# language toolchains; everything under $HOME is installed as the real user

JDK_PACKAGE="zulu25-jdk"
PNPM_GLOBALS=(@salesforce/cli neovim sql-formatter @fsouza/prettierd markdownlint-cli)
GO_TOOLS=(
  golang.org/x/tools/cmd/goimports@latest
  golang.org/x/tools/gopls@latest
  mvdan.cc/sh/v3/cmd/shfmt@latest
  github.com/a-h/templ/cmd/templ@latest
)

# azul zulu jdk (current LTS)
install_java() {
  add_apt_repo zulu https://repos.azul.com/azul-repo.key https://repos.azul.com/zulu/deb stable main
  apt_update
  install_packages "${JDK_PACKAGE}"
}

# re-runs only install what's missing; upgrading is left to the tools
# themselves (rustup update, pnpm update -g, ...)
install_rust() {
  if [ ! -x "${ACTUAL_HOME}/.cargo/bin/rustup" ]; then
    as_user bash -c 'curl --proto "=https" --tlsv1.2 -fsSL https://sh.rustup.rs | sh -s -- -y --no-modify-path'
  fi
  as_user_sh "cargo install --list | grep -q '^viu ' || cargo install --locked viu"
}

# nvm + node lts, then pnpm for global packages
install_node() {
  local nvm_tag
  if [ ! -s "${ACTUAL_HOME}/.nvm/nvm.sh" ]; then
    nvm_tag=$(latest_github_tag nvm-sh/nvm)
    as_user bash -c "curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/${nvm_tag}/install.sh | PROFILE=/dev/null bash"
  fi
  # shellcheck disable=SC2016 # expanded by the user shell
  as_user_sh '[ "$(nvm version default)" != N/A ] || { nvm install --lts && nvm alias default "lts/*"; }'

  # the installer's `pnpm setup` edits the shell rc, so give it a throwaway
  # HOME (the dotfiles already set PNPM_HOME)
  if ! as_user_sh 'command -v pnpm' &>/dev/null; then
    # shellcheck disable=SC2016 # expanded by the user shell
    as_user_sh 'tmp_home=$(mktemp -d); curl -fsSL https://get.pnpm.io/install.sh | HOME="$tmp_home" SHELL=/bin/bash sh -; rc=$?; rm -rf "$tmp_home"; exit $rc'
  fi
  # only the missing globals, so a re-run doesn't upgrade or relink the rest
  # shellcheck disable=SC2016 # expanded by the user shell
  as_user_sh "pkgs='${PNPM_GLOBALS[*]}'"'
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

install_go() {
  if [ ! -x /usr/local/go/bin/go ]; then
    local go_version
    go_version=$(curl -fsSL "https://go.dev/VERSION?m=text" | head -n 1)
    color_echo "yellow" "Installing ${go_version}..."
    curl -fsSL "https://go.dev/dl/${go_version}.linux-$(dpkg --print-architecture).tar.gz" -o "/tmp/${go_version}.tar.gz"
    rm -rf /usr/local/go
    tar -C /usr/local -xzf "/tmp/${go_version}.tar.gz"
    rm -f "/tmp/${go_version}.tar.gz"
  fi

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

# latest luarocks built against lua 5.1 (the version neovim embeds)
install_lua() {
  local tag version build_dir

  if ! command -v luarocks &>/dev/null; then
    tag=$(latest_github_tag luarocks/luarocks)
    version="${tag#v}"
    build_dir=$(mktemp -d)
    curl -fsSL "https://luarocks.org/releases/luarocks-${version}.tar.gz" | tar -xz -C "$build_dir"
    (
      cd "${build_dir}/luarocks-${version}" || exit 1
      ./configure --lua-version=5.1 --with-lua-include=/usr/include/lua5.1
      make
      make install
    )
    rm -rf "$build_dir"
  fi
  luarocks show luasocket &>/dev/null || luarocks install luasocket
}

install_ruby_tools() {
  gem list -i '^neovim$' >/dev/null || gem install neovim
}

# the dotfiles put ~/.juliaup/bin on PATH, so keep the installer out of the rc files
install_julia() {
  if [ ! -x "${ACTUAL_HOME}/.juliaup/bin/juliaup" ]; then
    as_user bash -c 'curl -fsSL https://install.julialang.org | sh -s -- --yes --add-to-path=no'
  fi
}

install_brew() {
  local prefix="/home/linuxbrew/.linuxbrew"
  install_packages build-essential procps curl file git
  if [ ! -x "${prefix}/bin/brew" ]; then
    # homebrew's documented git-clone install; we're already root, so no inner sudo prompt
    install -d -o "$ACTUAL_USER" -g "$(id -gn "$ACTUAL_USER")" /home/linuxbrew "${prefix}" "${prefix}/bin"
    if [ ! -d "${prefix}/Homebrew/.git" ]; then
      as_user git clone --depth 1 https://github.com/Homebrew/brew "${prefix}/Homebrew"
    fi
    as_user ln -sf ../Homebrew/bin/brew "${prefix}/bin/brew"
    as_user "${prefix}/bin/brew" update --force --quiet
  fi
}
