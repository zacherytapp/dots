#!/bin/bash

CONFIG_FILES="$HOME/.config/sway/config.d/90-bar.conf"

trap "killall waybar" EXIT

while true; do
    waybar &
    inotifywait -e create,modify $CONFIG_FILES
    killall waybar
done
