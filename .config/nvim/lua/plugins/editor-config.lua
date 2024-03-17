return {
	{
		"nvim-lualine/lualine.nvim",
		opts = {
			options = {
				icons_enabled = false,
				theme = "gruvbox",
				component_separators = "|",
				section_separators = "",
				transparent = false,
			},
		},
	},

	{
		"numToStr/Comment.nvim",
		opts = {},
	},

	{
		"RRethy/vim-illuminate",
	},

	{
		"folke/which-key.nvim",
		opts = {},
	},

	{
		-- Add indentation guides even on blank lines
		"lukas-reineke/indent-blankline.nvim",
		-- See `:help ibl`
		main = "ibl",
		opts = {},
	},
}
