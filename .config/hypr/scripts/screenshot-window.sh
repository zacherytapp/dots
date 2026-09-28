#!/bin/sh
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
