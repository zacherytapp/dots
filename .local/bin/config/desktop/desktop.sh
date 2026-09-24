#!/usr/bin/env bash
# Hyprland + Noctalia desktop installer, shared by .local/bin/config/{arch,cachy,fedora,ubuntu}.
# Sourced by each distro's runner, which calls:
#
#   desktop_install   checks first, then installs the session for this distro
#   desktop_greeter   opt-in: noctalia-greeter on greetd as the login screen
#
# Both run as root and need ACTUAL_USER (the sudo-ing user) set by the runner.
# Only packages are installed here; the config itself comes from stowing the
# repo (.config/hypr, .config/noctalia, .config/uwsm, ...).
#
# Where each piece comes from:
#   cachyos  cachyos-hypr-noctalia (cachyos repo) pulls the whole stack
#   arch     hyprland, noctalia, uwsm from [extra]; swash from the AUR
#   fedora   hyprland/uwsm/xdph from the lionheartp/Hyprland copr (Fedora
#            retired its hyprland package), noctalia from Fedora 44+
#   ubuntu   noctalia from pkg.noctalia.dev, hyprland from the archive, which
#            is only new enough (>= 0.55, for the lua config) from 26.10 on

DESKTOP_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
# shellcheck source=checks.sh
source "$DESKTOP_DIR/checks.sh"

# What .config/hypr, .config/noctalia and .config/uwsm use: the session, the
# portals, the apps bound in hypr/config/variables.lua (ghostty, dolphin,
# gnome-text-editor, gnome-calculator, hyprpicker), grim/slurp/jq for
# hypr/scripts/screenshot-window.sh, qt5ct/qt6ct and adw-gtk3 for the
# noctalia qt and gtk templates, and xhost for the autostart.
DESKTOP_PKGS_ARCH=(
  hyprland uwsm xdg-desktop-portal-hyprland xdg-desktop-portal-gtk hyprpicker hyprland-guiutils
  noctalia qt6ct qt5ct qt6-wayland adw-gtk-theme nwg-look
  grim slurp wl-clipboard jq brightnessctl ddcutil xorg-xhost xdg-user-dirs
  ghostty dolphin kde-cli-tools gnome-calculator gnome-text-editor gnome-keyring breeze-icons
)
DESKTOP_AUR_ARCH=(swash bibata-cursor-theme-bin)

# cachyos-hypr-noctalia depends on hyprland, noctalia, uwsm, qt6ct, swash and
# the rest of the list above; the extras are what it leaves out
DESKTOP_PKGS_CACHY=(
  cachyos-hypr-noctalia hyprland noctalia uwsm
  xdg-desktop-portal-gtk qt5ct qt6-wayland ghostty jq xdg-user-dirs breeze-icons
)

DESKTOP_PKGS_FEDORA=(
  hyprland uwsm xdg-desktop-portal-hyprland xdg-desktop-portal-gtk hyprpicker hyprland-guiutils
  noctalia qt6ct qt5ct qt6-qtwayland adw-gtk3-theme nwg-look
  grim slurp wl-clipboard jq brightnessctl ddcutil xhost xdg-user-dirs
  ghostty dolphin kde-cli-tools gnome-calculator gnome-text-editor gnome-keyring breeze-icon-theme
)

# adw-gtk3 and bibata aren't packaged for ubuntu; they're fetched below
DESKTOP_PKGS_UBUNTU=(
  hyprland uwsm xdg-desktop-portal-hyprland xdg-desktop-portal-gtk hyprpicker
  noctalia qt6ct qt5ct qt6-wayland nwg-look
  grim slurp wl-clipboard jq brightnessctl ddcutil x11-xserver-utils xdg-user-dirs
  ghostty dolphin kde-cli-tools gnome-calculator gnome-text-editor gnome-keyring breeze-icon-theme
)

# swash (the screenshot annotator noctalia pipes screenshots to) is built from
# source where it isn't packaged
SWASH_BUILD_FEDORA=(gcc meson ninja-build pkgconf-pkg-config gtk4-devel libadwaita-devel tesseract-devel curl tar)
SWASH_BUILD_UBUNTU=(build-essential meson ninja-build pkgconf libgtk-4-dev libadwaita-1-dev libtesseract-dev curl)

_desk_as_user() {
  sudo -u "$ACTUAL_USER" -H "$@"
}

_desk_latest_tag() {
  curl -fsSLI -o /dev/null -w '%{url_effective}' "https://github.com/$1/releases/latest" | sed 's#.*/tag/##'
}

