# Installer and setup

The machine installer for the dotfiles. It supports CachyOS, Arch, Fedora 44+ and Ubuntu 26.04+.
This directory is never stowed.

## Fresh machine

The installer does everything, including stowing:

```
git clone git@github.com:zacherytapp/dots.git ~/Projects/dots
cd ~/Projects/dots/.local/bin/config
sudo ./install.sh              # every default step for this distro
./install.sh --list            # the steps, in order
sudo ./install.sh node pmd     # only these steps
sudo ./install.sh gaming kvm   # opt-in steps
./install.sh verify            # check the result, as your normal user
```

`install.sh` is a small bash bootstrap. It downloads Node.js 24 into `~/.cache/dots-setup/`,
verifies it against nodejs.org's signed checksums, then runs the TypeScript installer in `src/`.
Delete that cache to get a newer Node.

- **Settings** come from the environment or a prompt: `USER_NAME`, `USER_EMAIL`,
  `SETUP_HOSTNAME` (default `behemoth`), `LOCAL_IP` (a CIDR to allow through ufw).
  `NONINTERACTIVE=1` never prompts and `SKIP_UPGRADE=1` skips the system upgrade.
- **Re-running is safe.** Steps only install what's missing.
- **Failures don't stop the run.** The summary lists them and the command to re-run only those.
  The log is `/var/log/dots-setup.log`.
- **In a container**, services, the firewall, the hostname and flatpaks are skipped.

Every distro gets, on top of its own packages:

- **Dotfiles.** Files a fresh install leaves in the way (`~/.bashrc`, ...) are moved to
  `~/.dots-backup/<timestamp>/` before linking.
- **Shell.** zsh as the login shell. Outside CachyOS it also gets oh-my-zsh, powerlevel10k and
  the autosuggestion and highlighting plugins. TPM for tmux.
- **Toolchains.** rustup, nvm with Node LTS, and pnpm with the Salesforce CLI, LWC language
  server, tree-sitter and formatters. Fedora and Ubuntu also get go, pipx, pyenv and Homebrew.
- **Neovim.** Everything its plugins shell out to, then the plugins at the `lazy-lock.json`
  commits. Fedora and Ubuntu build Neovim from source (`NVIM_REF`, `NVIM_REBUILD=1`).
- **Salesforce.** JDK 17+, PMD 7 in `/opt/pmd`, the Apex, Visualforce and Aura language servers,
  and `sf code-analyzer`.
- **AI agents.** Claude Code, herdr, Plannotator, pi and opencode.
- **Dictation.** hyprwhspr push-to-talk with local faster-whisper.
- **Security.** ufw, fail2ban, sshd hardening on Arch, and gpg, pass and ssh keys when none exist.

| Path                           | What it is                                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `src/distros/`                 | per-distro plans: `arch.ts` (CachyOS and Arch), `fedora.ts`, `ubuntu.ts`, `gnome.ts` (opt-in GNOME setup) |
| `src/steps/`                   | steps every distro shares                                                                                 |
| `src/desktop/`                 | Hyprland + Noctalia install and its pre-checks                                                            |
| `src/verify/`                  | what `install.sh verify` checks                                                                           |
| `test/`                        | Docker tests                                                                                              |
| `cachy/`, `fedora/`, `ubuntu/` | data files: jail.local, dconf dumps, the pacman package-list hook and its output                          |

## Desktop

- **Install.** The `desktop` step is a default on CachyOS and Arch and opt-in on Fedora and
  Ubuntu. Before installing, it checks that the distro has a new enough Hyprland (0.55+, for the
  Lua config). Ubuntu 26.04 only has 0.53, so it refuses there. It also warns about leftover bars,
  display managers and NVIDIA GPUs.
- **Login screen.** `sudo ./install.sh greeter` (opt-in) replaces gdm/sddm with
  noctalia-greeter on greetd.
- **Theme.** `.config/noctalia/palettes/GruvboxMaterial.json` drives Noctalia, whose templates
  render GTK, Qt, KDE, kitty, ghostty, alacritty and btop colors. The rendered files are
  committed, so apps are themed before Noctalia first runs. Hyprland (`colors.lua`), Neovim, tmux,
  herdr, fzf, bat/delta and the GNOME theme use the same hex values.
