local wezterm = require("wezterm")
local config = wezterm.config_builder()

require("tabs").setup(config)

config.front_end = "WebGpu"
config.webgpu_power_preference = "HighPerformance"
config.cursor_blink_ease_in = "Constant"
config.cursor_blink_ease_out = "Constant"

config.color_scheme_dirs = { "/home/zakk/wezterm" }
config.color_scheme = "Dracula (Official)"

return config
