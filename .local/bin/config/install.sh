#!/usr/bin/env bash
# Bootstrap for the TypeScript installer in src/. This is the only piece that has
# to be shell: it runs before Node.js exists. On the first run it fetches the
# latest Node.js ${NODE_MAJOR}.x from nodejs.org into the real user's cache and
# checks it against the release's SHASUMS256.txt, whose signature is verified
# with the Node.js release keys from github.com/nodejs/release-keys (a second
# host, so a compromised nodejs.org alone can't pass). Later runs reuse that
# copy; delete ~/.cache/dots-setup to fetch a newer one. Every argument goes to
# src/main.ts.
#
#   sudo ./install.sh              all default steps for this distro
#   sudo ./install.sh node pmd     only these steps
#   ./install.sh --list            list the steps
#   ./install.sh verify            check the result, as your normal user
#
# Settings: USER_NAME, USER_EMAIL, SETUP_HOSTNAME, LOCAL_IP (prompted for when
# unset and interactive), NONINTERACTIVE=1, SKIP_UPGRADE=1.
set -euo pipefail

NODE_MAJOR=24
RELEASE_KEYS=https://raw.githubusercontent.com/nodejs/release-keys/HEAD/gpg-only-active-keys/pubring.kbx
SETUP_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)

real_user=${SUDO_USER:-$(id -un)}
real_home=$(getent passwd "$real_user" | cut -d: -f6)
cache="$real_home/.cache/dots-setup"
node_dir="$cache/node-v$NODE_MAJOR"

# the cache belongs to the user even when this runs under sudo
as_real() {
  if [ "$(id -un)" = "$real_user" ]; then
    "$@"
  else
    sudo -u "$real_user" -H "$@"
  fi
}

# https only, redirects included (the same flags as src/lib/net.ts)
fetch() {
  as_real curl --proto =https --proto-redir =https --tlsv1.2 -fsSL --retry 3 -o "$1" "$2"
}

ensure_tools() {
  local tool missing=()
  for tool in curl tar gzip sha256sum gpgv; do
    command -v "$tool" >/dev/null || missing+=("$tool")
  done
  [ ${#missing[@]} -eq 0 ] && return 0
  if [ "$EUID" -ne 0 ]; then
    echo "install.sh: ${missing[*]} missing; run it once with sudo to install them" >&2
    exit 1
  fi
  echo "install.sh: installing ${missing[*]}"
  if command -v pacman >/dev/null; then
    pacman -S --needed --noconfirm curl tar gzip coreutils gnupg
  elif command -v apt-get >/dev/null; then
    apt-get update -q
    DEBIAN_FRONTEND=noninteractive apt-get install -y -q curl ca-certificates tar gzip coreutils gpgv
  elif command -v dnf >/dev/null; then
    dnf install -y curl tar gzip coreutils gnupg2
  else
    echo "install.sh: no supported package manager (pacman, apt-get, dnf)" >&2
    exit 1
  fi
}

fetch_node() {
  local arch base tmp file log
  case "$(uname -m)" in
  x86_64) arch=x64 ;;
  aarch64 | arm64) arch=arm64 ;;
  *)
    echo "install.sh: unsupported architecture $(uname -m)" >&2
    exit 1
    ;;
  esac
  base="https://nodejs.org/dist/latest-v${NODE_MAJOR}.x"

  as_real mkdir -p "$cache"
  tmp=$(as_real mktemp -d "$cache/tmp.XXXXXX")
  # shellcheck disable=SC2064 # expand now, the variable is local
  trap "as_real rm -rf '$tmp'" EXIT

  fetch "$tmp/SHASUMS256.txt" "$base/SHASUMS256.txt"
  fetch "$tmp/SHASUMS256.txt.sig" "$base/SHASUMS256.txt.sig"
  fetch "$tmp/release-keys.kbx" "$RELEASE_KEYS"
  # output captured, not redirected into $tmp: a root redirect there would
  # leave a root-owned file in the cache and follow a symlink planted in it
  if ! log=$(as_real gpgv --keyring "$tmp/release-keys.kbx" "$tmp/SHASUMS256.txt.sig" "$tmp/SHASUMS256.txt" 2>&1); then
    echo "$log" >&2
    echo "install.sh: $base/SHASUMS256.txt is not signed by a Node.js release key" >&2
    exit 1
  fi
  file=$(awk -v want="linux-$arch.tar.gz" '$2 ~ ("^node-v[0-9.]+-" want "$") {print $2; exit}' "$tmp/SHASUMS256.txt")
  if [ -z "$file" ]; then
    echo "install.sh: no linux-$arch tarball listed in $base/SHASUMS256.txt" >&2
    exit 1
  fi
  echo "install.sh: fetching $file"
  fetch "$tmp/$file" "$base/$file"
  # exact match on the name: grep would read its dots as wildcards
  (cd "$tmp" && awk -v f="$file" '$2 == f' SHASUMS256.txt | sha256sum -c --strict --quiet -)
  as_real tar -xzf "$tmp/$file" -C "$tmp"
  # as the user, like everything in the cache: root rm -rf would follow a
  # symlinked ~/.cache or ~/.cache/dots-setup out of the home
  as_real rm -rf "$node_dir"
  as_real mv "$tmp/${file%.tar.gz}" "$node_dir"
  as_real rm -rf "$tmp"
  trap - EXIT
}

if [ ! -x "$node_dir/bin/node" ]; then
  ensure_tools
  fetch_node
fi

exec "$node_dir/bin/node" --disable-warning=ExperimentalWarning "$SETUP_DIR/src/main.ts" "$@"
