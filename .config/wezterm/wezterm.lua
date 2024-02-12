local wezterm = require("wezterm")
local config = wezterm.config_builder()

require("tabs").setup(config)

config.front_end = "WebGpu"
config.webgpu_power_preference = "HighPerformance"
config.cursor_blink_ease_in = "Constant"
config.cursor_blink_ease_out = "Constant"

config.color_scheme_dirs = { "/home/zakk/wezterm" }
config.color_scheme = "Gruvbox Material (Gogh)"
config.window_background_opacity = 0.95

-- Fonts
config.font_size = 14
config.font = wezterm.font({ family = "Fira Code" })
config.bold_brightens_ansi_colors = true
config.font_rules = {
	{
		intensity = "Bold",
		italic = true,
		font = wezterm.font({
			family = "Maple Mono",
			weight = "Bold",
			style = "Italic",
		}),
	},
	{
		italic = true,
		intensity = "Half",
		font = wezterm.font({
			family = "Maple Mono",
			weight = "DemiBold",
			style = "Italic",
		}),
	},
	{
		italic = true,
		intensity = "Normal",
		font = wezterm.font({
			family = "Maple Mono",
			style = "Italic",
		}),
	},
}

return config
