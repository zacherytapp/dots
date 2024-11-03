return {
	{
		"Mofiqul/dracula.nvim",
		priority = 1000,
		config = function()
			local opts = {
				transparent_bg = true,
				overrides = {
					["@lsp.type.method"] = { fg = "#ff9900" },
				},
			}
			require("dracula").setup(opts)
			vim.cmd("colorscheme dracula")
		end,
	},
}
