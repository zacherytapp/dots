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
	{ "nvim-mini/mini.surround", version = false },

	{
		"windwp/nvim-autopairs",
		event = "InsertEnter",
		config = function()
			local npairs = require("nvim-autopairs")
			npairs.setup({
				disable_in_macro = true,
				check_ts = true,
				ts_config = {
					lua = { "string" },
					javascript = { "template_string" },
					java = true,
					yaml = { "string" },
				},
			})
		end,
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
