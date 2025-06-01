local sf_org = function()
	local function get_org()
		return require("sf").get_target_org()
	end
	if pcall(get_org) then
		local org = get_org()
		local coverage = require("sf").covered_percent()
		if coverage ~= "" then
			return org .. " (" .. coverage .. ")"
		else
			return org
		end
	else
		return ""
	end
end

local recording = function()
	local reg = vim.fn.reg_recording()
	if reg ~= "" then
		return "Recording @" .. reg
	else
		return ""
	end
end

return {
	"nvim-lualine/lualine.nvim",
	dependencies = {
		"nvim-tree/nvim-web-devicons",
	},
	lazy = true,
	event = "VimEnter",
	opts = {
		options = {
			theme = "rose-pine",
			section_separators = { left = "", right = "" },
			component_separators = { left = "", right = "" },
		},
		sections = {
			lualine_a = { "mode" },
			lualine_b = {
				"branch",
				"diff",
				"diagnostics",
				{ recording, color = { fg = "#cc241d" } },
			},
			lualine_c = {
				{ "filename", path = 1 },
				{ sf_org, icon = { "󰢎 ", color = { fg = "#009ddc" } } },
			},
			lualine_x = {
				"searchcount",
				"filetype",
			},
			lualine_y = { "progress" },
			lualine_z = { "%l/%L:%c" },
		},
	},
}
