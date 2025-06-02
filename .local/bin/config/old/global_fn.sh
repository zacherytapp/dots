#!/usr/bin/env bash

set -e

scrDir="$(dirname "$(realpath "$0")")"
cloneDir="$(dirname "${scrDir}")"
confDir="${XDG_CONFIG_HOME:-$HOME/.config}"
cacheDir="$HOME/.cache/hyde"
shlList=(zsh)

pkg_installed() {
    local PkgIn=$1

    if dnf list installed "${PkgIn}" &> /dev/null; then
        return 0 # Package is installed
    else
        return 1 # Package is not installed
    fi
}

chk_list() {
    vrType="$1"
    local inList=("${@:2}")
    for pkg in "${inList[@]}"; do
        if pkg_installed "${pkg}"; then
            printf -v "${vrType}" "%s" "${pkg}"
            export "${vrType}"
            return 0
        fi
    done
    return 1
}

pkg_available() {
    local PkgIn=$1
    if pacman -Si "${PkgIn}" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

pkg_available() {
    local PkgIn=$1

    # dnf info exits with 0 if package is found, non-zero otherwise
    if dnf info "${PkgIn}" &> /dev/null; then
        return 0 # Package is available
    else
        return 1 # Package is not available
    fi
}

nvidia_detect() {
    readarray -t dGPU < <(lspci -k | grep -E "(VGA|3D)" | awk -F ': ' '{print $NF}')

    if [ "${1}" == "--verbose" ]; then
        for indx in "${!dGPU[@]}"; do
            echo -e "\033[0;32m[gpu$indx]\033[0m detected // ${dGPU[indx]}"
        done
        return 0
    fi

    if [ "${1}" == "--drivers" ]; then
        local nvidia_driver_patterns=("akmod-nvidia" "kmod-nvidia" "nvidia-driver" "xorg-x11-drv-nvidia")
        local found_drivers=()

        for pattern in "${nvidia_driver_patterns[@]}"; do
            while IFS= read -r line; do
                pkg_name=$(echo "$line" | awk '{print $1}')
                if [[ -n "$pkg_name" && ! " ${found_drivers[@]} " =~ " ${pkg_name} " ]]; then
                    found_drivers+=("$pkg_name")
                fi
            done < <(dnf search "$pattern" 2>/dev/null | grep -E "^${pattern}")
        done

        if [ ${#found_drivers[@]} -gt 0 ]; then
            for drv in "${found_drivers[@]}"; do
                echo "$drv"
            done
	    return 0
        else
	    return 1
        fi
        return 0
    fi

    if grep -iq nvidia <<< "${dGPU[@]}"; then
        return 0
    else
        return 1
    fi
}

prompt_timer() {
    set +e 
    unset promptIn
    local timsec=$1
    local msg=$2
    while [[ ${timsec} -ge 0 ]]; do
        echo -ne "\r :: ${msg} (${timsec}s) : "
        read -t 1 -n 1 promptIn
        if [ $? -eq 0 ]; then
            break
        fi
        ((timsec--))
    done
    export promptIn
    echo ""
    set -e
}

install_from_file() {
	local lstFile="$1"
	local line lineNoComment lineTrimmed pkg
	local -a pkgInstall=()
	local -a pkgDetected=()

	# no file provided
	if [ -z "$pkgListFile" ]; then
        	return 1 
	fi

	# no file found
	if [ -f "$pkgListFile" ]; then
        	return 1 
	fi

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
        	return 0
    	fi

	for ppkg in "${pkgInstall[@]}"; do
        	if dnf search "$ppkg" > /dev/null 2>&1; then
            		pkgDetected+=("$ppkg")
        	fi
    	done

	if [ ${#pkgDetected[@]} -gt 0 ]; then
       		sudo dnf install -y "${pkgDetected[@]}"
        fi

	return 0
}
