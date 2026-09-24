#!/usr/bin/env bash
# Gives the test user the state a real machine already has, then checks that
# run.sh left it alone. Run as the test user inside the container:
#
#   ./test/preseed.sh seed    existing rc files, git identity, ssh key and gpg key
#   ./test/preseed.sh check   fails if any of them changed or were duplicated
set -uo pipefail

STATE=/tmp/preseed.state
RC_FILES=(.zshrc .zprofile .bashrc .bash_profile .profile)

describe() {
  local f
  for f in "${RC_FILES[@]}"; do
    printf 'rc %s %s\n' "$f" "$(sha256sum <"$HOME/$f" | cut -d' ' -f1)"
  done
  printf 'git user.name %s\n' "$(git config --global user.name)"
  printf 'git user.email %s\n' "$(git config --global user.email)"
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
  # stand-ins for stowed dotfiles; installers must not edit them
  for f in "${RC_FILES[@]}"; do
    printf '# preseeded %s, owned by the dotfiles repo\n' "$f" >"$HOME/$f"
  done
  git config --global user.name "Existing Name"
  git config --global user.email "existing@example.com"
  install -d -m 700 "$HOME/.ssh"
  ssh-keygen -t ed25519 -N "" -q -C preseed -f "$HOME/.ssh/id_ed25519"
  # a decoy whose email contains USER_EMAIL, created first so a substring
  # lookup would pick it; then the key run.sh must reuse rather than add a second
  gpg --batch --passphrase '' --quick-gen-key "Decoy <decoy.${USER_EMAIL}>" ed25519 default never 2>/dev/null
  gpg --batch --passphrase '' --quick-gen-key "Existing Name <${USER_EMAIL}>" ed25519 default never 2>/dev/null
  gpg --list-secret-keys --with-colons "<${USER_EMAIL}>" | awk -F: '$1 == "fpr" {print $10; exit}' >"$STATE.key"
  describe >"$STATE"
  mkdir -p "$STATE.rc"
  for f in "${RC_FILES[@]}"; do
    cp "$HOME/$f" "$STATE.rc/$f"
  done
  cat "$STATE"
  ;;
check)
  rc=0
  if diff -u "$STATE" <(describe); then
    echo "preseed: existing user state untouched"
  else
    echo "preseed: existing user state CHANGED (diff above)"
    # show what was written into the rc files
    for f in "${RC_FILES[@]}"; do
      diff -u "$STATE.rc/$f" "$HOME/$f"
    done
    rc=1
  fi
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
