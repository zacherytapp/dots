# Zakk's Neovim Configuration

## Overview

A comprehensive Neovim configuration primarily used for Salesforce and JavaScript development, with extensive LSP support, modern plugins, and sensible defaults.

**Key Features:**

- Full LSP support for multiple languages (Apex, JavaScript/TypeScript, Go, Python, Lua, Jinja, etc.)
- Auto-formatting on save with conform.nvim
- Fuzzy finding with Telescope
- Git integration with gitsigns, git-conflict, and lazygit
- Treesitter syntax highlighting with textobjects
- Blink completion engine with Copilot integration
- Salesforce development tools (SFDX, Apex LSP, LWC, Visualforce, PMD linting)
- AI-assisted coding with GitHub Copilot and OpenCode
- Quick file navigation with Harpoon
- Modern UI with Snacks (dashboard, notifications, zen mode)
- Terminal integration with ToggleTerm
- Obsidian note-taking integration
- Multiple color schemes (Gruvbox, Catppuccin, Tokyo Night, Rose Pine, Everforest)

## Table of Contents

- [Prerequisites](#prerequisites)
- [Ubuntu/Debian Setup](#ubuntudebian-setup)
- [Fedora Setup](#fedora-setup)
- [Arch Linux Setup](#arch-linux-setup)
- [Language Runtimes Setup](#language-runtimes-setup)
- [Neovim Installation](#neovim-installation)
- [Plugin Dependencies](#plugin-dependencies)
- [LSP Servers Installation](#lsp-servers-installation)
- [Formatters & Linters](#formatters--linters)
- [Salesforce-Specific Setup](#salesforce-specific-setup)
- [Configuration Installation](#configuration-installation)
- [Verification & Troubleshooting](#verification--troubleshooting)

---

## Prerequisites

### Required for All Distributions

1. **Nerd Fonts** - Required for icons and glyphs
   - Recommended: Dank Mono, Fira Code, or Maple Font
   - Installation:
     ```bash
     # Download from https://www.nerdfonts.com/font-downloads
     # Or use your distribution's font manager
     mkdir -p ~/.local/share/fonts
     # Extract font files to ~/.local/share/fonts
     fc-cache -fv
     ```

2. **Terminal Emulator** - Kitty recommended (configured in dotfiles)
   - True color support required
   - Kitty provides best compatibility with this config

---

## Ubuntu/Debian Setup

### 1. System Dependencies

```bash
# Update package lists
sudo apt update

# Install core dependencies
sudo apt install -y \
  build-essential \
  git \
  curl \
  wget \
  unzip \
  tar \
  gzip \
  cmake \
  ninja-build \
  gettext \
  ca-certificates \
  xclip \
  fd-find \
  ripgrep \
  fzf \
  zsh \
  kitty \
  tmux \
  neofetch

# Install language dependencies
sudo apt install -y \
  lua5.4 \
  liblua5.4-dev \
  ruby-full \
  python3 \
  python3-pip \
  python3-venv \
  php-cli \
  php-zip

# Optional: Graphics tools for enhanced features
sudo apt install -y gimp imagemagick ghostscript
```

### 2. Lua & LuaRocks Installation

```bash
# Lua should be installed from step 1, now install LuaRocks
wget https://luarocks.org/releases/luarocks-3.11.1.tar.gz
tar zxpf luarocks-3.11.1.tar.gz
cd luarocks-3.11.1
./configure && make && sudo make install
cd ..
rm -rf luarocks-3.11.1*

# Install required Lua packages
sudo luarocks install luasocket
```

### 3. Ruby Gems

```bash
gem install neovim
```

### 4. Additional Tools

```bash
# Install lazygit (optional but recommended for git integration)
LAZYGIT_VERSION=$(curl -s "https://api.github.com/repos/jesseduffield/lazygit/releases/latest" | grep -Po '"tag_name": "v\K[^"]*')
curl -Lo lazygit.tar.gz "https://github.com/jesseduffield/lazygit/releases/latest/download/lazygit_${LAZYGIT_VERSION}_Linux_x86_64.tar.gz"
tar xf lazygit.tar.gz lazygit
sudo install lazygit /usr/local/bin
rm lazygit lazygit.tar.gz
```

---

## Fedora Setup

### 1. System Dependencies

```bash
# Update system
sudo dnf update -y

# Install core dependencies
sudo dnf install -y \
  @development-tools \
  git \
  curl \
  wget \
  unzip \
  tar \
  gzip \
  cmake \
  ninja-build \
  gcc \
  gcc-c++ \
  make \
  gettext \
  ca-certificates \
  xclip \
  fd-find \
  ripgrep \
  fzf \
  zsh \
  kitty \
  tmux \
  neofetch

# Install language dependencies
sudo dnf install -y \
  lua \
  lua-devel \
  ruby \
  ruby-devel \
  python3 \
  python3-pip \
  python3-devel \
  php-cli

# Optional: Graphics tools
sudo dnf install -y gimp ImageMagick ghostscript
```

### 2. Lua & LuaRocks Installation

```bash
# Install LuaRocks
wget https://luarocks.org/releases/luarocks-3.11.1.tar.gz
tar zxpf luarocks-3.11.1.tar.gz
cd luarocks-3.11.1
./configure && make && sudo make install
cd ..
rm -rf luarocks-3.11.1*

# Install required Lua packages
sudo luarocks install luasocket
```

### 3. Ruby Gems

```bash
gem install neovim
```

### 4. Flatpak Setup (Optional)

```bash
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak update
```

---

## Arch Linux Setup

### 1. System Dependencies

```bash
# Update system
sudo pacman -Syu

# Install core dependencies
sudo pacman -S --needed \
  base-devel \
  git \
  curl \
  wget \
  unzip \
  tar \
  gzip \
  cmake \
  ninja \
  gettext \
  ca-certificates \
  xclip \
  fd \
  ripgrep \
  fzf \
  zsh \
  kitty \
  tmux \
  neofetch

# Install language dependencies
sudo pacman -S --needed \
  lua \
  luarocks \
  ruby \
  python \
  python-pip \
  php

# Optional: Graphics tools
sudo pacman -S --needed gimp imagemagick ghostscript
```

### 2. LuaRocks Setup

```bash
# LuaRocks should be installed, configure it
sudo luarocks install luasocket
```

### 3. Ruby Gems

```bash
gem install neovim
```

### 4. AUR Helper (Optional - for yay)

```bash
# If you don't have an AUR helper, install yay
cd /tmp
git clone https://aur.archlinux.org/yay.git
cd yay
makepkg -si
cd ..
rm -rf yay
```

---

## Language Runtimes Setup

These steps are the same across all distributions.

### Node.js via NVM

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# Reload shell configuration
source ~/.zshrc  # or source ~/.bashrc if using bash

# Install Node.js LTS
nvm install node
nvm use node

# Install required global packages
npm install -g neovim
npm install -g sql-formatter
npm install -g tree-sitter-cli
npm install -g @salesforce/cli  # For Salesforce development
npm install -g prettier
npm install -g prettierd
```

### Python via pyenv

```bash
# Install pyenv
curl https://pyenv.run | bash

# Add to shell configuration (~/.zshrc or ~/.bashrc)
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.zshrc
echo 'command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(pyenv init -)"' >> ~/.zshrc

# Reload shell
source ~/.zshrc

# Install Python version for Neovim
pyenv install 3.12.3
pyenv virtualenv 3.12.3 neovim

# Install pynvim in the virtualenv
pyenv activate neovim
pip install pynvim
pyenv deactivate

# The path will be: ~/.pyenv/versions/neovim/bin/python
# This is already configured in init.lua as g:python3_host_prog
```

### Go Installation

**Ubuntu/Debian:**

```bash
# Download latest Go
GO_VERSION="1.25.4"  # Check for latest at https://go.dev/dl/
wget https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz
rm go${GO_VERSION}.linux-amd64.tar.gz

# Add to PATH in ~/.zshrc or ~/.bashrc
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.zshrc
echo 'export PATH=$PATH:$HOME/go/bin' >> ~/.zshrc
source ~/.zshrc
```

**Fedora:**

```bash
sudo dnf install -y golang
echo 'export PATH=$PATH:$HOME/go/bin' >> ~/.zshrc
source ~/.zshrc
```

**Arch:**

```bash
sudo pacman -S go
echo 'export PATH=$PATH:$HOME/go/bin' >> ~/.zshrc
source ~/.zshrc
```

### Rust Installation

```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Reload shell
source ~/.cargo/env
```

### Java (Zulu JDK) for Salesforce Development

**Ubuntu/Debian:**

```bash
# Add Azul repository
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 0xB1998361219BD9C9
sudo apt-add-repository 'deb http://repos.azul.com/azure-only/zulu/apt stable main'
sudo apt update
sudo apt install -y zulu21-jdk

# Set JAVA_HOME
echo 'export JAVA_HOME=/usr/lib/jvm/zulu21' >> ~/.zshrc
source ~/.zshrc
```

**Fedora:**

```bash
# Download and install Zulu JDK
wget https://cdn.azul.com/zulu/bin/zulu21.36.17-ca-jdk21.0.4-linux_x64.rpm
sudo dnf install -y ./zulu21*.rpm
rm zulu21*.rpm

# Set JAVA_HOME
echo 'export JAVA_HOME=/usr/lib/jvm/zulu21' >> ~/.zshrc
source ~/.zshrc
```

**Arch:**

```bash
# Install from AUR or use standard JDK
yay -S zulu-21-bin
# Or
sudo pacman -S jdk21-openjdk

echo 'export JAVA_HOME=/usr/lib/jvm/java-21-openjdk' >> ~/.zshrc
source ~/.zshrc
```

### Composer (PHP Package Manager - Optional)

```bash
# Install Composer globally
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

---

## Neovim Installation

### Build from Source (Recommended - Latest Features)

```bash
# Clone Neovim repository
git clone https://github.com/neovim/neovim
cd neovim

# Checkout stable release (or use master for latest)
git checkout stable

# Build
make CMAKE_BUILD_TYPE=RelWithDebInfo

# Install
sudo make install

# Clean up
cd ..
rm -rf neovim
```

### Verify Installation

```bash
nvim --version
# Should show version 0.10.0 or higher
```

---

## Plugin Dependencies

This configuration uses `lazy.nvim` as the plugin manager, which auto-installs on first run. However, some plugins require external dependencies:

### Telescope Dependencies

- **ripgrep** (rg) - Already installed in system dependencies
- **fd-find** (fd) - Already installed in system dependencies
- **make** - Required for fzf-native compilation

### Treesitter Dependencies

- **C compiler** (gcc/clang) - Already installed in build tools
- **tree-sitter CLI** - Already installed via npm

### Mason Dependencies

Mason will automatically install LSP servers and tools, but requires:

- **curl, wget, unzip, tar, gzip** - Already installed
- **Node.js, Python, Go, Rust** - Already installed

---

## LSP Servers Installation

Most LSP servers can be installed via Mason (`:Mason` in Neovim). However, you can also install them manually:

### Via Mason (Recommended)

1. Open Neovim: `nvim`
2. Run: `:Mason`
3. Install the following servers by pressing `i` on each:
   - `lua-language-server` (lua_ls)
   - `gopls` - Go with advanced inlay hints
   - `json-lsp` (jsonls) - JSON with schemastore integration
   - `yaml-language-server` (yamlls) - YAML with schemastore integration
   - `html-lsp` - HTML, templ, gotmpl support
   - `tailwindcss-language-server` - Tailwind CSS
   - `apex-language-server` - Salesforce Apex (uses bundled apex-jorje-lsp.jar)
   - `jinja-lsp` - Jinja/Jinja2 templates
   - `ctags-lsp` - Code navigation via ctags (Apex)

### Manual Installation (Alternative)

```bash
# Lua Language Server
brew install lua-language-server
# Or build from source: https://github.com/LuaLS/lua-language-server

# Go Language Server
go install golang.org/x/tools/gopls@latest

# JSON/YAML Language Servers (via npm)
npm install -g vscode-langservers-extracted

# HTML Language Server
npm install -g vscode-langservers-extracted

# Tailwind CSS Language Server
npm install -g @tailwindcss/language-server

# Jinja LSP
pip install jinja-lsp

# Apex Language Server (for Salesforce)
# The bundled apex-jorje-lsp.jar in lspserver/ is used automatically
# Requires Java 21+ (Zulu JDK recommended)

# Ctags LSP (for Apex navigation)
# Install universal-ctags first, then:
pip install ctags-lsp
```

---

## Formatters & Linters

### Via Mason (Recommended)

Open `:Mason` in Neovim and install:

- `prettierd` - JavaScript/TypeScript/HTML/CSS/JSON formatter
- `stylua` - Lua formatter
- `shellcheck` - Shell script linter
- `shfmt` - Shell script formatter
- `black` - Python formatter
- `isort` - Python import sorter
- `ruff` - Fast Python linter/formatter
- `gofumpt` - Go formatter (stricter than gofmt)
- `goimports` - Go import organizer

### Manual Installation

```bash
# Prettierd (faster prettier)
npm install -g prettierd

# Stylua (Lua formatter)
cargo install stylua

# Shellcheck & shfmt
# Ubuntu/Debian:
sudo apt install shellcheck
GO111MODULE=on go install mvdan.cc/sh/v3/cmd/shfmt@latest

# Fedora:
sudo dnf install shellcheck ShellCheck
GO111MODULE=on go install mvdan.cc/sh/v3/cmd/shfmt@latest

# Arch:
sudo pacman -S shellcheck shfmt

# Python formatters
pip install black isort ruff

# Go formatters
go install mvdan.cc/gofumpt@latest
go install golang.org/x/tools/cmd/goimports@latest

# Rubocop (Ruby)
gem install rubocop

# Pint (PHP - Laravel formatter)
composer global require laravel/pint
```

---

## Salesforce-Specific Setup

### SFDX CLI

```bash
# Already installed via npm in Node.js setup
npm install -g @salesforce/cli

# Verify installation
sf --version
```

### PMD (Apex Static Analysis)

```bash
# Download PMD
PMD_VERSION="7.0.0"
wget https://github.com/pmd/pmd/releases/download/pmd_releases%2F${PMD_VERSION}/pmd-dist-${PMD_VERSION}-bin.zip

# Extract and install
unzip pmd-dist-${PMD_VERSION}-bin.zip
sudo mv pmd-bin-${PMD_VERSION} /opt/pmd
sudo ln -s /opt/pmd/bin/pmd /usr/local/bin/pmd

# Clean up
rm pmd-dist-${PMD_VERSION}-bin.zip

# Verify
pmd --version
```

### Apex Ruleset Configuration

```bash
# Create config directory
mkdir -p ~/.config/apex

# Create or download your apex_ruleset.xml
# Place it at: ~/.config/apex/apex_ruleset.xml
# This is referenced in lua/plugins/none-ls.lua
```

### Prettier Plugin for Apex

```bash
# Install prettier-plugin-apex
npm install -g prettier-plugin-apex

# Create .prettierrc in your Salesforce project root
cat > ~/.prettierrc << EOF
{
  "plugins": ["prettier-plugin-apex"],
  "overrides": [
    {
      "files": "*.apex",
      "options": {
        "parser": "apex"
      }
    }
  ]
}
EOF
```

---

## Configuration Installation

### Clone Dotfiles Repository

This configuration is part of a larger dotfiles setup using a bare git repository:

```bash
# Add git alias for dotfiles management
alias config='/usr/bin/git --git-dir=$HOME/.cfg/ --work-tree=$HOME'

# Add .cfg to global gitignore
echo ".cfg" >> ~/.gitignore

# Clone the bare repository
git clone --bare git@github.com:zacherytapp/dots.git $HOME/.cfg

# Define the alias in the current shell
alias config='/usr/bin/git --git-dir=$HOME/.cfg/ --work-tree=$HOME'

# Checkout the actual content from the bare repository
config checkout

# Ignore untracked files
config config --local status.showUntrackedFiles no

# Make alias permanent
echo "alias config='/usr/bin/git --git-dir=\$HOME/.cfg/ --work-tree=\$HOME'" >> ~/.zshrc
```

If you get conflicts during checkout, back up the existing files and retry.

### First Neovim Launch

```bash
# Launch Neovim
nvim

# Lazy.nvim will automatically:
# 1. Install itself on first launch
# 2. Install all plugins defined in lua/plugins/
# 3. Compile Treesitter parsers

# Wait for all installations to complete
# You may see some errors on first launch - this is normal
# Close and reopen Neovim after initial setup
```

---

## Shell Configuration

### Zsh Setup (Recommended)

```bash
# Install Oh My Zsh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# Install Spaceship Prompt
git clone https://github.com/spaceship-prompt/spaceship-prompt.git "$ZSH_CUSTOM/themes/spaceship-prompt" --depth=1
ln -s "$ZSH_CUSTOM/themes/spaceship-prompt/spaceship.zsh-theme" "$ZSH_CUSTOM/themes/spaceship.zsh-theme"

# Install Zsh plugins
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting

# Configure autosuggestions keybinding
mkdir -p $ZSH_CUSTOM
echo "bindkey '^ ' autosuggest-accept" >> $ZSH_CUSTOM/autosuggestion-settings.zsh

# Edit ~/.zshrc and set:
# ZSH_THEME="spaceship"
# plugins=(git zsh-autosuggestions zsh-syntax-highlighting)
```

### Tmux True Color Configuration

For proper color support, add to `~/.tmux.conf`:

```bash
# Enable true color support
set-option -sa terminal-overrides ",xterm*:Tc"
set -g default-terminal "tmux-256color"

# Or for kitty:
set-option -sa terminal-features ',kitty:RGB'

# Fast escape time
set -sg escape-time 0

# Enable focus events
set -g focus-events on
```

---

## Verification & Troubleshooting

### Run Checkhealth

```bash
nvim +checkhealth
```

### Expected Results

**Should be OK:**

- ✅ nvim-treesitter - All parsers installed
- ✅ telescope - ripgrep and fd found
- ✅ mason - All core utils found
- ✅ vim.lsp - No errors
- ✅ clipboard - xclip found

**Expected Warnings (Safe to Ignore):**

- ⚠️ lazy.nvim - luarocks warnings (if no plugins need it)
- ⚠️ mason - Composer warning (if not using PHP)
- ⚠️ mason - Julia warning (if not using Julia)
- ⚠️ overseer - Various task runner warnings (project-specific)
- ⚠️ snacks.image - Image rendering tools (optional features)

**Must Fix if Present:**

- ❌ vim.provider - Python/Node.js/Ruby providers not found
- ❌ lazy.nvim - Git not found
- ❌ telescope - ripgrep or fd not found

### Common Issues & Solutions

#### Python Provider Not Found

```bash
# Ensure pyenv virtualenv is created and pynvim is installed
pyenv virtualenv 3.12.3 neovim
pyenv activate neovim
pip install pynvim
pyenv deactivate

# Verify path matches init.lua:17
# Should be: ~/.pyenv/versions/neovim/bin/python
```

#### Node Provider Not Found

```bash
# Install neovim npm package globally
npm install -g neovim

# Verify
npm list -g neovim
```

#### Ruby Provider Not Found

```bash
# Install neovim gem
gem install neovim

# If using rbenv/rvm, rehash
rbenv rehash  # or: rvm reload
```

#### LSP Not Starting

```bash
# Check if LSP is configured
nvim some_file.lua
# Type: :LspInfo

# If not attached, check logs
:LspLog

# Manually install via Mason
:Mason
# Find the server and press 'i' to install
```

#### Treesitter Compilation Fails

```bash
# Ensure C compiler is installed
gcc --version

# Manually reinstall a parser
:TSInstall <language>
# Example: :TSInstall lua
```

#### Telescope Not Finding Files

```bash
# Verify ripgrep and fd are in PATH
which rg
which fd  # or fdfind on Ubuntu

# If using fdfind, create symlink
sudo ln -s $(which fdfind) /usr/local/bin/fd
```

---

## Testing Your Setup

### Test LSP Functionality

1. **Lua:**

   ```bash
   nvim test.lua
   # Type: vim.
   # Should see completion popup
   ```

2. **JavaScript:**

   ```bash
   nvim test.js
   # Type: console.
   # Should see completion popup
   ```

3. **Go:**
   ```bash
   nvim test.go
   # Type: fmt.
   # Should see completion popup
   ```

### Test Formatters

1. Create a poorly formatted file
2. Save it (`:w`)
3. Format-on-save should auto-format the file

### Test Telescope

- `<leader>ff` - Find files
- `<leader>fg` - Live grep
- `<leader>fb` - List buffers

### Test Treesitter

- Open a source file
- Run `:InspectTree`
- Should see AST visualization

---

## Key Bindings

Leader key is `<Space>`

### File Navigation (Telescope)

- `<leader>ff` - Find files
- `<leader>fg` - Live grep
- `<leader>fb` - Find buffers
- `<leader>fo` - Find old files
- `<leader>fk` - Find keymaps
- `<leader>fh` - Find help tags
- `<leader>ls` - LSP document symbols
- `-` - Open Oil file browser (parent directory)

### Harpoon (Quick File Access)

- `<leader>ha` - Add file to Harpoon
- `<leader>ho` - Open Harpoon menu
- `<leader>1-9` - Jump to Harpoon file 1-9
- `[h` / `]h` - Previous/Next Harpoon file

### LSP

- `gd` - Go to definition
- `gr` - Find references
- `gi` - Go to implementation
- `K` - Hover documentation
- `<C-k>` - Signature help
- `<leader>ca` - Code actions
- `<leader>rn` - Rename symbol
- `<leader>ge` - Go to declaration
- `<leader>fF` - Format buffer
- `<leader>li` - LSP info
- `<leader>lr` - LSP restart
- `<leader>wa` / `<leader>wr` - Add/Remove workspace folder

### Diagnostics

- `<leader>xx` - Toggle Trouble diagnostics
- `<leader>da` - Show buffer diagnostics

### Git

- `<leader>gs` - Git status (Telescope)
- `<leader>gc` - Git commits (Telescope)
- `<leader>gg` - Open Lazygit
- `<leader>gl` - Lazygit log
- `<leader>gf` - Lazygit current file history
- `<leader>gB` - Git browse (open in browser)

### AI/Copilot

- `<C-l>` - Accept Copilot suggestion
- `<C-u>` - Dismiss Copilot suggestion
- `<C-p>` - Open Copilot panel
- `<leader>oa` - Ask about selection (OpenCode)
- `<leader>ot` - Toggle OpenCode embedded
- `<leader>os` - Select OpenCode prompt
- `<leader>oc` - OpenCode command
- `<leader>on` - New OpenCode session

### Buffer/Window Management

- `<leader>w` - Write file
- `<leader>q` - Close buffer
- `<leader>Q` - Close window
- `<leader><leader>` - Switch to last buffer
- `[b` / `]b` - Previous/Next buffer
- `<leader>bd` - Delete buffer (Snacks)

### Snacks UI

- `<leader>z` - Toggle Zen mode
- `<leader>Z` - Toggle Zoom
- `<leader>/` - Toggle scratch buffer
- `<leader>S` - Select scratch buffer
- `<leader>n` - Notification history
- `<leader>un` - Dismiss all notifications
- `<C-/>` - Toggle terminal

### Toggles (Snacks)

- `<leader>us` - Toggle spelling
- `<leader>uw` - Toggle wrap
- `<leader>ul` - Toggle line numbers
- `<leader>uL` - Toggle relative numbers
- `<leader>ud` - Toggle diagnostics
- `<leader>uh` - Toggle inlay hints
- `<leader>ub` - Toggle dark/light background
- `<leader>uT` - Toggle Treesitter

### Utilities

- `<leader>k` - Open Commander (command palette)
- `<leader>u` - Toggle Undotree
- `<leader>fj` - Format JSON
- `<leader>cR` - Rename file
- `<M-j>` / `<M-k>` - Move selection down/up (visual mode)
- `<leader>y` - Yank to system clipboard
- `<leader>Y` - Yank lines to system clipboard
- `<leader>p` - Paste without replacing register

### Terminal

- `<C-\>` - Toggle terminal (ToggleTerm)
- `<C-/>` - Toggle terminal (Snacks)

### Obsidian Notes

- `<leader>noo` - Open note (quick switch)
- `<leader>non` - New note
- `<leader>nod` - Daily note
- `<leader>nos` - Search notes
- `<leader>nob` - Show backlinks
- `<leader>nol` - Show links
- `<leader>not` - Browse tags
- `<leader>nor` - Rename note
- `<leader>nop` - Paste image

### Salesforce (sf.nvim)

- `<leader>ss` - Save and push to org
- `<leader>rp` - Retrieve file from org
- `<leader>rf` - Retrieve Apex under cursor (visual)
- `<leader>df` - Diff file against org
- `<leader>og` - Set target org
- `<leader>st` - Toggle Salesforce terminal
- `<leader>rq` - Run SOQL query in file
- `<leader>tq` - Run tooling query
- `<leader>hq` - Run highlighted SOQL (visual)
- `<leader>ra` - Run file as anonymous Apex
- `<leader>rk` - Retrieve package
- `<leader>mr` - List metadata to retrieve
- `<leader>cc` - Create Apex class
- `<leader>ca` - Create Aura bundle
- `<leader>cl` - Create LWC bundle
- `<leader>tm` - Run current test method
- `<leader>tf` - Run all tests in file
- `<leader>tr` - Repeat last test run
- `<leader>tl` - Run all local tests

---

## Additional Configuration

### Switching Color Schemes

Five color schemes are available. To change the default, edit `init.lua`:

```lua
-- Current default (line 32 in init.lua)
vim.cmd.colorscheme("gruvbox")

-- Other options:
vim.cmd.colorscheme("catppuccin")      -- Soothing pastel theme
vim.cmd.colorscheme("tokyonight")      -- Clean dark theme
vim.cmd.colorscheme("rose-pine")       -- Elegant low-contrast
vim.cmd.colorscheme("everforest")      -- Green-based comfortable
```

Or toggle temporarily in Neovim: `:colorscheme <name>`

Toggle dark/light mode: `<leader>ub`

### Obsidian Notes Setup

The Obsidian integration expects notes at `~/notes/obsidian/`. To change this path, edit `lua/plugins/obsidian.lua`:

```lua
workspaces = {
    { name = "personal", path = "/your/notes/path" },
},
```

### Configure Prettier for Apex

Create `.prettierrc` in your Salesforce project:

```json
{
  "plugins": ["prettier-plugin-apex"],
  "printWidth": 120,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "overrides": [
    {
      "files": "*.apex",
      "options": {
        "parser": "apex"
      }
    }
  ]
}
```

---

## Updating

### Update Neovim Configuration

```bash
# Using the config alias
config pull
```

### Update Plugins

```bash
# In Neovim
:Lazy sync
```

### Update LSP Servers

```bash
# In Neovim
:Mason
# Press 'U' to update all installed packages
```

### Update Neovim

```bash
# If installed from source
cd neovim
git pull
make CMAKE_BUILD_TYPE=RelWithDebInfo
sudo make install
```

---

## Architecture Notes

### Configuration Structure

```
~/.config/nvim/
├── init.lua                 # Entry point (lazy.nvim bootstrap, colorscheme)
├── lazy-lock.json           # Plugin version lock file
├── lua/
│   ├── options.lua          # Neovim options
│   ├── keymaps.lua          # Key mappings (uses commander.nvim)
│   ├── colors.lua           # Color scheme setup
│   ├── filetypes.lua        # Custom filetype detection
│   ├── assets.lua           # Asset loading utilities
│   ├── icons.lua            # Icon definitions
│   ├── config/
│   │   └── autocmds.lua     # Autocommands
│   ├── after/
│   │   ├── ftplugin/
│   │   │   └── apex.lua     # Apex-specific settings
│   │   └── queries/         # Treesitter query injections
│   │       ├── go/
│   │       └── gotmpl/
│   ├── lsp/                 # LSP server configurations
│   │   ├── apex_ls.lua      # Salesforce Apex
│   │   ├── ctags_lsp.lua    # Ctags-based navigation
│   │   ├── gopls.lua        # Go with inlay hints
│   │   ├── html.lua         # HTML/templ/gotmpl
│   │   ├── jinja_lsp.lua    # Jinja templates
│   │   ├── jsonls.lua       # JSON with schemastore
│   │   ├── lua_ls.lua       # Lua
│   │   ├── lwc_ls.lua       # Lightning Web Components
│   │   ├── tailwindcss.lua  # Tailwind CSS
│   │   ├── visualforce_ls.lua # Visualforce pages
│   │   └── yamlls.lua       # YAML with schemastore
│   ├── plugins/             # Plugin specifications (23 files)
│   │   ├── ai.lua           # Copilot + OpenCode
│   │   ├── blink.lua        # Completion engine
│   │   ├── colors.lua       # Color schemes (5 themes)
│   │   ├── conform.lua      # Formatter config
│   │   ├── editor.lua       # Editor enhancements
│   │   ├── files.lua        # Oil + Neo-tree
│   │   ├── git.lua          # Git integration
│   │   ├── harpoon.lua      # Quick file navigation
│   │   ├── icons.lua        # Icon plugin
│   │   ├── lsp.lua          # LSP config
│   │   ├── mini.lua         # Mini.nvim utilities
│   │   ├── noice.lua        # Command line UI
│   │   ├── none-ls.lua      # Linting/diagnostics
│   │   ├── obsidian.lua     # Obsidian integration
│   │   ├── render-markdown.lua # Markdown rendering
│   │   ├── sf-nvim.lua      # Salesforce tools
│   │   ├── snacks.lua       # UI enhancements
│   │   ├── statusline.lua   # Status line
│   │   ├── telescope.lua    # Fuzzy finder
│   │   ├── toggleterm.lua   # Terminal
│   │   ├── transparent.lua  # Transparency
│   │   ├── treesitter.lua   # Syntax highlighting
│   │   └── ui.lua           # Additional UI
│   └── util/
│       └── telescope.lua    # Telescope utilities
├── lspserver/               # Bundled LSP binaries
│   ├── apex-colors.json     # Apex syntax colors
│   └── apex-jorje-lsp.jar   # Apex language server
├── snippets/                # Custom snippets
│   ├── apex.json
│   ├── lwc-html.json
│   ├── lwc-js.json
│   ├── lwc-xml.json
│   ├── package.json
│   └── visualforce.json
├── spell/                   # Spell check
│   └── en.utf-8.add
└── data/                    # Plugin data
    └── plenary/filetypes/   # Custom filetype definitions
```

### Key Plugins

**Core:**
- **lazy.nvim** - Plugin manager
- **nvim-lspconfig** - LSP configuration
- **blink.cmp** - Completion engine
- **nvim-treesitter** - Syntax highlighting + textobjects
- **telescope.nvim** - Fuzzy finder
- **conform.nvim** - Formatter
- **none-ls.nvim** - Linting and diagnostics

**Navigation & Files:**
- **harpoon** - Quick file navigation (ThePrimeagen)
- **oil.nvim** - File browser
- **neo-tree.nvim** - File tree explorer

**Git:**
- **gitsigns.nvim** - Git signs in gutter
- **git-conflict.nvim** - Conflict resolution
- **lazygit** integration via Snacks

**AI:**
- **copilot.lua** - GitHub Copilot
- **opencode.nvim** - AI code assistant

**UI:**
- **snacks.nvim** - Dashboard, notifications, zen mode, terminal
- **noice.nvim** - Command line UI
- **mini.nvim** - Various utilities
- **commander.nvim** - Command palette

**Salesforce:**
- **sf.nvim** - SFDX integration

**Color Schemes (5 available):**
- **gruvbox** - Default, warm retro theme with transparency
- **catppuccin** - Soothing pastel theme (macchiato/latte)
- **tokyonight** - Clean dark theme
- **rose-pine** - Elegant low-contrast theme
- **everforest** - Green-based comfortable theme

---

## Support & Resources

**Core:**
- [Neovim Documentation](https://neovim.io/doc/)
- [Lazy.nvim](https://github.com/folke/lazy.nvim)
- [Mason.nvim](https://github.com/williamboman/mason.nvim)
- [LSP Config](https://github.com/neovim/nvim-lspconfig)
- [Treesitter](https://github.com/nvim-treesitter/nvim-treesitter)

**Key Plugins:**
- [Telescope](https://github.com/nvim-telescope/telescope.nvim)
- [Harpoon](https://github.com/ThePrimeagen/harpoon)
- [Snacks.nvim](https://github.com/folke/snacks.nvim)
- [Blink.cmp](https://github.com/Saghen/blink.cmp)
- [Conform.nvim](https://github.com/stevearc/conform.nvim)

**Salesforce:**
- [sf.nvim](https://github.com/xixiaofinland/sf.nvim)
- [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli)

**Color Schemes:**
- [Gruvbox](https://github.com/ellisonleao/gruvbox.nvim)
- [Catppuccin](https://github.com/catppuccin/nvim)
- [Tokyo Night](https://github.com/folke/tokyonight.nvim)
- [Rose Pine](https://github.com/rose-pine/neovim)
- [Everforest](https://github.com/neanias/everforest-nvim)

---

## License

This configuration is provided as-is for personal use and learning.
