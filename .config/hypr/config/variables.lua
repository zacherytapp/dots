TERMINAL     = "ghostty"
FILE_MANAGER = "dolphin"
BROWSER      = "firefox"
EDITOR       = "gnome-text-editor --new-window"
NOTES        = ""
CALCULATOR   = "gnome-calculator"
COLOR_PICKER = "hyprpicker -a -n"

MONITOR1 = ""
MONITOR2 = ""
MONITOR3 = ""
PRIMARY_MONITOR = MONITOR1

MONITOR_SCALE = 1.25

NUM_WPM = 10

-- Untracked per-machine overrides. PRIMARY_MONITOR is already bound above, so
-- an override that sets MONITOR1 must set PRIMARY_MONITOR too.
if package.searchpath("local.variables", package.path) then
    require("local.variables")
end
