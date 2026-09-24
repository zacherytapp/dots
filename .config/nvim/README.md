# Zakk's Neovim Configuration

## Overview

A Neovim configuration for Salesforce, web, Go, Python, Rust and infrastructure work. It aims for VS Code-level language support (LSP, formatting, linting, testing, debugging, snippets, icons) with a LazyVim-style layout and keymaps.

**Key Features:**

- Per-language support for Lua, Go (+ Go templates, templ, Helm), Python (+ Django, Jinja2), Rust, TypeScript/JavaScript (+ React, Next.js), Svelte, HTML/CSS/Tailwind, Salesforce (Apex, LWC, Visualforce, Aura, SOQL), YAML, JSON, Terraform/OpenTofu, Docker, Ansible and Caddy. See [Language Support](#language-support)
- Tools installed automatically through Mason; servers start as soon as they're installed
- Format on save (conform.nvim) and linting (nvim-lint), with toggles
- LazyVim layout: bufferline, lualine, noice, which-key (helix), snacks dashboard/notifier/indent, flash
- Every keymap in the commander palette (`<leader>k`) and which-key
- Fuzzy finding with fzf-lua
- Git integration with gitsigns, git-conflict, and lazygit
- Treesitter syntax highlighting with textobjects
- Blink completion engine with Copilot integration
- Salesforce development tools (SFDX, Apex LSP, LWC, Visualforce, PMD linting)
- AI-assisted coding with GitHub Copilot and OpenCode
- Quick file navigation with Harpoon
- Modern UI with Snacks (dashboard, notifications, zen mode)
- Obsidian note-taking integration
- Gruvbox Material colorscheme with transparency (matches Hyprland and Noctalia)

## Table of Contents

- [Prerequisites](#prerequisites)
- [Ubuntu/Debian Setup](#ubuntudebian-setup)
- [Fedora Setup](#fedora-setup)
- [Arch Linux Setup](#arch-linux-setup)
- [Language Runtimes Setup](#language-runtimes-setup)
- [Neovim Installation](#neovim-installation)
- [Configuration Layout](#configuration-layout)
- [Language Support](#language-support)
- [Salesforce-Specific Setup](#salesforce-specific-setup)
- [Configuration Installation](#configuration-installation)
- [Verification & Troubleshooting](#verification--troubleshooting)
- [Key Bindings](#key-bindings)

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

## Configuration Layout

The layout follows [LazyVim](https://www.lazyvim.org/): a small core plus one
file per language that contributes to it.

```
init.lua                    bootstrap lazy.nvim, load config/*, import plugins + plugins/lang
lua/config/
  options.lua               editor options (2-space default indent)
  filetypes.lua             filetype detection for every supported language
  keymaps.lua               global keymaps (commander registry) + keymap convention
  autocmds.lua              LazyVim-style autocommands
  python_venv.lua           auto-activate a project's .venv / venv
lua/util/
  init.lua                  root detection, format toggles, helpers
  salesforce_lsp.lua        :SalesforceLspInstall (Apex / Visualforce / Aura servers)
lua/plugins/                core: lsp, formatting (conform), linting (nvim-lint),
                            treesitter, dap, testing (neotest), blink, fzf-lua,
                            snacks, ui (bufferline, noice, commander), editor
                            (which-key, flash, grug-far, ...), git, files, ...
lua/plugins/lang/*.lua      one file per language (see below)
after/ftplugin/*.lua        per-filetype indent / commentstring
snippets/                   VSCode-style snippets (Apex, LWC, Visualforce)
```

Each `lua/plugins/lang/<language>.lua` adds to the core specs through lazy.nvim
`opts` merging:

| Core spec | What a language adds |
| --- | --- |
| `nvim-treesitter` | `ensure_installed` parsers, `register` (filetype → parser), `runtime_indent` |
| `mason.nvim` | `ensure_installed` packages (installed automatically on startup) |
| `nvim-lspconfig` | `servers.<name>` = a `vim.lsp.Config` merged over nvim-lspconfig's defaults (`enabled = false` skips it, `filetypes_include` extends the default filetypes) |
| `conform.nvim` | `formatters_by_ft`, `formatters` overrides |
| `nvim-lint` | `linters_by_ft`, `linters.<name>` overrides with an optional `condition(ctx)` |
| `neotest` | `adapters` |
| `nvim-dap` | `configurations`, or a language-specific DAP plugin as a dependency |

Servers are only enabled when their command exists, and they start as soon as Mason finishes
installing them (no restart). `:LspMissing` lists configured servers that aren't
installed, `:LintInfo` shows the linters for the current buffer, and `:ConformInfo`
shows its formatters.

To add a language, copy the closest `lua/plugins/lang/*.lua` file.

## Language Support

| Language | LSP | Format | Lint | Test / Debug | Extras |
| --- | --- | --- | --- | --- | --- |
| Lua | lua_ls + lazydev | stylua (2 spaces without a stylua.toml) | lua_ls | — | Neovim API completion |
| Go | gopls (gofumpt, staticcheck, hints, codelens) | goimports, gofumpt | golangci-lint | neotest-golang, delve | gopher.nvim (`<leader>cg`), coverage |
| Go templates | gopls + html + tailwind + emmet | html LSP | — | — | `.tmpl` `.gotmpl` `.gohtml`, `templates/*.html` in Go modules |
| templ | templ + html + tailwind + emmet | templ fmt | templ | — | |
| Helm | helm_ls | — | helm lint | — | chart `templates/` and `values*.yaml` |
| Python | basedpyright + ruff | ruff (organize imports + format) | ruff | pytest (neotest), debugpy | venv auto-activation, `<leader>cv` picker |
| Django templates | djlsp + html + emmet | djlint (django profile) | djlint | — | `templates/*.html` in projects with `manage.py` |
| Jinja2 | jinja-lsp + html + emmet | djlint (jinja profile) | djlint | — | `.j2` `.jinja` `.jinja2`, Flask `templates/` |
| Rust | rust-analyzer (rustaceanvim, clippy) | rustfmt (LSP) | clippy | neotest, codelldb | crates.nvim, taplo for TOML |
| TypeScript / JavaScript / React | vtsls + eslint | prettierd (+ eslint fix-all on save) | eslint | jest, vitest, js-debug | nvim-vtsls commands, tsc.nvim, package-info |
| Next.js | vtsls (workspace TS + tsconfig plugins) + tailwind + cssmodules | prettierd | eslint | jest/vitest, "Next.js: debug server" | `.mdx` |
| Svelte | svelte + typescript-svelte-plugin | prettierd | eslint | vitest | |
| HTML / CSS | html, cssls, tailwindcss, emmet | prettierd (+ stylelint when configured) | stylelint | — | colour previews |
| Apex | apex_ls (+ ctags_lsp with universal-ctags) | prettier-plugin-apex (when installed in the project) | PMD | sf.nvim tests + coverage (`<leader>mt`) | sObject refresh, snippets |
| Lightning Web Components | lwc_ls + vtsls + eslint + html | prettierd | eslint | Jest via sf.nvim | |
| Visualforce | visualforce_ls + emmet | visualforce_ls | — | — | `.page` `.component` |
| Aura | aura_ls | — | — | — | `.cmp` `.auradoc` |
| SOQL / SOSL / Apex logs | treesitter | — | — | run via sf.nvim | |
| Salesforce metadata XML | lemminx | lemminx | — | — | |
| YAML | yamlls + SchemaStore | prettierd | actionlint (workflows), yamllint (if configured) | — | |
| JSON / JSONC / JSON5 | jsonls + SchemaStore (+ sfdx-project schema) | prettierd | jsonls | — | |
| Terraform | terraform-ls | terraform fmt (or tofu fmt) | tflint | — | |
| OpenTofu | tofu-ls | tofu fmt (or terraform fmt) | tflint | — | `.tofu` |
| Docker | docker-language-server (Dockerfile, Compose, Bake) + yamlls | — | hadolint | — | |
| Ansible | ansible-language-server | prettierd | ansible-lint (via the LSP) | `<leader>ta` run playbook | playbook/role detection |
| Caddy | — (no Caddyfile LSP exists) | caddy fmt | caddy adapt | — | tabs, 4 wide |

Indentation: 2 spaces everywhere except Go, Caddy and templ (tabs, as their
formatters emit), Python and Rust (4 spaces, PEP 8 / rustfmt). `vim-sleuth` and
`.editorconfig` adapt to existing files.

### Tools Mason can't install

Everything in the table is installed by Mason except:

| Tool | Needed for | Install |
| --- | --- | --- |
| `rust-analyzer` | Rust | `rustup component add rust-analyzer` |
| `lwc-language-server` | LWC | `npm i -g @salesforce/lwc-language-server` |
| Apex / Visualforce / Aura servers | Salesforce | `:SalesforceLspInstall` (see below) |
| `java` 17+ | Apex LSP | your distro's JDK |
| `pmd` 7 | Apex linting | see [PMD](#pmd-apex-static-analysis) |
| `ctags` (universal-ctags) | Apex ctags jump | your distro's `universal-ctags` package |
| `terraform` / `tofu` | Terraform / OpenTofu formatting + terraform-ls validation | HashiCorp / OpenTofu packages |
| `caddy` | Caddyfile formatting / validation | your distro's `caddy` package |
| `ansible` | Ansible module docs and lint | `pipx install ansible-core` |
| `node`, `go`, `cargo`, `python3` | runtimes for several Mason packages | see [Language Runtimes Setup](#language-runtimes-setup) |

## Salesforce-Specific Setup

### SFDX CLI

```bash
npm install -g @salesforce/cli
sf --version
```

### Language servers

Apex, Visualforce and Aura servers ship only inside Salesforce's VS Code
extensions. Install or update them from Open VSX with:

```vim
:SalesforceLspInstall              " all three
:SalesforceLspInstall visualforce  " or one of apex / visualforce / aura
:SalesforceLspStatus               " installed versions
```

They're unpacked into `~/.local/share/nvim/salesforce-lsp/` and start
immediately; no restart needed. Until the Apex server is installed there,
the jar bundled in `lspserver/apex-jorje-lsp.jar` is used. The LWC server
comes from npm (`npm i -g @salesforce/lwc-language-server`). All Salesforce servers
attach only inside an sfdx project (`sfdx-project.json`).

For Apex completion of sObjects and custom fields, run **Refresh sObject
definitions** (`<leader>mms`, like VS Code's "SFDX: Refresh SObject Definitions")
once per org.

### PMD (Apex Static Analysis)

```bash
PMD_VERSION="7.19.0"
wget https://github.com/pmd/pmd/releases/download/pmd_releases%2F${PMD_VERSION}/pmd-dist-${PMD_VERSION}-bin.zip
unzip pmd-dist-${PMD_VERSION}-bin.zip
sudo mv pmd-bin-${PMD_VERSION} /opt/pmd
sudo ln -s /opt/pmd/bin/pmd /usr/local/bin/pmd
pmd --version
```

PMD runs through nvim-lint on open/save of Apex files (files over 10,000 lines
are skipped). It uses `~/.config/apex/apex_ruleset.xml` when present and PMD's
bundled `rulesets/apex/quickstart.xml` otherwise.

### Prettier Plugin for Apex

Apex is formatted with prettier only when the project has
`prettier-plugin-apex` in `node_modules` (otherwise prettier can't parse Apex):

```bash
npm install --save-dev prettier prettier-plugin-apex
cat > .prettierrc << EOF
{
  "plugins": ["prettier-plugin-apex"],
  "overrides": [{ "files": ["*.cls", "*.trigger", "*.apex"], "options": { "parser": "apex" } }]
}
EOF
```

### sf.nvim

Org, deploy, retrieve, test and metadata workflows come from
[sf.nvim](https://github.com/xixiaofinland/sf.nvim) on `<leader>m` (see
[Salesforce keys](#salesforce-leaderm)). The statusline shows the target org
and the current file's test coverage.

---

## Configuration Installation

### Clone Dotfiles Repository

This configuration is part of a larger dotfiles repository managed
with [GNU Stow](https://www.gnu.org/software/stow/):

```bash
git clone git@github.com:zacherytapp/dots.git ~/projects/dots
cd ~/projects/dots
stow .
```

See the top-level `README.md` in the dots repository for handling conflicts with
existing files.

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
- ✅ fzf-lua - fzf, ripgrep and fd found
- ✅ mason - All core utils found
- ✅ vim.lsp - No errors
- ✅ clipboard - xclip found

**Expected Warnings (Safe to Ignore):**

- ⚠️ mason - Composer warning (if not using PHP)
- ⚠️ mason - Julia warning (if not using Julia)
- ⚠️ overseer - Various task runner warnings (project-specific)
- ⚠️ snacks.image - Image rendering tools (optional features)

**Must Fix if Present:**

- ❌ vim.provider - Python/Node.js/Ruby providers not found
- ❌ lazy.nvim - Git not found
- ❌ fzf-lua - fzf, ripgrep or fd not found

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

```vim
" Attached clients and their configuration
:LspInfo            " (<leader>cl)
" Configured servers whose command isn't installed yet
:LspMissing
" Linters / formatters that apply to the current buffer
:LintInfo
:ConformInfo
" Server logs
:LspLog
" Install / inspect tools
:Mason              " (<leader>cm)
```

Mason installs run in the background on first start. Servers start as soon as
their package finishes installing. Salesforce Apex / Visualforce / Aura servers
come from `:SalesforceLspInstall`, and `rust-analyzer` from `rustup component
add rust-analyzer` (see [Tools Mason can't install](#tools-mason-cant-install)).

#### Treesitter Compilation Fails

```bash
# Ensure C compiler is installed
gcc --version

# Manually reinstall a parser
:TSInstall <language>
# Example: :TSInstall lua
```

#### fzf-lua Not Finding Files

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

### Test the Picker

- `<leader><space>` - Find files (root dir)
- `<leader>/` - Grep (root dir)
- `<leader>,` - Buffers
- `<leader>k` - Command palette

### Test Treesitter

- Open a source file
- Run `:InspectTree`
- Should see AST visualization

---

## Key Bindings

`<leader>` is `Space`. The layout follows [LazyVim's keymaps](https://www.lazyvim.org/keymaps).
Every binding appears in two places:

- **`<leader>k`**: commander palette (fuzzy search over every keymap and palette-only command)
- **which-key**: press `<leader>` (or `g`, `[`, `]`, `z`, ...) and wait; `<leader>?` shows buffer-local keys

How keymaps are declared is documented at the top of `lua/config/keymaps.lua`.

### General

| Key | Action |
| --- | --- |
| `<leader>k` | Command palette (commander) |
| `<C-s>` | Save file |
| `<Esc>` | Clear search highlight |
| `<C-h/j/k/l>` | Move between windows |
| `<C-Up/Down/Left/Right>` | Resize window |
| `<M-h/j/k/l>` | Move line / selection (mini.move) |
| `s` / `S` | Flash jump / Flash treesitter select |
| `gsa` `gsd` `gsr` `gsf` `gsh` | Surround add / delete / replace / find / highlight |
| `gS` / `gJ` | Split / join arguments |
| `gco` / `gcO` | Add comment below / above |
| `<C-a>` / `<C-x>` | Increment / decrement (incl. true/false, enable/disable) |
| `-` | Oil: parent directory |
| `<leader>p` (visual) | Paste without yanking the selection |
| `<leader>y` / `<leader>Y` | Yank to system clipboard |
| `<leader>l` | Lazy |
| `<leader>cm` | Mason |
| `<leader>.` / `<leader>S` | Scratch buffer / select scratch |
| `<C-/>` | Terminal (root dir) |
| `<leader>K` | Keywordprg |

### Files, buffers, windows, tabs

| Key | Action |
| --- | --- |
| `<leader><space>` | Find files (root dir) |
| `<leader>ff` / `<leader>fF` | Find files (root dir / cwd) |
| `<leader>fr` / `<leader>fR` | Recent files (all / cwd) |
| `<leader>fg` | Git files |
| `<leader>fb` / `<leader>,` | Buffers |
| `<leader>fc` | Config files |
| `<leader>fp` | Files in `~/projects` |
| `<leader>fn` | New file |
| `<leader>fe` / `<leader>fE` | Neo-tree (root dir / cwd), also `<leader>e` / `<leader>E` |
| `<leader>fo` | Oil (float, cwd) |
| `<leader>ft` / `<leader>fT` | Terminal (root dir / cwd) |
| `<S-h>` / `<S-l>`, `[b` / `]b` | Previous / next buffer |
| `[B` / `]B` | Move buffer left / right |
| `<leader>bb`, ``<leader>` `` | Alternate buffer |
| `<leader>bd` / `<leader>bD` | Delete buffer / buffer and window |
| `<leader>bo` | Delete other buffers |
| `<leader>bp` / `<leader>bP` | Pin buffer / delete unpinned buffers |
| `<leader>br` / `<leader>bl` | Delete buffers to the right / left |
| `<leader>bj` | Pick buffer |
| `<leader>be` | Buffer explorer |
| `<leader>-` / `<leader>\|` | Split below / right |
| `<leader>wd` | Close window |
| `<leader>wm`, `<leader>uZ` | Zoom window |
| `<leader>w…` | Any `<C-w>` command (`<C-w><space>` = window hydra) |
| `<leader><tab><tab>` | New tab |
| `<leader><tab>]` / `<leader><tab>[` | Next / previous tab |
| `<leader><tab>d` / `<leader><tab>o` | Close tab / close other tabs |
| `<leader><tab>f` / `<leader><tab>l` | First / last tab |
| `<leader>h` / `<leader>H` | Harpoon menu / harpoon file |
| `<leader>1` … `<leader>9` | Harpoon file 1…9 |
| `<leader>qq` | Quit all |
| `<leader>qs` / `<leader>ql` / `<leader>qS` | Restore session (cwd / last / select) |
| `<leader>qd` | Don't save the current session |

### Search

| Key | Action |
| --- | --- |
| `<leader>/` | Grep (root dir) |
| `<leader>sg` / `<leader>sG` | Grep (root dir / cwd) |
| `<leader>sw` / `<leader>sW` | Word or selection (root dir / cwd) |
| `<leader>sb` | Lines in buffer |
| `<leader>ss` / `<leader>sS` | LSP symbols (buffer / workspace) |
| `<leader>sd` / `<leader>sD` | Diagnostics (buffer / workspace) |
| `<leader>sr` | Search and replace (grug-far, visual selection too) |
| `<leader>sF` | Search and replace in the current file |
| `<leader>sh` / `<leader>sk` / `<leader>sC` | Help / keymaps / commands |
| `<leader>:`, `<leader>sc` | Command history |
| `<leader>sj` / `<leader>sm` / `<leader>s"` | Jumps / marks / registers |
| `<leader>sq` / `<leader>sl` | Quickfix / location list |
| `<leader>sR` | Resume last picker |
| `<leader>st` / `<leader>sT` | Todo comments (all / TODO,FIX,FIXME) |
| `<leader>su` | Undo tree |
| `<leader>sN` | Notification history |
| `<leader>snl` `snh` `sna` `snd` `snt` | Noice: last / history / all / dismiss / picker |
| `<leader>sH` / `<leader>sa` / `<leader>sM` | Highlights / autocommands / man pages |
| `<leader>uC` | Colorschemes |

In fzf-lua pickers: `<C-q>` sends everything to quickfix, `<M-i>` toggles ignored
files, `<M-h>` hidden files.

### Code / LSP

| Key | Action |
| --- | --- |
| `gd` / `gr` / `gI` / `gy` / `gD` | Definition / references / implementation / type definition / declaration |
| `K` / `gK` | Hover / signature help (`<C-k>` in insert mode) |
| `]]` / `[[` | Next / previous reference of the word under the cursor |
| `<leader>ca` / `<leader>cA` | Code action / source action |
| `<leader>cr` | Rename symbol |
| `<leader>cR` | Rename file (updates imports) |
| `<leader>cf` | Format buffer / selection |
| `<leader>cJ` | Format buffer as JSON (jq) |
| `<leader>cd` | Line diagnostics |
| `<leader>cs` / `<leader>cS` | Symbols outline / LSP references (Trouble) |
| `<leader>cc` / `<leader>cC` | Run codelens / toggle codelens |
| `<leader>cl` / `<leader>cL` | LSP info / restart LSP |
| `<leader>cwa` `cwr` `cwl` | Workspace folders add / remove / list |
| `<leader>cxa` `cxA` `cxf` `cxF` `cxp` `cxP` | Swap argument / function / property with next / previous |
| `]f` `[f` `]c` `[c` `]a` `[a` | Next / previous function, class, argument (capitals = end) |
| `]i` `[i` `]o` `[o` | Next / previous conditional, loop |
| `af` `if` `ac` `ic` `ao` `io` `aa` `ia` `at` `au` `ag` | Textobjects: function, class, block, argument, tag, call, buffer |

Language-specific (buffer-local):

| Key | Where | Action |
| --- | --- | --- |
| `gD` / `gR` | TS/JS | Source definition / file references |
| `<leader>co` / `<leader>cM` / `<leader>cu` / `<leader>cD` | TS/JS | Organize / add missing / remove unused imports / fix all |
| `<leader>cV` / `<leader>cp` / `<leader>ck` | TS/JS | TS version / goto tsconfig / type-check project |
| `<leader>cn…` | package.json | npm: `s` show versions, `u` update, `d` delete, `i` install, `v` change version |
| `<leader>cgt` `cgT` `cge` `cgi` `cgg` `cgG` `cgm` | Go | Tags add/remove, if err, implement interface, generate tests, mod tidy |
| `<leader>cv` | Python | Select virtualenv |
| `<leader>cR` / `<leader>ce` / `<leader>cE` / `<leader>cX` | Rust | Grouped code action / expand macro / explain error / runnables |
| `<leader>dr` | Rust | Debuggables |
| `<leader>ta` | Ansible | Run playbook / role |

### Diagnostics / quickfix

| Key | Action |
| --- | --- |
| `]d` `[d` / `]e` `[e` / `]w` `[w` | Next / previous diagnostic / error / warning |
| `<leader>xx` / `<leader>xX` | Diagnostics (Trouble: workspace / buffer) |
| `<leader>xL` / `<leader>xQ` | Location list / quickfix (Trouble) |
| `<leader>xl` / `<leader>xq` | Location list / quickfix (native) |
| `[q` / `]q` | Previous / next quickfix item |
| `<leader>xt` / `<leader>xT` | Todo comments (Trouble) |
| `]t` / `[t` | Next / previous todo comment |

### Git

| Key | Action |
| --- | --- |
| `<leader>gg` / `<leader>gG` | Lazygit (root dir / cwd) |
| `<leader>gl` / `<leader>gL` | Lazygit log / current file history |
| `<leader>gs` / `<leader>gc` / `<leader>gC` | Status / commits / buffer commits |
| `<leader>gr` / `<leader>gS` | Branches / stash |
| `<leader>gb` | Blame line |
| `<leader>gB` / `<leader>gY` | Open in browser / copy URL |
| `<leader>gd` / `<leader>gD` | Diffview open / close |
| `<leader>gf` / `<leader>gF` | File history / repo history (Diffview) |
| `<leader>gv` | Fugitive status |
| `<leader>ge` | Git explorer (Neo-tree) |
| `]h` / `[h`, `]H` / `[H` | Next / previous hunk, last / first hunk |
| `<leader>ghs` / `<leader>ghr` | Stage / reset hunk (visual: selection) |
| `<leader>ghS` / `<leader>ghR` / `<leader>ghu` | Stage buffer / reset buffer / undo stage |
| `<leader>ghp` / `<leader>ghb` / `<leader>ghB` | Preview hunk / blame line / blame buffer |
| `<leader>ghd` / `<leader>ghD` | Diff this / diff against `~` |
| `ih` | Hunk textobject |
| `<leader>gpl` `gpc` `gpr` `gpR` | Octo: list / create PR, start / submit review |
| `<leader>gil` `gic` | Octo: list / create issue |
| `co` `ct` `cb` `c0`, `]x` `[x` | Conflicts: ours / theirs / both / none, next / previous |

### Test

| Key | Action |
| --- | --- |
| `<leader>tr` | Run nearest |
| `<leader>tt` / `<leader>tT` | Run file / all test files |
| `<leader>tl` | Run last |
| `<leader>td` | Debug nearest |
| `<leader>ts` / `<leader>to` / `<leader>tO` | Summary / output / output panel |
| `<leader>tw` / `<leader>tS` / `<leader>ta` | Watch file / stop / attach |
| `<leader>tc` / `<leader>tC` | Go coverage toggle / load |

### Debug (DAP)

| Key | Action |
| --- | --- |
| `<leader>db` / `<leader>dB` / `<leader>dL` | Toggle breakpoint / conditional breakpoint / log point |
| `<leader>dx` | Clear breakpoints |
| `<leader>dc` / `<leader>da` / `<leader>dl` | Run or continue / run with args / run last |
| `<leader>dC` / `<leader>dg` | Run to cursor / go to line without running |
| `<leader>di` / `<leader>do` / `<leader>dO` | Step into / out / over |
| `<leader>dj` / `<leader>dk` | Down / up the stack |
| `<leader>dp` / `<leader>dt` / `<leader>dR` | Pause / terminate / restart |
| `<leader>du` / `<leader>de` / `<leader>dw` | DAP UI / evaluate / widgets |
| `<leader>dr` / `<leader>ds` | REPL / session |
| `<leader>dPt` / `<leader>dPc` | Python: debug test method / class |

`.vscode/launch.json` configurations are picked up automatically.

### Salesforce (`<leader>m`)

| Key | Action |
| --- | --- |
| `<leader>mof` `mog` `moG` | Fetch org list / set target org / set global target org |
| `<leader>moo` `moF` `mol` | Open org / open current file in org / pull Apex log |
| `<leader>mds` / `<leader>mdd` | Save and push file / deploy project delta |
| `<leader>mrf` `mrd` `mra` `mrp` | Retrieve file / project delta / Apex under cursor / package |
| `<leader>mct` / `<leader>mco` | Diff file against target org / chosen org |
| `<leader>mqq` | Run SOQL in file (visual: selection) |
| `<leader>mqt` / `<leader>mqa` / `<leader>mqb` | Tooling query / run file as anonymous Apex / run unsaved buffer |
| `<leader>mtm` `mtf` | Test method / file with coverage |
| `<leader>mtM` `mtF` | Test method / file (quick, no coverage) |
| `<leader>mto` `mtr` `mtl` | Select tests / repeat last / all local tests |
| `<leader>mtj` `mtJ` | All Jest tests / Jest tests in file |
| `<leader>mts`, `]v` / `[v` | Toggle coverage signs, next / previous uncovered line |
| `<leader>mnc` `mnt` `mnw` `mna` | New Apex class / trigger / LWC / Aura bundle |
| `<leader>mng` / `<leader>mnG` | Generate ctags / generate and list |
| `<leader>mmr` `mmt` `mmp` `mmT` `mmP` | Metadata: list / list types / pull names / pull types / set package |
| `<leader>mms` | Refresh sObject definitions (Apex completion) |
| `<leader>my` | Copy Apex class name |
| `<leader>mT` / `<leader>mC` | Toggle SF terminal / cancel running command |
| `<leader>mxd` / `<leader>mxr` | Delete Apex / rename Apex class (org + local) |

Palette-only (`<leader>k`): install/update Salesforce LSPs, LSP versions,
refresh custom sObjects, `cd` terminal to project root.

### AI

| Key | Action |
| --- | --- |
| `<C-l>` / `<C-u>` (insert) | Copilot: accept / dismiss suggestion |
| `<leader>aa` / `<leader>a+` | OpenCode: ask about this / add this to the prompt |
| `<leader>as` / `<leader>ac` | OpenCode: select prompt / command |
| `<leader>at` / `<leader>an` / `<leader>ai` / `<leader>aA` | OpenCode: toggle / new session / interrupt / cycle agent |

### Notes (Obsidian, `<leader>n`)

| Key | Action |
| --- | --- |
| `<leader>nf` / `<leader>no` / `<leader>ns` | Find note file / open note / search |
| `<leader>nn` / `<leader>nd` | New note / daily note |
| `<leader>nb` / `<leader>nl` / `<leader>nt` | Backlinks / links / tags |
| `<leader>nr` / `<leader>np` | Rename / paste image |

### Overseer (`<leader>o`)

| Key | Action |
| --- | --- |
| `<leader>ow` / `<leader>oo` / `<leader>os` / `<leader>ot` | Task list / run task / shell command / task action |

### UI toggles (`<leader>u`)

| Key | Toggle |
| --- | --- |
| `<leader>uf` / `<leader>uF` | Format on save (buffer / global) |
| `<leader>uh` | Inlay hints |
| `<leader>ud` | Diagnostics |
| `<leader>us` / `<leader>uw` | Spelling / wrap |
| `<leader>ul` / `<leader>uL` | Line numbers / relative numbers |
| `<leader>ug` / `<leader>ut` | Indent guides / treesitter context |
| `<leader>uc` / `<leader>uA` | Conceal / tabline |
| `<leader>uT` / `<leader>uG` | Treesitter highlighting / git signs |
| `<leader>ub` / `<leader>uD` | Dark background / dim inactive code |
| `<leader>uz` / `<leader>uZ` / `<leader>uS` | Zen / zoom / smooth scroll |
| `<leader>un` / `<leader>ur` | Dismiss notifications / redraw |
| `<leader>ui` / `<leader>uI` | Inspect highlight / treesitter tree |

### Completion (blink.cmp)

| Key | Action |
| --- | --- |
| `<CR>` | Accept |
| `<Tab>` / `<S-Tab>` | Next / previous item or snippet field |
| `<C-n>` / `<C-p>`, `<Up>` / `<Down>` | Next / previous item |
| `<C-y>` | Show completion / toggle docs |
| `<C-e>` | Close menu (`<C-E>` also cycles LuaSnip choices) |
| `<C-u>` / `<C-d>` | Scroll docs |
