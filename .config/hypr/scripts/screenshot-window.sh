#!/bin/sh
# Screenshot the active window, copy it to the clipboard and save it.
# Stands in for `grimblast --notify copysave active` from the old dots config,
# since grimblast isn't installed here.
set -eu

dir="${XDG_PICTURES_DIR:-$HOME/Pictures}/Screenshots"
file="$dir/window_$(date +%Y-%m-%d_%H-%M-%S).png"
mkdir -p "$dir"

geom=$(hyprctl activewindow -j | jq -r '"\(.at[0]),\(.at[1]) \(.size[0])x\(.size[1])"')
[ "$geom" = "null,null nullxnull" ] && exit 1

grim -g "$geom" "$file"
wl-copy < "$file"

if command -v noctalia >/dev/null 2>&1; then
    noctalia msg notification-show "Screenshot" "Saved to $file"
fi