_desk_aur() {
  local helper
  for helper in paru yay; do
    if command -v "$helper" &>/dev/null; then
      _desk_as_user "$helper" -S --needed --noconfirm "$@"
      return
    fi
  done
  _desk_fail "no AUR helper (paru or yay) to install: $*"
  return 1
}

# the hyprland version this machine would end up with: the installed one when
# it's already new enough (e.g. built from source), else the package candidate
_desk_hyprland_candidate() {
  local installed
  installed=$(hyprland_version)
  if [ -n "$installed" ] && version_ge "$installed" "$DESKTOP_MIN_HYPRLAND"; then
    echo "$installed"
    return
  fi
  case "$1" in
  arch | cachyos) pacman -Si hyprland 2>/dev/null | awk -F': *' '/^Version/{print $2; exit}' | sed 's/-[^-]*$//' ;;
  fedora) dnf repoquery -q --latest-limit=1 --qf '%{version}\n' hyprland 2>/dev/null | head -n1 ;;
  ubuntu) apt-cache policy hyprland 2>/dev/null | sed -n 's/^ *Candidate: \([0-9][0-9.]*\).*/\1/p' ;;
  esac
}

_desk_install_bibata() {
  local theme="Bibata-Modern-Ice"
  if [ -d "/usr/share/icons/$theme" ]; then
    echo "cursor theme already installed: $theme"
    return 0
  fi
  local tag tmp
  tag=$(_desk_latest_tag ful1e5/Bibata_Cursor)
  tmp=$(mktemp -d)
  curl -fsSL -o "$tmp/$theme.tar.xz" "https://github.com/ful1e5/Bibata_Cursor/releases/download/${tag}/${theme}.tar.xz"
  tar -xJf "$tmp/$theme.tar.xz" -C /usr/share/icons
  rm -rf "$tmp"
}

_desk_install_adw_gtk3() {
  if [ -d /usr/share/themes/adw-gtk3-dark ]; then
    echo "adw-gtk3 already installed"
    return 0
  fi
  local tag tmp
  tag=$(_desk_latest_tag lassekongo83/adw-gtk3)
  tmp=$(mktemp -d)
  curl -fsSL -o "$tmp/adw-gtk3.tar.xz" "https://github.com/lassekongo83/adw-gtk3/releases/download/${tag}/adw-gtk3${tag}.tar.xz"
  tar -xJf "$tmp/adw-gtk3.tar.xz" -C /usr/share/themes
  rm -rf "$tmp"
}

# builds the latest swash release into /usr/local
_desk_build_swash() {
  if command -v swash &>/dev/null; then
    echo "swash already installed"
    return 0
  fi
  local tag tmp
  tag=$(_desk_latest_tag ItsLemmy/swash)
  tmp=$(mktemp -d)
  curl -fsSL "https://github.com/ItsLemmy/swash/archive/refs/tags/${tag}.tar.gz" | tar -xz -C "$tmp" --strip-components=1
  (
    cd "$tmp"
    meson setup build --buildtype=release --prefix=/usr/local
    meson compile -C build
    meson install -C build
  )
  rm -rf "$tmp"
}

_desk_install_arch() {
  pacman -S --needed --noconfirm "${DESKTOP_PKGS_ARCH[@]}"
  _desk_aur "${DESKTOP_AUR_ARCH[@]}"
}

_desk_install_cachyos() {
  pacman -S --needed --noconfirm "${DESKTOP_PKGS_CACHY[@]}"
  # bibata comes from the AUR (the uwsm env and gtk settings use it)
  if [ ! -d /usr/share/icons/Bibata-Modern-Ice ]; then
    _desk_aur bibata-cursor-theme-bin
  fi
}

_desk_fedora_repos() {
  command -v dnf &>/dev/null || return 1
  dnf install -y dnf-plugins-core
  dnf copr enable -y lionheartp/Hyprland
  dnf copr enable -y scottames/ghostty
}

_desk_install_fedora() {
  # the copr also carries noctalia-git and the old v4 noctalia-shell; ask for
  # fedora's noctalia package by name so neither of those is picked
  dnf install -y "${DESKTOP_PKGS_FEDORA[@]}"
  dnf install -y "${SWASH_BUILD_FEDORA[@]}"
  _desk_build_swash
  _desk_install_bibata
}

