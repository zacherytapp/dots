return {
	"ellisonleao/gruvbox.nvim",
	branch = "main",
	lazy = false,
	priority = 100,
	opts = {},
	config = function()
		require("gruvbox").setup({
			terminal_colors = true, -- add neovim terminal colors
			undercurl = true,
			underline = true,
			bold = true,
			italic = {
				strings = true,
				emphasis = true,
				comments = true,
				operators = false,
				folds = true,
			},
			strikethrough = true,
			invert_selection = false,
			invert_signs = false,
			invert_tabline = false,
			invert_intend_guides = false,
			inverse = true, -- invert background for search, diffs, statuslines and errors
			contrast = "", -- can be "hard", "soft" or empty string
			palette_overrides = {},
			overrides = {},
			dim_inactive = false,
			transparent_mode = false,
		})
		vim.cmd("colorscheme gruvbox")
	end,
}
-- return {
-- 	"maxmx03/dracula.nvim",
-- 	lazy = false, -- make sure we load this during startup if it is your main colorscheme
-- 	priority = 1000, -- make sure to load this before all the other start plugins
-- 	config = function()
-- 		local dracula = require("dracula")
--
-- 		dracula.setup({
-- 			override = {
-- 				["@type"] = { italic = true, bold = false },
-- 				["@function"] = { italic = false, bold = false },
-- 				["@comment"] = { italic = true },
-- 				["@keyword"] = { italic = false },
-- 				["@constant"] = { italic = false, bold = false },
-- 				["@variable"] = { italic = true },
-- 				["@field"] = { italic = true },
-- 				["@parameter"] = { italic = true },
-- 			},
-- 			transparent = true,
-- 		})
--
-- 		vim.cmd.colorscheme("dracula")
-- 	end,
-- }
