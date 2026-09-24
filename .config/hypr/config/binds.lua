-- Keybinds ported from the old dots hyprland.conf
-- (github.com/zacherytapp/dots -> .config/hypr/hyprland.conf).
--
-- The key layout is kept as-is; only the programs behind each key changed,
-- because most of what that config launched (ghostty, tofi, brave, obsidian,
-- grimblast, cliphist, wlogout, hyprlock, pamixer, playerctl) isn't installed
-- on this machine. Noctalia provides the launcher / clipboard / screenshot /
-- session / OSD equivalents. Program names live in variables.lua.

local mainMod = "SUPER"
local noctCall = "noctalia msg "
local launchPrefix = "uwsm app -- " -- if you are not using UWSM, make this empty (e.g. "")
local scripts = os.getenv("HOME") .. "/.config/hypr/scripts/"

-- Bind a launcher key only when the program is actually configured, so the
-- empty entries in variables.lua simply leave their key free.
local function bindApp(keys, cmd, opts)
    if cmd and cmd ~= "" then
        hl.bind(keys, hl.dsp.exec_cmd(launchPrefix .. cmd), opts)
    end
end

-- Number-row keys are bound by character. Note that hl.bind() in Hyprland
-- 0.56 does not understand the "code:NN" evdev form that the old binds.lua
-- used -- those binds silently registered with keycode 0 and never fired.

------------------
---- PROGRAMS ----
------------------

bindApp(mainMod .. " + Return", TERMINAL) -- dots: $terminal
bindApp(mainMod .. " + T", TERMINAL)      -- dots: $terminal (kept as alias)
bindApp(mainMod .. " + B", BROWSER)      -- dots: $browser
bindApp(mainMod .. " + F", FILE_MANAGER) -- dots: $fileManager
bindApp(mainMod .. " + C", EDITOR)       -- dots: $editor
bindApp(mainMod .. " + O", NOTES)        -- dots: $notes (obsidian, not installed)
bindApp(mainMod .. " + S", EDITOR_ALT)   -- dots: $editor-alt (subl, not installed)
bindApp("XF86Calculator",  CALCULATOR)

-- dots had `$mainMod, D, exec, $menu` (tofi-drun)
hl.bind(mainMod .. " + D", hl.dsp.exec_cmd(noctCall .. "panel-toggle launcher"))

-- dots had `SUPER, E, exec, jome -d | wl-copy` (emoji picker + clipboard copy)
hl.bind(mainMod .. " + E", hl.dsp.exec_cmd(noctCall .. "panel-toggle launcher /emo"))

---------------------------
---- WINDOW MANAGEMENT ----
---------------------------

hl.bind(mainMod .. " + Q", hl.dsp.window.close())                      -- killactive
hl.bind(mainMod .. " + M", hl.dsp.exit())                              -- exit
hl.bind(mainMod .. " + W", hl.dsp.window.float({ action = "toggle" })) -- togglefloating

-- dots bound SUPER+J twice: once to togglesplit and once to `movefocus d`.
-- Only one can win, and the HJKL block is clearly the intended one, so
-- togglesplit moved one modifier over.
hl.bind(mainMod .. " + SHIFT + J", hl.dsp.layout("togglesplit"))

-- Move focus, vim-style
hl.bind(mainMod .. " + H", hl.dsp.focus({ direction = "left" }))
hl.bind(mainMod .. " + J", hl.dsp.focus({ direction = "down" }))
hl.bind(mainMod .. " + K", hl.dsp.focus({ direction = "up" }))
hl.bind(mainMod .. " + L", hl.dsp.focus({ direction = "right" }))

-- Resize the active window
hl.bind(mainMod .. " + SHIFT + Right", hl.dsp.window.resize({ x =  30, y =   0, relative = true }), { repeating = true })
hl.bind(mainMod .. " + SHIFT + Left",  hl.dsp.window.resize({ x = -30, y =   0, relative = true }), { repeating = true })
hl.bind(mainMod .. " + SHIFT + Up",    hl.dsp.window.resize({ x =   0, y = -30, relative = true }), { repeating = true })
hl.bind(mainMod .. " + SHIFT + Down",  hl.dsp.window.resize({ x =   0, y =  30, relative = true }), { repeating = true })

-- Move/resize windows with mainMod + LMB/RMB and dragging
hl.bind(mainMod .. " + mouse:272", hl.dsp.window.drag(),   { mouse = true })
hl.bind(mainMod .. " + mouse:273", hl.dsp.window.resize(), { mouse = true })

-- Move/resize by holding a key and moving the mouse
hl.bind(mainMod .. " + Z", hl.dsp.window.drag(),   { mouse = true })
hl.bind(mainMod .. " + X", hl.dsp.window.resize(), { mouse = true })

-------------------------------
---- WORKSPACES & MONITORS ----
-------------------------------

-- Switch workspaces with mainMod + [0-9]
for d = 0, 9 do
    local ws = (d == 0) and 10 or d
    hl.bind(mainMod .. " + " .. d, hl.dsp.focus({ workspace = ws }))
end

-- Move the active window to a workspace with mainMod + SHIFT + [0-9]
for d = 0, 9 do
    local ws = (d == 0) and 10 or d
    hl.bind(mainMod .. " + SHIFT + " .. d, hl.dsp.window.move({ workspace = ws }))
