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

pick_remote_dir() {
    local target="$1" dirs
    dirs=$(printf '%s ' "${remote_dirs[@]}")
    # Paths are listed relative to the remote $HOME and shown as ~/...; open_remote
    # expands the ~ back to the remote home.
    ssh -o BatchMode=yes -o ConnectTimeout=5 "$target" "cd \"\$HOME\" && { for d in $dirs; do [ -d \"\$d\" ] && find \"\$d\" -mindepth 1 -maxdepth 1 -type d ! -name .git; done | sed 's|^|~/|'; echo '~'; }" 2>/dev/null \
        | sort -u | fzf --prompt='remote dir> ' --height=100%
}

open_remote() {
    local machine="$1" target dir abs
    target=$(machine_target "$machine")
    [[ -z "$target" ]] && { notify "sessionizer" "unknown machine: $machine"; exit 1; }
    dir=$(pick_remote_dir "$target") || exit 0
    [[ -z "$dir" ]] && exit 0
    abs=$(ssh -o BatchMode=yes "$target" 'echo $HOME' 2>/dev/null)
    abs="${dir/#\~/$abs}"
    open_space "$(basename "$abs" | tr . _)" "$abs" "$machine"
}

# Pick (or take as $1) a directory and open it; machine rows open a remote picker.
sessionizer_main() {
    local selected existing_dirs d host name
    if [[ $# -ge 1 ]]; then
        selected="$1"
    else
        existing_dirs=()
        for d in "${search_dirs[@]}"; do [[ -d "$d" ]] && existing_dirs+=("$d"); done
        # find (not fd) so hidden and gitignored dirs like ~/Projects/dots/.config
        # show up; -xtype d also keeps symlinked dirs.
        # A .local-only marker next to the script (set on remotes) hides the machine list.
        selected=$({ [[ -e "$here/.local-only" ]] || machine_entries
                find "${existing_dirs[@]}" -mindepth 1 -maxdepth 1 -xtype d ! -name .git 2>/dev/null \
                    | sed "s|^$HOME|~|"; } \
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
