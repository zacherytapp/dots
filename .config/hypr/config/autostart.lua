hl.on("hyprland.start", function ()
    hl.exec_cmd("dbus-update-activation-environment --systemd --all")
    hl.exec_cmd("noctalia")
    -- Caffeine on at start: noctalia has no config key for it, so retry over
    -- IPC until the shell's socket is up (gives up after 30s).
    hl.exec_cmd("sh -c 'for i in $(seq 60); do noctalia msg caffeine-enable >/dev/null 2>&1 && exit; sleep 0.5; done'")
    hl.exec_cmd("xhost +SI:localuser:root")
end)
