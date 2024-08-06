return {
	{
		"mbbill/undotree",
		"tpope/vim-surround",
		"folke/which-key.nvim",
		"numToStr/Comment.nvim",
		"RRethy/vim-illuminate",
		"stevearc/dressing.nvim",
	},
	{
		"echasnovski/mini.icons",
		version = false,
	},
	{
		"folke/trouble.nvim",
		opts = {}, -- for default options, refer to the configuration section for custom setup.
		cmd = "Trouble",
		keys = {
			{
				"<leader>xx",
				"<cmd>Trouble diagnostics toggle<cr>",
				desc = "Diagnostics (Trouble)",
			},
			{
				"<leader>xX",
				"<cmd>Trouble diagnostics toggle filter.buf=0<cr>",
				desc = "Buffer Diagnostics (Trouble)",
			},
			{
				"<leader>cs",
				"<cmd>Trouble symbols toggle focus=false<cr>",
				desc = "Symbols (Trouble)",
			},
			{
				"<leader>cl",
				"<cmd>Trouble lsp toggle focus=false win.position=right<cr>",
				desc = "LSP Definitions / references / ... (Trouble)",
			},
			{
				"<leader>xL",
				"<cmd>Trouble loclist toggle<cr>",
				desc = "Location List (Trouble)",
			},
			{
				"<leader>xQ",
				"<cmd>Trouble qflist toggle<cr>",
				desc = "Quickfix List (Trouble)",
			},
		},
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
		"nvim-lualine/lualine.nvim",
		dependencies = { "nvim-tree/nvim-web-devicons" },
		config = function()
			require("lualine").setup({
				options = {
					theme = "gruvbox",
					section_separators = { left = "", right = "" },
					component_separators = { left = "", right = "" },
					sections = {
						lualine_a = { "mode" },
						lualine_b = { "branch" },
						lualine_c = {
							"filename",
							{
								"require'salesforce.org_manager':get_default_alias()",
								icon = "󰢎",
							},
						},
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
		"windwp/nvim-autopairs",
		dependencies = {
			"hrsh7th/nvim-cmp",
		},
		event = "InsertEnter",
		config = function()
			local autopairs = require("nvim-autopairs")
			autopairs.setup({
				check_ts = true,
				ts_config = {
					lua = { "string" },
					javascript = { "template_string" },
					java = false,
				},
			})
			local cmp_autopairs = require("nvim-autopairs.completion.cmp")
			local cmp = require("cmp")
			cmp.event:on("confirm_done", cmp_autopairs.on_confirm_done())
		end,
	},
}
