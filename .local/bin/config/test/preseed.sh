#!/usr/bin/env bash
# Gives the test user the state a real machine already has, then checks what
# install.sh did with it. Shell, not TypeScript: `seed` runs before install.sh
# has bootstrapped Node. Run as the test user inside the container:
#
#   ./test/preseed.sh seed    existing rc files, git identity, ssh key and gpg key
#   ./test/preseed.sh check   the stow step moved the rc files and ~/.gitconfig
#                             to ~/.dots-backup unchanged and linked the repo's
#                             (unmodified) versions; keys were reused, not replaced
set -uo pipefail

STATE=/tmp/preseed.state
REPO=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../../.." &>/dev/null && pwd)
# every one of these is also tracked in the repo, so stow has to back it up
STOWED=(.zshrc .bashrc .bash_profile .profile .gitconfig)

keys() {
  printf 'ssh %s\n' "$(ssh-keygen -lf "$HOME/.ssh/id_ed25519.pub")"
  printf 'gpg %s\n' "$(gpg --list-secret-keys --with-colons | awk -F: '$1 == "fpr" {print $10}' | tr '\n' ' ')"
}

case "${1:-}" in
seed)
  # a real machine already has these; the bootstrap images don't
  if ! command -v ssh-keygen >/dev/null || ! command -v gpg >/dev/null || ! command -v git >/dev/null; then
    if command -v pacman >/dev/null; then
      sudo pacman -S --needed --noconfirm openssh gnupg git
    elif command -v apt-get >/dev/null; then
      sudo apt-get update -q && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -q openssh-client gpg gpg-agent git
    else
      sudo dnf install -y openssh-clients gnupg2 git
    fi
  fi
  for f in .zshrc .bashrc .bash_profile .profile; do
    printf '# preseeded %s, a distro default the dotfiles replace\n' "$f" >"$HOME/$f"
  done
  git config --global user.name "Existing Name"
  git config --global user.email "existing@example.com"
  install -d -m 700 "$HOME/.ssh"
  ssh-keygen -t ed25519 -N "" -q -C preseed -f "$HOME/.ssh/id_ed25519"
  # a decoy whose email contains USER_EMAIL, created first so a substring
  # lookup would pick it; then the key install.sh must reuse rather than add a second
  gpg --batch --passphrase '' --quick-gen-key "Decoy <decoy.${USER_EMAIL}>" ed25519 default never 2>/dev/null
  gpg --batch --passphrase '' --quick-gen-key "Existing Name <${USER_EMAIL}>" ed25519 default never 2>/dev/null
  gpg --list-secret-keys --with-colons "<${USER_EMAIL}>" | awk -F: '$1 == "fpr" {print $10; exit}' >"$STATE.key"
  keys >"$STATE"
  rm -rf "$STATE.home" "$STATE.repo"
  mkdir -p "$STATE.home" "$STATE.repo"
  for f in "${STOWED[@]}"; do
    cp "$HOME/$f" "$STATE.home/$f"
    cp "$REPO/$f" "$STATE.repo/$f"
  done
  cat "$STATE"
  ;;
check)
  rc=0
  if diff -u "$STATE" <(keys); then
    echo "preseed: ssh and gpg keys untouched"
  else
    echo "preseed: ssh or gpg keys CHANGED (diff above)"
    rc=1
  fi
  for f in "${STOWED[@]}"; do
    # exactly one backup, byte-identical to what was there before
    mapfile -t backups < <(find "$HOME/.dots-backup" -path "*/$f" -type f 2>/dev/null)
    if [ ${#backups[@]} -ne 1 ]; then
      echo "preseed: expected one backup of ~/$f, found ${#backups[@]}: ${backups[*]}"
      rc=1
    elif ! cmp -s "${backups[0]}" "$STATE.home/$f"; then
      echo "preseed: backup of ~/$f differs from the original"
      diff -u "$STATE.home/$f" "${backups[0]}"
      rc=1
    fi
    if [ "$(readlink -f "$HOME/$f")" != "$(readlink -f "$REPO/$f")" ]; then
      echo "preseed: ~/$f is not linked to the repo: $(ls -l "$HOME/$f")"
      rc=1
    fi
    # nothing may write into the repo through the link
    if ! cmp -s "$REPO/$f" "$STATE.repo/$f"; then
      echo "preseed: the repo's $f was modified"
      diff -u "$STATE.repo/$f" "$REPO/$f"
      rc=1
    fi
  done
  [ "$rc" -eq 0 ] && echo "preseed: rc files and ~/.gitconfig backed up intact, repo versions linked unmodified"
  # pass must use the existing key for USER_EMAIL, not the decoy
  fpr=$(cat "$STATE.key")
  if grep -qi "${fpr: -16}" "$HOME/.password-store/.gpg-id"; then
    echo "preseed: pass uses the existing key"
  else
    echo "preseed: pass was initialised with a different key: $(cat "$HOME/.password-store/.gpg-id")"
    rc=1
  fi
  exit "$rc"
  ;;
*)
  echo "usage: $0 seed|check" >&2
  exit 2
  ;;
esac
