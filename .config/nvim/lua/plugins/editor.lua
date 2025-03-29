return {
	{
		"mbbill/undotree",
		"RRethy/vim-illuminate",
	},
	{
		"folke/todo-comments.nvim",
		cmd = "TodoFzfLua",
		dependencies = { "nvim-lua/plenary.nvim" },
		opts = {},
		keys = {
			{
				"]t",
				function()
					require("todo-comments").jump_next()
				end,
				desc = "Next Todo Comment",
			},
			{
				"[t",
				function()
					require("todo-comments").jump_prev()
				end,
				desc = "Previous Todo Comment",
			},
		},
	},
	{
		"allaman/emoji.nvim",
		ft = "markdown",
		dependencies = {
			"nvim-lua/plenary.nvim",
			"hrsh7th/nvim-cmp",
		},
		opts = {
			enable_cmp_integration = true,
		},
	},
	{
		"norcalli/nvim-colorizer.lua",
		config = function()
			require("colorizer").setup({
				"css",
			})
		end,
	},
	{
		"stevearc/dressing.nvim",
		opts = {},
	},
	{
		"echasnovski/mini.pairs",
	},
	{
		"windwp/nvim-autopairs",
		event = "InsertEnter",
		opts = {},
	},
	{
		"folke/trouble.nvim",
		opts = {},
		cmd = "Trouble",
	},
	{
		"numToStr/Comment.nvim",
		config = function()
			require("Comment").setup()
			local ft = require("Comment.ft")
			ft.apex = { "//%s", "/**%s*/" }
			ft({ "tmpl" }, ft.get("html"))
		end,
	},
	{
		"lukas-reineke/indent-blankline.nvim",
		main = "ibl",
	},
	{
		"stevearc/oil.nvim",
		dependencies = { "nvim-tree/nvim-web-devicons" },
		lazy = true,
		event = "VimEnter",
		opts = {
			columns = {
				"icon",
				"size",
				"mtime",
			},
			view_options = {
				show_hidden = true,
			},
			delete_to_trash = true,
			constrain_cursor = "name",
			watch_for_changes = true,
		},
		commander = {
			{
				keys = { "n", "<leader>-" },
				cmd = [[<cmd>Oil --float .<cr>]],
				desc = "Oil: Open root",
			},
			{
				keys = { "n", "<leader>_" },
				cmd = [[<cmd>Oil --float<cr>]],
				desc = "Oil: Open here",
			},
		},
	},
	{
		"hedyhli/outline.nvim",
		lazy = true,
		cmd = { "Outline", "OutlineOpen" },
		keys = {
			{ "<leader>o", "<cmd>Outline<CR>", desc = "Toggle outline" },
		},
		opts = {
			symbol_folding = {
				autofold_depth = false,
			},
		},
	},
	{
		"FeiyouG/commander.nvim",
		lazy = true,
		dependencies = { "nvim-telescope/telescope.nvim" },
		opts = {
			components = {
				"DESC",
				"KEYS",
				"CAT",
			},
			sort_by = {
				"DESC",
				"KEYS",
				"CAT",
				"CMD",
			},
			integration = {
				lazy = {
					enable = true,
					set_plugin_name_as_cat = true,
				},
				telescope = {
					enable = true,
				},
			},
		},
	},
}
