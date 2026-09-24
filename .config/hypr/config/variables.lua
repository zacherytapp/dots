-- Hyprland default apps
-- Roles mirror the program variables from the old dots hyprland.conf
-- ($terminal, $browser, $notes, $editor, $editor-alt, $fileManager, $colorPicker).
-- Where that config's program isn't installed here, the closest installed
-- equivalent is used instead; set to "" to leave the matching keybind unbound.

TERMINAL     = "ghostty"
FILE_MANAGER = "dolphin"
BROWSER      = "firefox"                      -- dots used: brave (wayland flags)
EDITOR       = "gnome-text-editor --new-window" -- dots used: code
EDITOR_ALT   = ""                             -- dots used: subl (not installed)
NOTES        = ""                             -- dots used: obsidian (not installed)
CALCULATOR   = "gnome-calculator"
COLOR_PICKER = "hyprpicker -a -n"

-- Monitors
MONITOR1 = ""
MONITOR2 = ""
MONITOR3 = ""
PRIMARY_MONITOR = MONITOR1

-- Scale applied to every monitor, matching `monitor=,preferred,auto,1.25` from
-- the old dots hyprland.conf. On this 2560x1600 panel that's a 2048x1280
-- logical resolution.
MONITOR_SCALE = 1.25

-- Workspaces
NUM_WPM = 10 -- Number of workspaces per monitor (Max 10)
