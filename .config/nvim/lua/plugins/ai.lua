return {
	{
		"github/copilot.vim",
	},
	{
		"olimorris/codecompanion.nvim",
		config = true,
		dependencies = {
			"nvim-lua/plenary.nvim",
			"nvim-treesitter/nvim-treesitter",
		},
		enabled = true,
		cmd = { "CodeCompanion" },
		opts = {
			strategies = {
				chat = {
					adapter = "anthropic",
				},
				inline = {
					adapter = "anthropic",
				},
			},
		},
	},
}
