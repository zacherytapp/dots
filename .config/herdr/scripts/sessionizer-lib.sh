# shellcheck shell=bash
# Shared tmux-sessionizer logic for herdr and herdr-app. Each app's
# sessionizer.sh defines its backend, sources this file and calls
# `sessionizer_main "$@"`. herdr-app/scripts links here, so both stay in step.
#
# Backend functions the caller defines:
#   notify <title> [body]                 show a notification
#   machines_tsv                          saved machines, one "name<TAB>ssh target<TAB>hidden" row
#                                         each ("hidden" non-empty: not offered in the picker)
#   add_machine <ssh target> <name>       save a machine
#   open_space <name> <folder> [machine]  focus the workspace/space called name on machine
#                                         ("" = this computer), or create it in folder
#
# sessionizer_main takes no argument (fzf picker), a folder (open it), or one of
# the modes a GUI picker (herdr-app's sessionizer mod) drives it with:
#   --list-dirs                  local candidates, one ~/path per line
#   --list-machines              "⇄ <name>" saved machines, "+ <host>" tailnet hosts
#   --add-machine <host>         save a tailnet host as a machine
#   --list-remote <machine>      that machine's candidates, one ~/path per line
#   --open-remote <machine> <~/path>

projects="${XDG_PROJECTS_DIR:-$HOME/Projects}"
dots="$projects/dots"
# machine-users and the .local-only marker sit beside the calling script.
here=$(dirname "$0")

# Directories whose immediate children are candidates — tmux-sessionizer's list
# (~/.config covers nvim, tmux, herdr, ...), plus the dotfiles repo's configs
# and the Documents/Downloads subfolders.
search_dirs=(
    "$HOME/.config"
    "$HOME/.local"
    "$projects"
    "$projects/boiler"
    "$HOME/work"
    "$HOME/personal"
    "$dots"
    "$dots/.config"
    "$dots/.local"
    "$HOME/Documents"
    "$HOME/Downloads"
)

# The dotfiles as they sit in $HOME: every top-level folder of the dots repo
# (~/.agents, ~/.claude, ~/.config, ~/.local, ...) is a candidate itself, and so
# are its children (~/.claude/hooks, ~/.agents/skills, ...).
dot_roots=()
for d in "$dots"/.[!.]*/; do
    d=$(basename "$d")
    [[ "$d" == .git ]] && continue
    [[ -d "$HOME/$d" ]] && dot_roots+=("$HOME/$d")
done
search_dirs+=("${dot_roots[@]}")

# --- machines -------------------------------------------------------------
# Saved machines come from the backend; the rest of the tailnet is offered as
# "+ add". Remote directories are listed over ssh and opened on that machine.
# Projects live in ~/Projects on every host.
remote_dirs=(.config Projects Projects/boiler work personal src Documents)

