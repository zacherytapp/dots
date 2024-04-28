return {
	{
		"mbbill/undotree",
	},
	{
		"nvim-neo-tree/neo-tree.nvim",
		branch = "v3.x",
		dependencies = {
			"nvim-lua/plenary.nvim",
			"nvim-tree/nvim-web-devicons", -- not strictly required, but recommended
			"MunifTanjim/nui.nvim",
			-- "3rd/image.nvim", -- Optional image support in preview window: See `# Preview Mode` for more information
		},
		opts = {
			filesystem = {
				filtered_items = {
					visible = true,
					show_hidden_count = true,
					hide_dotfiles = false,
					hide_gitignored = false,
					never_show = {},
				},
			},
		},
	},
	{
		"nvim-lualine/lualine.nvim",
		dependencies = { "nvim-tree/nvim-web-devicons" },
		config = function()
			require("lualine").setup({
				options = {
					theme = "catppuccin",
					section_separators = { left = "", right = "" },
					component_separators = { left = "", right = "" },
					sections = {
						lualine_a = { "mode" },
						lualine_b = { "branch" },
						lualine_c = { "filename" },
						lualine_x = { "encoding", "fileformat", "filetype" },
						lualine_y = { "progress" },
						lualine_z = { "location" },
					},
					tabline = {},
					extensions = { "neotree" },
				},
			})
		end,
	},
	{
		"folke/trouble.nvim",
		dependencies = {
			"nvim-tree/nvim-web-devicons",
		},
	},
	{
		"stevearc/oil.nvim",
		opts = {
			view_options = {
				show_hidden = true,
			},
		},
		-- Optional dependencies
		dependencies = { "nvim-tree/nvim-web-devicons" },
	},

	{
		"tpope/vim-surround",
	},

	{
		"folke/which-key.nvim",
		opts = {},
	},
	{
		"numToStr/Comment.nvim",
		opts = {},
	},
	{
		"RRethy/vim-illuminate",
	},
	{
		-- Add indentation guides even on blank lines
		"lukas-reineke/indent-blankline.nvim",
		-- See `:help ibl`
		main = "ibl",
		opts = {},
	},
}
