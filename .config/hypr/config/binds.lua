local mainMod = "SUPER"
local noctCall = "noctalia msg "
local launchPrefix = "uwsm app -- "
local scripts = os.getenv("HOME") .. "/.config/hypr/scripts/"

-- Empty program entries in variables.lua leave their key unbound.
local function bindApp(keys, cmd, opts)
    if cmd and cmd ~= "" then
        hl.bind(keys, hl.dsp.exec_cmd(launchPrefix .. cmd), opts)
    end
end

bindApp(mainMod .. " + Return", TERMINAL)
bindApp(mainMod .. " + T", TERMINAL)
bindApp(mainMod .. " + B", BROWSER)
bindApp(mainMod .. " + F", FILE_MANAGER)
bindApp(mainMod .. " + C", EDITOR)
bindApp(mainMod .. " + O", NOTES)
bindApp(mainMod .. " + S", EDITOR_ALT)
bindApp("XF86Calculator",  CALCULATOR)

hl.bind(mainMod .. " + D", hl.dsp.exec_cmd(noctCall .. "panel-toggle launcher"))

hl.bind(mainMod .. " + E", hl.dsp.exec_cmd(noctCall .. "panel-toggle launcher /emo"))

hl.bind(mainMod .. " + Q", hl.dsp.window.close())
hl.bind(mainMod .. " + M", hl.dsp.exit())
hl.bind(mainMod .. " + W", hl.dsp.window.float({ action = "toggle" }))

-- SHIFT because SUPER+J is focus-down.
hl.bind(mainMod .. " + SHIFT + J", hl.dsp.layout("togglesplit"))

hl.bind(mainMod .. " + H", hl.dsp.focus({ direction = "left" }))
hl.bind(mainMod .. " + J", hl.dsp.focus({ direction = "down" }))
hl.bind(mainMod .. " + K", hl.dsp.focus({ direction = "up" }))
hl.bind(mainMod .. " + L", hl.dsp.focus({ direction = "right" }))

hl.bind(mainMod .. " + SHIFT + Right", hl.dsp.window.resize({ x =  30, y =   0, relative = true }), { repeating = true })
hl.bind(mainMod .. " + SHIFT + Left",  hl.dsp.window.resize({ x = -30, y =   0, relative = true }), { repeating = true })
hl.bind(mainMod .. " + SHIFT + Up",    hl.dsp.window.resize({ x =   0, y = -30, relative = true }), { repeating = true })
hl.bind(mainMod .. " + SHIFT + Down",  hl.dsp.window.resize({ x =   0, y =  30, relative = true }), { repeating = true })

hl.bind(mainMod .. " + mouse:272", hl.dsp.window.drag(),   { mouse = true })
hl.bind(mainMod .. " + mouse:273", hl.dsp.window.resize(), { mouse = true })

hl.bind(mainMod .. " + Z", hl.dsp.window.drag(),   { mouse = true })
hl.bind(mainMod .. " + X", hl.dsp.window.resize(), { mouse = true })

-- Bound by character: hl.bind() doesn't parse "code:NN" keys; they silently
-- register as keycode 0 and never fire.
for d = 0, 9 do
    local ws = (d == 0) and 10 or d
    hl.bind(mainMod .. " + " .. d, hl.dsp.focus({ workspace = ws }))
end

for d = 0, 9 do
    local ws = (d == 0) and 10 or d
    hl.bind(mainMod .. " + SHIFT + " .. d, hl.dsp.window.move({ workspace = ws }))
end

hl.bind(mainMod .. " + SHIFT + S", hl.dsp.window.move({ workspace = "special:magic" }))
hl.bind(mainMod .. " + S", hl.dsp.workspace.toggle_special("magic"))

hl.bind(mainMod .. " + mouse_down", hl.dsp.focus({ workspace = "e+1" }))
hl.bind(mainMod .. " + mouse_up",   hl.dsp.focus({ workspace = "e-1" }))

hl.bind(mainMod .. " + P", hl.dsp.exec_cmd(COLOR_PICKER))

hl.bind(mainMod .. " + V", hl.dsp.exec_cmd(noctCall .. "panel-toggle clipboard"))

hl.bind(mainMod .. " + SHIFT + L", hl.dsp.exec_cmd(noctCall .. "session lock"))

hl.bind(mainMod .. " + Escape", hl.dsp.exec_cmd(noctCall .. "panel-toggle session"))

hl.bind("Print",                 hl.dsp.exec_cmd(noctCall .. "screenshot-fullscreen"))
hl.bind(mainMod .. " + ALT + P", hl.dsp.exec_cmd(scripts .. "screenshot-window.sh"))
hl.bind(mainMod .. " + SHIFT + P", hl.dsp.exec_cmd(noctCall .. "screenshot-region"))

hl.bind("XF86AudioRaiseVolume", hl.dsp.exec_cmd(noctCall .. "volume-up 5"),   { locked = true, repeating = true })
hl.bind("XF86AudioLowerVolume", hl.dsp.exec_cmd(noctCall .. "volume-down 5"), { locked = true, repeating = true })
hl.bind("XF86AudioMute",        hl.dsp.exec_cmd(noctCall .. "volume-mute"),   { locked = true })
hl.bind("XF86AudioMicMute",     hl.dsp.exec_cmd(noctCall .. "mic-mute"),      { locked = true })

hl.bind("XF86AudioPlay",  hl.dsp.exec_cmd(noctCall .. "media toggle"),   { locked = true })
hl.bind("XF86AudioPause", hl.dsp.exec_cmd(noctCall .. "media toggle"),   { locked = true })
hl.bind("XF86AudioNext",  hl.dsp.exec_cmd(noctCall .. "media next"),     { locked = true })
hl.bind("XF86AudioPrev",  hl.dsp.exec_cmd(noctCall .. "media previous"), { locked = true })

hl.bind("XF86MonBrightnessUp",   hl.dsp.exec_cmd(noctCall .. "brightness-up 5"),   { locked = true, repeating = true })
hl.bind("XF86MonBrightnessDown", hl.dsp.exec_cmd(noctCall .. "brightness-down 5"), { locked = true, repeating = true })

-- Noctalia owns idle/lock/suspend. logind must be set to ignore these keys,
-- otherwise it acts on them as well.
hl.bind("XF86PowerOff", hl.dsp.exec_cmd(noctCall .. "panel-toggle session"))
hl.bind("XF86Sleep",    hl.dsp.exec_cmd(noctCall .. "session lock-and-suspend"), { locked = true })
hl.bind("XF86Suspend",  hl.dsp.exec_cmd(noctCall .. "session lock-and-suspend"), { locked = true })

hl.bind("ALT + Tab",         hl.dsp.window.cycle_next())
hl.bind(mainMod .. " + Tab", hl.dsp.exec_cmd(noctCall .. "window-switcher"))
hl.bind(mainMod .. " + A",   hl.dsp.exec_cmd(noctCall .. "panel-toggle control-center notifications"))
hl.bind(mainMod .. " + G",   hl.dsp.window.fullscreen())
hl.bind("CONTROL + SHIFT + Escape", hl.dsp.exec_cmd(launchPrefix .. TERMINAL .. " -e btop"))

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
