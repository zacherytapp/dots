# Zakk's Dotfiles

The tools and apps I use day to day, plus a running to-do list. My work is mostly Salesforce,
Go and TypeScript on Linux, and everything is themed Gruvbox Material.

Want to install it or see how it works? The installer, stow and testing docs are in
[`.local/bin/config/README.md`](.local/bin/config/README.md).

## OS & desktop

- **[CachyOS](https://cachyos.org)** on my main machine; plain **Arch** works too. The installer also handles Fedora 44+ and Ubuntu 26.04+
- **[Hyprland](https://hypr.land)** (0.55+, Lua config), started through **uwsm**
- **[Noctalia](https://noctalia.dev)** shell for the bar, launcher, notifications, lock screen, OSD, clipboard and screenshots
- **noctalia-greeter** on **greetd** for the login screen
- **Gruvbox Material** everywhere: GTK, Qt/KDE, terminals, Neovim, tmux, herdr, fzf, bat/delta
- **paru** for the AUR
- Fonts: JetBrains Mono Nerd, Maple Mono, Fira Code; Bibata cursors

## Terminal & shell

- **[Ghostty](https://ghostty.org)** and **kitty** (alacritty config kept around)
- **zsh** with **powerlevel10k**, autosuggestions and syntax highlighting
- **tmux** with TPM, plus `tmux-sessionizer` / `tmux-windowizer` scripts for jumping between projects
- **[herdr](https://herdr.dev)**, set up to mirror my tmux config, with custom mods for sessions, git branches, GitHub PRs and issues, Jira, Forgejo, and agent status
- CLI staples: fzf, ripgrep, fd, bat, git-delta, lazygit, gh, jq, btop, fastfetch, GNU Stow

## Editor

- **Neovim** with lazy.nvim, laid out like LazyVim: blink.cmp, fzf-lua, snacks, treesitter, conform, nvim-lint, neotest, nvim-dap, harpoon, oil, obsidian.nvim. Details in [`.config/nvim/README.md`](.config/nvim/README.md)
- **VS Code** as a backup editor

## Salesforce development

- **Salesforce CLI** (`sf`) with the **Code Analyzer** plugin
- **PMD 7** for Apex static analysis, with a custom ruleset in `.config/nvim/pmd/apex.xml`
- **Apex, Visualforce and Aura language servers**, pulled from Salesforce's VS Code extensions so they run in Neovim, plus the **LWC language server**
- **JDK 17+** (the Apex LSP, PMD and Code Analyzer need it)
- Neovim support for Apex, LWC, Visualforce, Aura and SOQL
- `sf-tmux-project` to lay out tmux windows for an sfdx project
- Claude Code hooks that check Apex quality, guard risky `sf` commands and SOQL, and run checks before an agent stops
- Agent skills for implementing, reviewing, debugging logs, managing orgs, cleaning up scratch orgs, and a pre-deploy quality gate

## Go development

- **Go** with **gopls**, **goimports**, **templ** and **shfmt**
- Neovim support for Go, Go templates, templ and Helm, with testing (neotest) and debugging (nvim-dap)
- `go-tmux-project` to lay out tmux windows for a Go module

## Other languages & toolchains

- **Node** through nvm (LTS) and **pnpm**; TypeScript, Prettier, prettierd, stylelint, markdownlint
- **Rust** through rustup with rust-analyzer
- **Python** with uv, pipx and pyenv
- Ruby, PHP/Composer, Lua/luarocks
- Homebrew on Fedora and Ubuntu

## Infrastructure & containers

- **Docker**, Docker Compose, buildx, lazydocker
- **Ansible**, **OpenTofu**, **Terraform**
- **Tailscale**, WireGuard, OpenVPN
- **QEMU/KVM** with libvirt and virt-manager (opt-in)

## AI & agents

- **[Claude Code](https://claude.com/claude-code)** with my own TypeScript hooks (guards for bash, git, secrets, sensitive data, prompt injection and file layout) and the [ClaudeCodeStatusLine](https://github.com/daniel3303/ClaudeCodeStatusLine) status line
- Shared **agent skills** in `.agents/` for PRs, code review, specs and tickets, merge conflicts, research and meeting notes
- **[Plannotator](https://plannotator.ai)** for reviewing and annotating agent plans in the browser
- **pi** and **opencode** as alternate agents
- **GitHub Copilot**, **minuet-ai** (local LLM completions) and **opencode.nvim** inside Neovim

## Self-hosted speech-to-text

Push-to-talk dictation that runs entirely on my machine. No audio leaves it.

- **[hyprwhspr](https://github.com/goodroot/hyprwhspr)** does the recording and pastes the text into whatever window has focus
- **Hold `SUPER+F` to talk, release to transcribe.** A Hyprland keybind drives it, not hyprwhspr's own shortcut
- **[faster-whisper](https://github.com/SYSTRAN/faster-whisper)** does the transcription. It uses `large-v3-turbo` on an NVIDIA GPU with CUDA and `small` on CPU-only machines
- **Offline only.** The installer downloads the model, and a systemd drop-in blocks model downloads after that. Cloud backends are never used
- **Primed for tech vocabulary.** An initial prompt lists terms like Hyprland, Apex, LWC, tmux and kubectl so they're spelled right
- Runs as a systemd user service that starts with the graphical session

## Apps

- **Browsers & communication:** Firefox, Google Chrome, Thunderbird, Slack, Discord, Zoom
- **Productivity:** Obsidian, LibreOffice, 1Password, Remmina, Meld
- **Media:** Spotify, VLC, GIMP, darktable, digiKam, gpu-screen-recorder
- **Files:** Dolphin, Nautilus
- **Gaming (opt-in):** Steam, Lutris, Wine, GameMode, MangoHud

## Security

- ufw firewall, fail2ban and a hardened sshd
- gpg and `pass` for secrets
- gitleaks secret scanning in GitHub Actions

## To-do

- [ ] Solve the Plymouth splash screen issue
