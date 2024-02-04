-- return {
-- 	"luisiacc/gruvbox-baby",
-- 	branch = "main",
-- 	lazy = false,
-- 	priority = 1000,
-- 	opts = {},
-- 	config = function()
-- 		vim.g.gruvbox_baby_function_style = "NONE"
-- 		vim.g.gruvbox_baby_keyword_style = "italic"
-- 		vim.g.gruvbox_baby_telescope_theme = 1
-- 		vim.g.gruvbox_baby_transparent_mode = 1
-- 		vim.cmd("colorscheme gruvbox-baby")
-- 	end,
-- }
return {
	"maxmx03/dracula.nvim",
	lazy = false, -- make sure we load this during startup if it is your main colorscheme
	priority = 1000, -- make sure to load this before all the other start plugins
	config = function()
		local dracula = require("dracula")

		dracula.setup({
			override = {
				["@type"] = { italic = true, bold = false },
				["@function"] = { italic = false, bold = false },
				["@comment"] = { italic = true },
				["@keyword"] = { italic = false },
				["@constant"] = { italic = false, bold = false },
				["@variable"] = { italic = true },
				["@field"] = { italic = true },
				["@parameter"] = { italic = true },
			},
			transparent = true,
		})

		vim.cmd.colorscheme("dracula")
	end,
}
