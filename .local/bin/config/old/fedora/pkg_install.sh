#!/usr/bin/env bash

set -e

pkgListFile="pkg_install.lst"

if [ ! -f "$pkgListFile" ]; then
    exit 1
fi

pkgInstall=()

while IFS= read -r line || [[ -n "$line" ]]; do
    lineNoComment=$(echo "$line" | sed 's/\s*#.*//')
    lineTrimmed=$(echo "$lineNoComment" | sed 's/^[ \t]*//;s/[ \t]*$//')
    if [ -z "$lineTrimmed" ]; then
        continue
    fi
    
    pkg=$(echo "$lineTrimmed" | awk '{print $1}' | awk -F'|' '{print $1}')

    if [ -n "$pkg" ]; then
        pkgInstall+=("$pkg")
    fi
done < "$pkgListFile"

if [ ${#pkgInstall[@]} -eq 0 ]; then
    exit 0
fi

pkgRepo=()
pkgDetected=()
for ppkg in "${pkgInstall[@]}"; do
if dnf search "$ppkg" > /dev/null 2>&1; then
  pkgDetected+=("$ppkg")
fi
done

if [ ${#pkgDetected[@]} -gt 0 ]; then
	sudo dnf install "${pkgDetected[@]}" -y
fi
