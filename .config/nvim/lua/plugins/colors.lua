return {
	{
		"rose-pine/neovim",
		lazy = false,
		priority = 1000,
		opts = {},
		name = "rose-pine",
		config = function()
			vim.cmd([[colorscheme rose-pine]])
		end,
	},
}