- **Settings drift.** The Noctalia settings window saves to `~/.local/state/noctalia/settings.toml`,
  which isn't stowed. Run `noctalia-sync` to diff it against the repo and copy what you want into
  `config.toml`. Then `noctalia-sync --clear` makes the repo the only source again.

## AI agents

The `claude`, `herdr` and `agents` steps add the tools themselves. The `agents` step then fails if
any linked skill, rule, hook or settings file isn't the repo's copy, and runs `hook-doctor` to
check every hook can run. `install.sh verify` repeats both checks.

Some things are untracked on purpose: credentials, history, sessions, caches, project memory,
`~/.claude/plugins`, and files that herdr, Plannotator and pi generate.

## Testing the installer

From the repo root, run `pnpm test:install <arch|cachy|fedora|ubuntu|all> [step ...]`. It builds
a fresh image, runs the install as a sudo user, then runs `verify`. The image gets the repo the
way a fresh clone would, plus your uncommitted edits. Logs go to `.local/bin/config/test/logs/`.

- `IDEMPOTENCY=1` installs twice and fails if the second run changed anything.
- `PRESEED=1` starts from a home with existing rc files and keys, and checks they were backed up
  and reused.
- `NO_VERIFY=1` skips verify, for when you run only some steps.

A run also fails if the install modified the repo checkout.

## Stowing by hand

`.stowrc` targets `~` with `--no-folding`, so only files are linked. Existing directories are
merged rather than replaced, and apps that write logs next to their config never write into the
repo. `.stow-local-ignore` keeps repo-only files out of `$HOME`.

```
cd ~/Projects/dots
stow -n -v .                     # dry run
stow .                           # link everything
stow --adopt . && git restore .  # replace conflicting files with the repo's versions
stow --ignore='hypr' .           # skip parts that don't apply
stow -R .                        # relink after adding or removing files
stow -D .                        # remove all links
```

If a machine's config is newer, run `stow --adopt .`, review the result with `git diff` and
commit it.

Editing a linked file edits the repo. Some apps (GUI settings panels, Noctalia, qt6ct, skill
installers) save by replacing the symlink with a regular file. If `git status` stays clean after
you change a setting, run `stow --adopt .` to pull the file back into the repo.

## Machine-specific settings

Things that only fit one machine stay out of the repo. The shared configs load them from files
that live only in `$HOME` (with `--no-folding` these directories are real, so nothing lands in
the repo):

- `~/.config/shell/local.sh`: sourced last by `.profile`, `.bashrc` and `.zshrc` (`.bash_profile`
  gets it through `.profile`); POSIX sh. Move PATH lines that installers append to the rc files
  (LM Studio's `lms`, for example) here.
- `~/.config/hypr/local/variables.lua`: loaded at the end of `config/variables.lua`, for
  `MONITOR1..3`, `PRIMARY_MONITOR` and `MONITOR_SCALE` (monitor descriptions carry serial
  numbers).
- `~/.config/hypr/local/monitors.lua`: replaces the default rule in `config/monitors.lua` with
  this machine's monitor layout.
- `~/.config/cachy/pkglist.ignore`: packages the pacman hook leaves out of the pkglists, one per
  line.

Some apps write machine-local keys into stowed JSON files: `autoMode` in
`~/.claude/settings.json` (from `/auto-mode-setup`), and pi's provider, model and changelog state
in `~/.pi/agent/settings.json`. `.gitattributes` runs both through `local-keys.sh`, a git filter
that keeps those keys on disk but out of diffs and commits (for pi, only `packages` is shared),
and puts them back after a checkout or pull. The filter is per clone: the installer's dotfiles
step registers it, and after a manual clone run `.local/bin/config/local-keys.sh install`. If
`git status` lists one of these files while `git diff` is empty, only local keys changed: `git
add` it to refresh the index (nothing gets staged). To cover another file, add it to
`.gitattributes` and to `shared()` in the script.

## Repo tooling

The dev tooling lives at the repo root and isn't stowed: one pnpm `package.json`, TypeScript,
Prettier and markdownlint. It needs Node 24+, pnpm, `jq` and ShellCheck.

```
pnpm install
pnpm check    # lint, typecheck, tests, JSON, skills, shell scripts, built Herdr mods
pnpm format
```
