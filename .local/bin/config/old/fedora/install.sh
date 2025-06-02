#!/usr/bin/env bash

set -e

nvmRepo="https://api.github.com/repos/nvm-sh/nvm/releases/latest"
latestTag=""
scrDir=$(dirname "$(realpath "$0")")
source "${scrDir}/../global_fn.sh"
if [ $? -ne 0 ]; then
    echo "Error: unable to source global_fn.sh..."
    exit 1
fi

cd $HOME

sudo dnf update && sudo dnf upgrade -y
sudo dnf curl jq -y

# generate ssh key

# clone neovim
git clone git clone https://github.com/neovim/neovim cloneDir

# install NVM
respBody=$(curl -s -L --connect-timeout 5 --max-time 10 -w "%{http_code}" "${api_url}" -o /tmp/github_api_response_$$)
latestTag=$(curl -s -L --connect-timeout 5 --max-time 10 "${nvmRepo}" | jq -r '.tag_name')
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v${latestTag}/install.sh | bash

## Install 1Password
sudo rpm --import https://downloads.1password.com/linux/keys/1password.asc && \
sudo sh -c 'echo -e "[1password]\nname=1Password Stable Channel\nbaseurl=https://downloads.1password.com/linux/rpm/stable/\$basearch\nenabled=1\ngpgcheck=1\nrepo_gpgcheck=1\ngpgkey=\"https://downloads.1password.com/linux/keys/1password.asc\"" > /etc/yum.repos.d/1password.repo' && \
sudo dnf install 1password -y
