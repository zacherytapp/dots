#!/usr/bin/env bash

ACTUAL_HOME=$(eval echo ~$SUDO_USER)
cd $ACTUAL_HOME

# jdk
yum install -y https://cdn.azul.com/zulu/bin/zulu-repo-1.0.0-1.noarch.rpm
curl -O https://cdn.azul.com/zulu/bin/zulu-repo-1.0.0-1.noarch.rpm
rpm --import https://www.azul.com/wp-content/uploads/2021/05/0xB1998361219BD9C9.txt
yum install zulu21-jdk -y

# install rust
curl https://sh.rustup.rs -sSf | sh -s -- -y
cargo install viu --no-confirm

NVM_REPO="https://api.github.com/repos/nvm-sh/nvm/releases/latest"
LATEST_TAG=""

cargo install tree-sitter-cli

## install NVM
export NVM_DIR="${ACTUAL_HOME}/.nvm"
if ! [ -d "${NVM_DIR}" ]; then
  mkdir "${NVM_DIR}"
  RESP_BODY=$(curl -s -L --connect-timeout 5 --max-time 10 -w "%{http_code}" "${NVM_REPO}" -o /tmp/github_api_response_$$)
  LATEST_TAG=$(curl -s -L --connect-timeout 5 --max-time 10 "${NVM_REPO}" | jq -r '.tag_name')
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/${LATEST_TAG}/install.sh | bash
  source $NVM_DIR/nvm.sh
  nvm install node -g
fi

# install pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -
export PNPM_HOME="/root/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

pnpm install -g @salesforce/cli neovim sql-formatter @fsouza/prettierd markdownlint-cli

GO_VERSION="1.24.3"
cd ${ACTUAL_HOME}

wget https://storage.googleapis.com/golang/go${GO_VERSION}.linux-amd64.tar.gz
tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
go install golang.org/x/tools/cmd/goimports@latest
go install github.com/nsf/gocode@latest
go install mvdan.cc/sh/v3/cmd/shfmt@latest
go install github.com/a-h/templ/cmd/templ@latest

# install luarocks - compat-lua-devel must be installed
wget https://luarocks.org/releases/luarocks-3.11.1.tar.gz
tar zxpf luarocks-3.11.1.tar.gz
cd luarocks-3.11.1
./configure && make && sudo make install
luarocks install luasocket

cd "${ACTUAL_HOME}/config"

# install pyenv
curl https://pyenv.run | bash

# isntall linuxbrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# ruby
gem install neovim

# install slack
wget https://slack.com/downloads/instructions/linux?ddl=1 &
build=rpm
