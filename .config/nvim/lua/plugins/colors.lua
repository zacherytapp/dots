return {
	-- For TailwindCSS
	{
		"roobert/tailwindcss-colorizer-cmp.nvim",
		-- optionally, override the default options:
		config = function()
			require("tailwindcss-colorizer-cmp").setup({
				color_square_width = 2,
			})
		end,
	},
	-- Gruvbox all the things
	{
		"ellisonleao/gruvbox.nvim",
		priority = 1000,
		config = function()
			local opts = {
				contrast = "soft",
				transparent_mode = true,
				overrides = {
					["@lsp.type.method"] = { fg = "#ff9900" },
				},
			}
			require("gruvbox").setup(opts)
			vim.cmd("colorscheme gruvbox")
		end,
	},
}
