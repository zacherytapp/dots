-- Monitor wiki https://wiki.hypr.land/Configuring/Basics/Monitors/
-- Outputs can be found with `hyprctl monitors`. Edit variables.lua for the
-- monitor outputs and the scale instead of hardcoding them here.
--
-- This mirrors `monitor=,preferred,auto,1.25` from the old dots hyprland.conf:
-- an empty output matches every monitor, the preferred (native) mode is used,
-- and everything is scaled by 1.25. On the built-in 2560x1600 panel that gives
-- a 2048x1280 logical resolution.
--
-- Note: the dots repo also carries a monitors.conf with scale 1.3333334, but
-- hyprland.conf never sources it, so 1.25 is the value that was actually live.
--
-- To pin an exact mode instead of "preferred":
-- hl.monitor({ output = MONITOR1, mode = "2560x1600@240", position = "0x0", scale = MONITOR_SCALE })

hl.monitor({
    output    = MONITOR1,
    mode      = "preferred",
    position  = "auto",
    scale     = MONITOR_SCALE,
})

-- The dots config also appended `,mirror,DP-1` to the monitor line, which
-- mirrors every output onto DP-1. No DP-1 exists on this machine, so it is left
-- off; uncomment and adjust if you want mirroring back.
-- hl.monitor({ output = MONITOR2, mirror = "DP-1" })
