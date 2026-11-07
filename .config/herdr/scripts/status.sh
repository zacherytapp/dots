#!/usr/bin/env bash
# Right-hand status for the herdr tab bar and the herdr-app `tmux-status` mod: CPU load, CPU temperature in
# Fahrenheit and battery percentage — the ukiyo tmux status modules.
set -uo pipefail

# CPU busy percentage over a short sample window.
read -r _ u n s i rest < /proc/stat
prev_idle=$i
prev_total=$((u + n + s + i))
sleep 0.4
read -r _ u n s i rest < /proc/stat
idle=$i
total=$((u + n + s + i))
d_total=$((total - prev_total))
cpu=0
((d_total > 0)) && cpu=$(((100 * (d_total - (idle - prev_idle))) / d_total))

# CPU package temperature, reported in Fahrenheit (@ukiyo-show-fahrenheit true).
temp=""
# Portable awk (no gawk match() captures): first °C field on the matching line.
c=$(sensors 2>/dev/null | awk '/^(Package id 0|Tctl|Tdie|Composite):/ {
    for (i = 2; i <= NF; i++) if ($i ~ /°C$/) { v = $i; gsub(/[+°C]/, "", v); print v; exit }
}')
[[ -z "$c" ]] && c=$(awk '{printf "%.1f", $1 / 1000}' /sys/class/thermal/thermal_zone0/temp 2>/dev/null)
[[ -n "$c" ]] && temp=$(awk -v c="$c" 'BEGIN { printf "%.0f°F", c * 9 / 5 + 32 }')

# Battery, if the machine has one.
bat=""
for d in /sys/class/power_supply/BAT*; do
    [[ -r "$d/capacity" ]] || continue
    pct=$(<"$d/capacity")
    state=$(<"$d/status")
    case "$state" in
        Charging) icon="" ;;
        Full) icon="" ;;
        *) icon="" ;;
    esac
    bat="${icon} ${pct}%"
    break
done

out=" ${cpu}%"
[[ -n "$temp" ]] && out+="  ${temp}"
[[ -n "$bat" ]] && out+="  ${bat}"
printf '%s\n' "$out"
