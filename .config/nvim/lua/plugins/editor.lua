return {
	{
		"mbbill/undotree",
		"tpope/vim-surround",
		"RRethy/vim-illuminate",
		"stevearc/dressing.nvim",
		"folke/which-key.nvim",
	},
	{
		"folke/trouble.nvim",
		opts = {}, -- for default options, refer to the configuration section for custom setup.
		cmd = "Trouble",
	},
	{
		"numToStr/Comment.nvim",
		config = function()
			require("Comment").setup()
			local ft = require("Comment.ft")
			ft.apex = { "//%s", "/**%s*/" }
		end,
	},
	{
		"lukas-reineke/indent-blankline.nvim",
		main = "ibl",
	},
	{
		"stevearc/oil.nvim",
		opts = {
			view_options = {
				show_hidden = true,
			},
		},
		dependencies = { "nvim-tree/nvim-web-devicons" },
	},
}
