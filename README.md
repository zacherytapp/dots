# Zakk's Dotfiles

#### Overview

This Mostly used for Salesforce/Javascript development - but trying to use some semi-sane defaults.

#### Prerequisites

1. Nerd Fonts. Dank Mono, Fira Code and Maple Font are ideal

##### Debian/Ubuntu Prerequisites

- `sudo apt install zsh kitty tmux git fzf ripgrep vim ttf-ms-fonts python-dev python3-dev libssl-dev python3-pip gimp flatpak`
- `sudo apt-get install ninja-build gettext cmake unzip curl`

##### Fedora Prerequisites

- `sudo dnf install zsh kitty tmux git unzip fzf ripgrep vim ttf-ms-fonts python-dev python3-dev libssl-dev python3-pip gimp flatpak`
- `sudo dnf -y install ninja-build cmake gcc make unzip gettext curl`

##### Flatpak Install (if Needed)

- `flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo`
- `flatpak update`

##### Install Neovim from Source

See [Neovim Documentation](https://github.com/neovim/neovim/blob/master/INSTALL.md#install-from-source) for more:

- `git clone https://github.com/neovim/neovim`
- `cd neovim && make CMAKE_BUILD_TYPE=RelWithDebInfo`
- `sudo make install`

##### Other Tasks

- [ ] Install Nerd Fonts, DankMono, Fira Code Font and Maple Font
- [ ] [Oh My Zsh](https://github.com/robbyrussell/oh-my-zsh)
  - `sh -c "$(curl -fsSL https://raw.githubusercontent.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"`
- [ ] [Spaceship Prompt](https://github.com/denysdovhan/spaceship-prompt)
  - `git clone https://github.com/denysdovhan/spaceship-prompt.git "$ZSH_CUSTOM/themes/spaceship-prompt"`
  - `ln -s "$ZSH_CUSTOM/themes/spaceship-prompt/spaceship.zsh-theme" "$ZSH_CUSTOM/themes/spaceship.zsh-theme"`
- [ ] [Zsh Autosuggestions](https://github.com/zsh-users/zsh-autosuggestions)
  - `git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions`
  * `echo "bindkey '^ ' autosuggest-accept" >> $ZSH_CUSTOM/autosuggestion-settings.zsh`
  * `source $ZSH_CUSTOM/autosuggestion-settings.zsh`
- [ ] [Zsh Syntax Highlighting](https://github.com/zsh-users/zsh-syntax-highlighting)

  - `git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting`

- [ ] [NVM](https://github.com/nvm-sh/nvm)
  - `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash`
  - `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | zsh`
  - `source ~/.zshrc`
  - `nvm install node -g`
- [ ] Install Zulu17 (Ubuntu)
  - [Zulu17 Download](https://www.azul.com/core-post-download/?endpoint=zulu&uuid=9f020a32-d669-4f80-b4be-7a2551d0e7df)
  - Alternatively, `wget https://www.azul.com/core-post-download/?endpoint=zulu&uuid=9f020a32-d669-4f80-b4be-7a2551d0e7df`
- [ ] Install Zulu17 (Fedora)
  - [Zulu17 Download](https://www.azul.com/core-post-download/?endpoint=zulu&uuid=65bccb64-a1f4-4c8c-964e-24c6d8a03ddb)
  - Alternatively, `wget https://www.azul.com/core-post-download/?endpoint=zulu&uuid=65bccb64-a1f4-4c8c-964e-24c6d8a03ddb`
- [ ] Install [SFDX CLI](https://github.com/salesforcecli/cli/)
  - `npm install -g @salesforce/cli`

##### PMD

- `wget https://github.com/pmd/pmd/releases/download/pmd_releases%2F7.0.0-rc4/pmd-dist-7.0.0-rc4-bin.zip`
- `unzip` PMD
- Copy to `/opt/pmd`

#### Install Instructions

You can replace `config` with anything - ensure it's aliased in any bash/config files.

1. `alias config='/usr/bin/git --git-dir=$HOME/.cfg/ --work-tree=$HOME'`
2. `echo ".cfg" >> .gitignore`
3. `git clone --bare git@github.com:zacherytapp/dots.git $HOME/.cfg`
4. `alias config='/usr/bin/git --git-dir=$HOME/.cfg/ --work-tree=$HOME'`
5. `config config --local status.showUntrackedFiles no`
6. `config checkout`

## TODO:

- [ ] Instructions for installing python
- [ ] Instructions for installing ruby
- [ ] Instructions for installing lua
- [ ] Instructions for configuring various needed npm packages
