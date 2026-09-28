-- local/ is untracked; a machine with its own layout puts it there.
if package.searchpath("local.monitors", package.path) then
    require("local.monitors")
else
    hl.monitor({
        output    = MONITOR1,
        mode      = "preferred",
        position  = "auto",
        scale     = MONITOR_SCALE,
    })
end
