-- Auto-start config
-- if you dont use UWSM add your auto start programs here, otherwise use XDG autostart https://wiki.archlinux.org/title/XDG_Autostart

hl.on("hyprland.start", function ()
    hl.exec_cmd("dbus-update-activation-environment --systemd --all")
    hl.exec_cmd("noctalia")
    -- Caffeine (idle inhibitor) on by default. Noctalia has no config key for
    -- it, so turn it on over IPC once the shell's socket is up (~0.5s after
    -- start); give up after 30s. The bar widget still toggles it off.
    hl.exec_cmd("sh -c 'for i in $(seq 60); do noctalia msg caffeine-enable >/dev/null 2>&1 && exit; sleep 0.5; done'")
    hl.exec_cmd("xhost +SI:localuser:root")
end)
