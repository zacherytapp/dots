return {
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
