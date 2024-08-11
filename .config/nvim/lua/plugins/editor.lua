return {
	{
		"mbbill/undotree",
		"tpope/vim-surround",
		"folke/which-key.nvim",
		"RRethy/vim-illuminate",
		"stevearc/dressing.nvim",
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
		"echasnovski/mini.icons",
		version = false,
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
	{
		"lukas-reineke/indent-blankline.nvim",
		main = "ibl",
	},
	{
		"rcarriga/nvim-notify",
		opts = {},
		config = function()
			require("notify").setup({
				background_colour = "#000000",
			})
		end,
	},
}
