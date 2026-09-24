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

install_rust() {
  if [ ! -x "${ACTUAL_HOME}/.cargo/bin/rustup" ]; then
    as_user bash -c 'curl --proto "=https" --tlsv1.2 -fsSL https://sh.rustup.rs | sh -s -- -y --no-modify-path'
  else
    as_user_sh 'rustup update stable'
  fi
  as_user_sh 'cargo install --locked viu'
}

# nvm + node lts, then pnpm for global packages
install_node() {
  local nvm_tag
  if [ ! -s "${ACTUAL_HOME}/.nvm/nvm.sh" ]; then
    nvm_tag=$(latest_github_tag nvm-sh/nvm)
    as_user bash -c "curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/${nvm_tag}/install.sh | PROFILE=/dev/null bash"
  fi
  as_user_sh 'nvm install --lts && nvm alias default "lts/*"'

  if ! as_user_sh 'command -v pnpm' &>/dev/null; then
    # shellcheck disable=SC2016 # expanded by the user shell
    as_user bash -c 'curl -fsSL https://get.pnpm.io/install.sh | ENV="$HOME/.bashrc" SHELL="$(command -v bash)" sh -'
  fi
  as_user_sh "pnpm add -g ${PNPM_GLOBALS[*]}"
}

install_go() {
  local go_version current=""
  go_version=$(curl -fsSL "https://go.dev/VERSION?m=text" | head -n 1)
  if [ -x /usr/local/go/bin/go ]; then
    current=$(/usr/local/go/bin/go env GOVERSION)
  fi

  if [ "$current" != "$go_version" ]; then
    color_echo "yellow" "Installing ${go_version}..."
    curl -fsSL "https://go.dev/dl/${go_version}.linux-$(dpkg --print-architecture).tar.gz" -o "/tmp/${go_version}.tar.gz"
    rm -rf /usr/local/go
    tar -C /usr/local -xzf "/tmp/${go_version}.tar.gz"
    rm -f "/tmp/${go_version}.tar.gz"
  fi

  local tool
  for tool in "${GO_TOOLS[@]}"; do
    as_user_sh "go install ${tool}"
  done
}

# latest luarocks built against lua 5.1 (the version neovim embeds)
install_lua() {
  local tag version build_dir
  tag=$(latest_github_tag luarocks/luarocks)
  version="${tag#v}"

  if ! command -v luarocks &>/dev/null || ! luarocks --version | grep -q "luarocks ${version}"; then
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
  luarocks install luasocket
}

install_ruby_tools() {
  gem install neovim
}

install_julia() {
  if [ ! -x "${ACTUAL_HOME}/.juliaup/bin/juliaup" ]; then
    as_user bash -c 'curl -fsSL https://install.julialang.org | sh -s -- --yes'
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