_desk_ubuntu_repo() {
  local codename sources
  # shellcheck disable=SC1091
  codename=$(. /etc/os-release && echo "${VERSION_CODENAME:-}")
  sources="https://pkg.noctalia.dev/deb/noctalia-${codename}.sources"
  if ! curl -fsSLI -o /dev/null "$sources"; then
    _desk_fail "pkg.noctalia.dev has no repo for ubuntu '$codename' (26.04 resolute or newer is needed)"
    return 1
  fi
  if ! dpkg-query -W -f='${Status}' nickh-archive-keyring 2>/dev/null | grep -q "install ok installed"; then
    local tmp
    tmp=$(mktemp -d)
    curl -fsSL -o "$tmp/nickh-archive-keyring.deb" https://pkg.noctalia.dev/deb/nickh-archive-keyring.deb
    dpkg -i "$tmp/nickh-archive-keyring.deb"
    rm -rf "$tmp"
  fi
  curl -fsSL -o "/etc/apt/sources.list.d/noctalia-${codename}.sources" "$sources"
  apt-get update -q
}

_desk_install_ubuntu() {
  local pkgs=("${DESKTOP_PKGS_UBUNTU[@]}") installed
  # a new enough hyprland built from source (e.g. hyprbuntu) stays; the
  # archive's older hyprland packages would shadow it
  installed=$(hyprland_version)
  if [ -n "$installed" ] && version_ge "$installed" "$DESKTOP_MIN_HYPRLAND" &&
    ! dpkg -S "$(command -v Hyprland)" &>/dev/null; then
    _desk_info "keeping hyprland $installed from $(command -v Hyprland)"
    local pkg kept=()
    for pkg in "${pkgs[@]}"; do
      case "$pkg" in
      hyprland | xdg-desktop-portal-hyprland | hyprpicker) ;;
      *) kept+=("$pkg") ;;
      esac
    done
    pkgs=("${kept[@]}")
  fi
  apt-get install -y -q "${pkgs[@]}"
  apt-get install -y -q "${SWASH_BUILD_UBUNTU[@]}"
  _desk_build_swash
  _desk_install_bibata
  _desk_install_adw_gtk3
}

# checks, then installs the hyprland + noctalia session for this distro
desktop_install() {
  local distro candidate
  distro=$(desktop_distro)

  # version/arch checks that need no repo changes
  desktop_preflight_os || return 1

  # repos that decide which hyprland version is on offer
  case "$distro" in
  fedora) _desk_fedora_repos ;;
  ubuntu) apt-get update -q ;;
  esac

  candidate=$(_desk_hyprland_candidate "$distro")
  if [ -z "$candidate" ]; then
    _desk_fail "no hyprland package found for $distro"
    return 1
  fi
  desktop_preflight "$candidate" || {
    _desk_fail "desktop checks failed, nothing was installed"
    return 1
  }

  case "$distro" in
  cachyos) _desk_install_cachyos ;;
  arch) _desk_install_arch ;;
  fedora) _desk_install_fedora ;;
  ubuntu) _desk_ubuntu_repo && _desk_install_ubuntu ;;
  esac || return 1

  desktop_verify
}

# opt-in: noctalia-greeter (greetd) as the login screen, replacing any other
# display manager, with passwordless appearance sync for ACTUAL_USER
desktop_greeter() {
  local distro dm
  distro=$(desktop_distro)
  if ! command -v noctalia &>/dev/null; then
    _desk_fail "install the desktop first (noctalia is missing)"
    return 1
  fi

  case "$distro" in
  cachyos) pacman -S --needed --noconfirm greetd noctalia-greeter ;;
  arch)
    pacman -S --needed --noconfirm greetd
    _desk_aur noctalia-greeter
    ;;
  fedora) dnf install -y greetd noctalia-greeter-git ;;
  ubuntu) apt-get install -y -q greetd noctalia-greeter ;;
  esac

  install -d /etc/greetd
  if ! grep -q 'noctalia-greeter-session' /etc/greetd/config.toml 2>/dev/null; then
    [ -f /etc/greetd/config.toml ] && cp /etc/greetd/config.toml /etc/greetd/config.toml.pre-noctalia
    cat >/etc/greetd/config.toml <<'EOF'
[terminal]
vt = 1

[default_session]
command = "/usr/bin/noctalia-greeter-session"
user = "greeter"
EOF
  fi

  # lets noctalia's [shell.greeter_sync] auto_sync push the wallpaper and
  # colors without an admin prompt each time
  noctalia-greeter passwordless-sync enable "$ACTUAL_USER"

  if [ ! -d /run/systemd/system ]; then
    _desk_warn "systemd isn't running (container?), greetd not enabled"
    return 0
  fi
  dm=$(display_manager)
  if [ -n "$dm" ] && [ "$dm" != "greetd" ]; then
    _desk_info "disabling $dm in favour of greetd"
    systemctl disable "$dm.service"
  fi
  systemctl enable greetd.service
  _desk_info "greetd takes over at the next boot"
}