end

-- Special workspace (scratchpad)
hl.bind(mainMod .. " + SHIFT + S", hl.dsp.window.move({ workspace = "special:magic" }))
-- dots left this one commented out because SUPER+S launched $editor-alt; that
-- program isn't installed, so the scratchpad toggle takes the key.
hl.bind(mainMod .. " + S", hl.dsp.workspace.toggle_special("magic"))

-- Scroll through existing workspaces with mainMod + scroll
hl.bind(mainMod .. " + mouse_down", hl.dsp.focus({ workspace = "e+1" }))
hl.bind(mainMod .. " + mouse_up",   hl.dsp.focus({ workspace = "e-1" }))

-------------------
---- UTILITIES ----
-------------------

-- Colour picker (dots: $colorPicker | wl-copy; hyprpicker -a already copies)
hl.bind(mainMod .. " + P", hl.dsp.exec_cmd(COLOR_PICKER))

-- Clipboard history (dots: cliphist list | tofi | cliphist decode | wl-copy)
hl.bind(mainMod .. " + V", hl.dsp.exec_cmd(noctCall .. "panel-toggle clipboard"))

-- Screen locking (dots: hyprlock)
hl.bind(mainMod .. " + SHIFT + L", hl.dsp.exec_cmd(noctCall .. "session lock"))

-- Logout menu (dots: wlogout)
hl.bind(mainMod .. " + Escape", hl.dsp.exec_cmd(noctCall .. "panel-toggle session"))

-- Screenshots (dots: grimblast --notify copysave screen/active/area)
hl.bind("Print",                 hl.dsp.exec_cmd(noctCall .. "screenshot-fullscreen"))
hl.bind(mainMod .. " + ALT + P", hl.dsp.exec_cmd(scripts .. "screenshot-window.sh"))
hl.bind(mainMod .. " + SHIFT + P", hl.dsp.exec_cmd(noctCall .. "screenshot-region"))

---------------------------
---- HARDWARE CONTROLS ----
---------------------------

-- Audio (dots: pamixer)
hl.bind("XF86AudioRaiseVolume", hl.dsp.exec_cmd(noctCall .. "volume-up 5"),   { locked = true, repeating = true })
hl.bind("XF86AudioLowerVolume", hl.dsp.exec_cmd(noctCall .. "volume-down 5"), { locked = true, repeating = true })
hl.bind("XF86AudioMute",        hl.dsp.exec_cmd(noctCall .. "volume-mute"),   { locked = true })
hl.bind("XF86AudioMicMute",     hl.dsp.exec_cmd(noctCall .. "mic-mute"),      { locked = true })

-- Media (dots: playerctl)
hl.bind("XF86AudioPlay",  hl.dsp.exec_cmd(noctCall .. "media toggle"),   { locked = true })
hl.bind("XF86AudioPause", hl.dsp.exec_cmd(noctCall .. "media toggle"),   { locked = true })
hl.bind("XF86AudioNext",  hl.dsp.exec_cmd(noctCall .. "media next"),     { locked = true })
hl.bind("XF86AudioPrev",  hl.dsp.exec_cmd(noctCall .. "media previous"), { locked = true })

-- Brightness (dots: brightnessctl s +5% / 5%-)
hl.bind("XF86MonBrightnessUp",   hl.dsp.exec_cmd(noctCall .. "brightness-up 5"),   { locked = true, repeating = true })
hl.bind("XF86MonBrightnessDown", hl.dsp.exec_cmd(noctCall .. "brightness-down 5"), { locked = true, repeating = true })

----------------------------------------------------------------------
---- EXTRAS (no equivalent in dots; safe to delete, no key clashes) --
----------------------------------------------------------------------

hl.bind("ALT + Tab",         hl.dsp.window.cycle_next())
hl.bind(mainMod .. " + Tab", hl.dsp.exec_cmd(noctCall .. "window-switcher"))
hl.bind(mainMod .. " + A",   hl.dsp.exec_cmd(noctCall .. "panel-toggle control-center notifications"))
hl.bind(mainMod .. " + G",   hl.dsp.window.fullscreen())
hl.bind("CONTROL + SHIFT + Escape", hl.dsp.exec_cmd(launchPrefix .. TERMINAL .. " -e btop"))

-- Zoom
local function zoomfunction(value)
    local zoomvalue = hl.get_config("cursor:zoom_factor")
    if (zoomvalue + value) > 3.0 then
        hl.config({ cursor = { zoom_factor = 3.0 } })
    elseif (zoomvalue + value) < 1.0 then
        hl.config({ cursor = { zoom_factor = 1.0 } })
    else
        hl.config({ cursor = { zoom_factor = zoomvalue + value } })
    end
end
hl.bind(mainMod .. " + Minus", function() zoomfunction(-0.3) end, { repeating = true })
hl.bind(mainMod .. " + Plus",  function() zoomfunction(0.3) end,  { repeating = true })
hl.bind(mainMod .. " + KP_Subtract", function() zoomfunction(-0.3) end, { repeating = true })
hl.bind(mainMod .. " + KP_Add",      function() zoomfunction(0.3) end,  { repeating = true })
