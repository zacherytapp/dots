#!/usr/bin/env bash
# herdr tab bar segment: CPU load, CPU temperature (°F), battery.
set -uo pipefail

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

temp=""
c=$(sensors 2>/dev/null | awk 'match($0, /^(Package id 0|Tctl|Tdie|Composite):[[:space:]]*\+?([0-9.]+)°C/, m) { print m[2]; exit }')
[[ -z "$c" ]] && c=$(awk '{printf "%.1f", $1 / 1000}' /sys/class/thermal/thermal_zone0/temp 2>/dev/null)
[[ -n "$c" ]] && temp=$(awk -v c="$c" 'BEGIN { printf "%.0f°F", c * 9 / 5 + 32 }')

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
