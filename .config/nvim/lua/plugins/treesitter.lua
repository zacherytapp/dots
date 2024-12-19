return {
	{
		{
			"nvim-treesitter/nvim-treesitter",
			build = ":TSUpdate",
			config = function()
				require("nvim-treesitter.configs").setup({
					highlight = {
						enable = true,
					},
					auto_install = true,
					ensure_installed = {
						"apex",
						"soql",
						"sosl",
						"html",
						"bash",
						"lua",
						"javascript",
						"json",
						"typescript",
						"tsx",
						"go",
						"yaml",
						"gotmpl",
					},
				})
				vim.treesitter.language.register("html", "tmpl")
			end,
		},
	},
}
