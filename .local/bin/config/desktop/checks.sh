#!/usr/bin/env bash
# Pre-install checks for the Hyprland + Noctalia desktop, shared by every
# distro's installer (arch, cachy, fedora, ubuntu). Sourced, never run.
#
# The dots config needs:
#   - Hyprland >= 0.55: .config/hypr is written in the Lua config format
#   - Noctalia v5: .config/noctalia/config.toml is the v5 (C++) format, the
#     old Quickshell-based noctalia-shell (v4) reads settings.json instead
#   - uwsm: the binds launch apps through `uwsm app --` and the session env
#     lives in .config/uwsm/env
#
# desktop_preflight_os and desktop_preflight print what they find and return
# non-zero only for problems that make the install pointless: an unsupported
# distro, release or architecture, or a Hyprland too old for the lua config.
# Everything else is a warning, so a re-run on a working machine is a no-op.

DESKTOP_MIN_HYPRLAND="0.55.0"
DESKTOP_MIN_FEDORA="44"
DESKTOP_MIN_UBUNTU="26.04"

_desk_info() { echo -e "\033[0;34m  $1\033[0m"; }
_desk_ok() { echo -e "\033[0;32m  ok    $1\033[0m"; }
_desk_warn() { echo -e "\033[1;33m  warn  $1\033[0m"; }
_desk_fail() { echo -e "\033[0;31m  FAIL  $1\033[0m"; }

# version_ge <a> <b>: true when version a >= version b
version_ge() {
  [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

# prints arch, cachyos, fedora or ubuntu (or the raw ID when unknown)
desktop_distro() {
  local id id_like
  # shellcheck disable=SC1091
  id=$(. /etc/os-release && echo "${ID:-}")
  # shellcheck disable=SC1091
  id_like=$(. /etc/os-release && echo "${ID_LIKE:-}")
  case "$id" in
  cachyos) echo cachyos ;;
  arch | endeavouros | manjaro) echo arch ;;
  fedora) echo fedora ;;
  ubuntu) echo ubuntu ;;
  *)
    case " $id_like " in
    *" arch "*) echo arch ;;
    *" fedora "*) echo fedora ;;
    *" ubuntu "*) echo ubuntu ;;
    *) echo "$id" ;;
    esac
    ;;
  esac
}

# installed Hyprland version, empty when not installed
hyprland_version() {
  command -v Hyprland &>/dev/null || return 0
  local runtime version
  # Hyprland aborts before printing its version when XDG_RUNTIME_DIR is unset,
  # which is the case under sudo and in containers
  runtime="${XDG_RUNTIME_DIR:-}"
  if [ -z "$runtime" ]; then
    runtime=$(mktemp -d)
    chmod 700 "$runtime"
  fi
  version=$(XDG_RUNTIME_DIR="$runtime" Hyprland --version 2>/dev/null |
    sed -n 's/^Hyprland \([0-9][0-9.]*\).*/\1/p' | head -n1) || true
  [ "$runtime" != "${XDG_RUNTIME_DIR:-}" ] && rm -rf "$runtime"
  # fall back to the package database
  if [ -z "$version" ]; then
    if command -v pacman &>/dev/null; then
      version=$(pacman -Q hyprland 2>/dev/null | awk '{print $2}')
    elif command -v rpm &>/dev/null; then
      version=$(rpm -q --qf '%{VERSION}' hyprland 2>/dev/null)
    elif command -v dpkg-query &>/dev/null; then
      version=$(dpkg-query -W -f='${Version}' hyprland 2>/dev/null)
    fi
    version=$(printf '%s' "$version" | grep -oE '^[0-9]+(\.[0-9]+)+' || true)
  fi
  echo "$version"
}

# installed Noctalia major version, empty when not installed
noctalia_major() {
  command -v noctalia &>/dev/null || return 0
  noctalia --version 2>/dev/null | sed -n 's/^noctalia v\{0,1\}\([0-9]*\).*/\1/p' | head -n1 || true
}

# the display manager systemd starts, e.g. greetd, sddm, gdm (empty if none)
display_manager() {
  local unit
  unit=$(readlink /etc/systemd/system/display-manager.service 2>/dev/null) || return 0
  basename "$unit" .service
}