# ssh target for a tailnet host: user@host if machine-users maps it, else the bare name.
ssh_target_for() {
    local h="$1" glob user
    while read -r glob user; do
        [[ -z "$glob" || "$glob" == \#* ]] && continue
        # shellcheck disable=SC2254
        case "$h" in $glob) echo "$user@$h"; return ;; esac
    done < "$here/machine-users" 2>/dev/null
    echo "$h"
}

# Tailnet hosts where key auth works, cached for 10 minutes. Host keys are not
# checked here (reachability only); the app itself still verifies them on add.
reachable_hosts() {
    local cache="${XDG_CACHE_HOME:-$HOME/.cache}/herdr-sessionizer.reachable" hosts
    if [[ -n "$(find "$cache" -mmin -10 2>/dev/null)" ]]; then cat "$cache"; return; fi
    hosts=$(tailscale status --json 2>/dev/null \
        | jq -r '.Peer[]? | select(.Online and (.OS=="linux" or .OS=="macOS")) | .HostName' | sort -u)
    printf '%s\n' "$hosts" | while read -r h; do
        [[ -z "$h" ]] && continue
        (
            t=$(ssh_target_for "$h")
            ssh -o BatchMode=yes -o ConnectTimeout=4 -o StrictHostKeyChecking=no \
                -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR "$t" true </dev/null >/dev/null 2>&1 && echo "$h"
        ) &
    done | sort -u > "$cache.tmp"
    wait
    mv "$cache.tmp" "$cache"
    cat "$cache"
}

# "⇄ <name>" for each saved machine, "+ <host>" for reachable tailnet hosts not saved yet.
machine_entries() {
    local saved name target hidden
    saved=$(machines_tsv)
    while IFS=$'\t' read -r name target hidden; do
        if [[ -n "$name" && -z "$hidden" ]]; then echo "⇄ $name"; fi
    done <<<"$saved"
    command -v tailscale >/dev/null || return 0
    reachable_hosts | while read -r h; do
        awk -F'\t' -v h="$h" '$1 == h || $2 == h || sub(/^.*@/, "", $2) && $2 == h { found = 1 } END { exit !found }' <<<"$saved" \
            || echo "+ $h"
    done
}

# ssh target of a saved machine.
machine_target() {
    machines_tsv | awk -F'\t' -v m="$1" '$1 == m { print $2; exit }'
}

# A saved machine's ssh target, or exit with a notification.
require_target() {
    local target
    target=$(machine_target "$1")
    [[ -z "$target" ]] && { notify "sessionizer" "unknown machine: $1"; exit 1; }
    echo "$target"
}

# Candidate folders on a remote, relative to its $HOME and shown as ~/...;
# open_remote_dir expands the ~ back to the remote home.
list_remote_dirs() {
    local target="$1" dirs
    dirs=$(printf '%s ' "${remote_dirs[@]}")
    ssh -o BatchMode=yes -o ConnectTimeout=5 "$target" "cd \"\$HOME\" && { for d in $dirs; do [ -d \"\$d\" ] && find \"\$d\" -mindepth 1 -maxdepth 1 -type d ! -name .git; done | sed 's|^|~/|'; echo '~'; }" 2>/dev/null \
        | sort -u
}

open_remote_dir() {
    local machine="$1" dir="$2" target abs
    target=$(require_target "$machine")
    abs=$(ssh -o BatchMode=yes "$target" 'echo $HOME' 2>/dev/null)
    abs="${dir/#\~/$abs}"
    open_space "$(basename "$abs" | tr . _)" "$abs" "$machine"
}

open_remote() {
    local machine="$1" target dir
    target=$(require_target "$machine")
    dir=$(list_remote_dirs "$target" | fzf --prompt='remote dir> ' --height=100%) || exit 0
    [[ -z "$dir" ]] && exit 0
    open_remote_dir "$machine" "$dir"
}

# Local candidates, one ~/path per line.
list_local_dirs() {
    local d existing_dirs=()
    for d in "${search_dirs[@]}"; do [[ -d "$d" ]] && existing_dirs+=("$d"); done
    # find (not fd) so hidden and gitignored dirs like ~/Projects/dots/.config
    # show up; -xtype d also keeps symlinked dirs.
    {
        printf '%s\n' "${dot_roots[@]}"
        find "${existing_dirs[@]}" -mindepth 1 -maxdepth 1 -xtype d ! -name .git 2>/dev/null
    } | sed "s|^$HOME|~|" | sort -u
}

# Opens a local folder (~/... or absolute) as a space.
open_local() {
    local selected="$1" name
    selected="${selected/#\~/$HOME}"
    selected="${selected%/}"

    if [[ ! -d "$selected" ]]; then
        notify "sessionizer" "no such directory: $selected"
        exit 1
    fi

    name=$(basename "$selected" | tr . _)
    # Keep dotfiles-repo copies (e.g. dots/.config/nvim) apart from the live ~/.config ones.
    [[ "$selected" == "$dots"/?* ]] && name="dots_$name"

    open_space "$name" "$selected" ""
}

# Pick (or take as $1) a directory and open it; machine rows open a remote picker.
sessionizer_main() {
    local selected host
    case "${1:-}" in
        --list-dirs) list_local_dirs; return ;;
        --list-machines) [[ -e "$here/.local-only" ]] || machine_entries; return ;;
        --add-machine) add_machine "$(ssh_target_for "$2")" "$2"; return ;;
        --list-remote) list_remote_dirs "$(require_target "$2")"; return ;;
        --open-remote) open_remote_dir "$2" "$3"; return ;;
    esac

    if [[ $# -ge 1 ]]; then
        selected="$1"
    else
        # A .local-only marker next to the script (set on remotes) hides the machine list.
        selected=$({ [[ -e "$here/.local-only" ]] || machine_entries
                list_local_dirs; } \
            | sort -u | fzf --prompt='project / machine> ' --height=100%) || exit 0
        case "${selected:-}" in
            "⇄ "*) open_remote "${selected#⇄ }"; exit 0 ;;
            "+ "*)
                host="${selected#+ }"
                add_machine "$(ssh_target_for "$host")" "$host" || { read -rp "add failed - press enter" _; exit 1; }
                open_remote "$host"; exit 0 ;;
        esac
    fi

    [[ -z "${selected:-}" ]] && exit 0
    open_local "$selected"
}