# desktop_preflight_os: distro, release and architecture. Runs before any
# repo is added, so an unsupported machine is left untouched.
desktop_preflight_os() {
  local distro machine version rc=0
  distro=$(desktop_distro)
  machine=$(uname -m)
  # shellcheck disable=SC1091
  version=$(. /etc/os-release && echo "${VERSION_ID:-}")
  # rolling releases put a build id in VERSION_ID
  case "$distro" in arch | cachyos) version="rolling" ;; esac
  echo "desktop preflight ($distro $version, $machine):"

  case "$distro" in
  arch | cachyos) _desk_ok "distro: $distro" ;;
  fedora)
    # noctalia is in fedora from 44; the hyprland copr builds 44 and newer
    if version_ge "$version" "$DESKTOP_MIN_FEDORA"; then
      _desk_ok "distro: fedora $version"
    else
      _desk_fail "distro: fedora $version, noctalia and the hyprland copr need fedora >= $DESKTOP_MIN_FEDORA"
      rc=1
    fi
    ;;
  ubuntu)
    # the noctalia apt repo needs glibc 2.43 / libstdc++ 15, i.e. 26.04
    if version_ge "$version" "$DESKTOP_MIN_UBUNTU"; then
      _desk_ok "distro: ubuntu $version"
    else
      _desk_fail "distro: ubuntu $version, the noctalia apt repo needs ubuntu >= $DESKTOP_MIN_UBUNTU"
      rc=1
    fi
    ;;
  *)
    _desk_fail "distro: $distro is not one the dots installers support"
    rc=1
    ;;
  esac

  case "$distro:$machine" in
  *:x86_64) _desk_ok "architecture: x86_64" ;;
  fedora:aarch64) _desk_ok "architecture: aarch64 (the hyprland copr builds it)" ;;
  arch:* | cachyos:*) _desk_warn "architecture: $machine, packages may not be available" ;;
  *)
    _desk_fail "architecture: $machine, the noctalia/hyprland packages for $distro are x86_64 only"
    rc=1
    ;;
  esac

  return "$rc"
}

# desktop_preflight <candidate hyprland version>
# The caller passes the Hyprland version its package source would install
# (pacman -Si / dnf repoquery / apt-cache policy), so a too-old package is
# caught before anything is installed. An empty value skips that check.
desktop_preflight() {
  local candidate="${1:-}"
  local installed major dm rc=0

  if [ -d /run/systemd/system ]; then
    _desk_ok "systemd is the init system (uwsm needs it)"
  else
    _desk_warn "systemd is not running (container?), services and the session can't be checked"
  fi

  installed=$(hyprland_version)
  if [ -n "$installed" ]; then
    if version_ge "$installed" "$DESKTOP_MIN_HYPRLAND"; then
      _desk_ok "hyprland $installed already installed"
    else
      _desk_warn "hyprland $installed is installed but the dots config needs >= $DESKTOP_MIN_HYPRLAND (lua config)"
    fi
  fi

  if [ -n "$candidate" ]; then
    if version_ge "$candidate" "$DESKTOP_MIN_HYPRLAND"; then
      _desk_ok "hyprland $candidate available from the package source"
    else
      _desk_fail "hyprland $candidate from the package source is older than $DESKTOP_MIN_HYPRLAND, .config/hypr/hyprland.lua would not load"
      rc=1
    fi
  fi

  major=$(noctalia_major)
  if [ -n "$major" ]; then
    if [ "$major" -ge 5 ]; then
      _desk_ok "noctalia v$major already installed"
    else
      _desk_warn "noctalia v$major is installed, the dots config is for v5"
    fi
  fi
  if [ -d /etc/xdg/quickshell/noctalia-shell ] || [ -d /usr/share/noctalia-shell ]; then
    _desk_warn "the old quickshell noctalia-shell (v4) is installed, remove it so only v5 starts"
  fi

  local bar
  for bar in waybar hyprpanel ags; do
    if command -v "$bar" &>/dev/null; then
      _desk_warn "$bar is installed; noctalia replaces it, make sure nothing autostarts it"
    fi
  done

  dm=$(display_manager)
  case "$dm" in
  "") _desk_info "no display manager enabled: start with 'uwsm start hyprland-uwsm.desktop' from a tty" ;;
  greetd) _desk_ok "display manager: greetd (noctalia-greeter can use it)" ;;
  *) _desk_info "display manager: $dm, left as is; pick 'Hyprland (uwsm-managed)' at login" ;;
  esac

  if lspci 2>/dev/null | grep -qi 'vga.*nvidia\|3d.*nvidia'; then
    _desk_warn "nvidia gpu: uncomment the nvidia lines in .config/uwsm/env"
  fi

  return "$rc"
}

# desktop_verify: checks after installing; returns non-zero if anything is missing
desktop_verify() {
  local rc=0 cmd version major
  echo "desktop verify:"
  for cmd in Hyprland hyprctl hyprpicker noctalia uwsm qt6ct grim slurp wl-copy jq; do
    if command -v "$cmd" &>/dev/null; then
      _desk_ok "$cmd"
    else
      _desk_fail "$cmd missing"
      rc=1
    fi
  done

  version=$(hyprland_version)
  if [ -n "$version" ] && version_ge "$version" "$DESKTOP_MIN_HYPRLAND"; then
    _desk_ok "hyprland $version supports the lua config"
  else
    _desk_fail "hyprland ${version:-missing} is older than $DESKTOP_MIN_HYPRLAND"
    rc=1
  fi

  major=$(noctalia_major)
  if [ -n "$major" ] && [ "$major" -ge 5 ]; then
    _desk_ok "noctalia v$major"
  else
    _desk_fail "noctalia ${major:+v$major }is not v5"
    rc=1
  fi

  if [ -f /usr/share/wayland-sessions/hyprland-uwsm.desktop ]; then
    _desk_ok "uwsm hyprland session entry"
  else
    _desk_warn "no hyprland-uwsm.desktop session entry, start hyprland with 'uwsm start hyprland.desktop'"
  fi
  return "$rc"
}
