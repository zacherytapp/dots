return {
	{
		"mbbill/undotree",
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
	{
		"windwp/nvim-autopairs",
		dependencies = {
			"hrsh7th/nvim-cmp", -- autocompletion
		},
		event = "InsertEnter",
		config = function()
			-- import nvim-autopairs safely
			local autopairs = require("nvim-autopairs")

			-- configure autopairs for treesitter, see docs: https://github.com/windwp/nvim-autopairs#treesitter
			autopairs.setup({
				check_ts = true, -- enable treesitter
				ts_config = {
					lua = { "string" }, -- don't add pairs in lua string treesitter nodes
					javascript = { "template_string" }, -- don't add pairs in javscript template_string treesitter nodes
					java = false, -- don't check treesitter on java
				},
			})

			local cmp_autopairs = require("nvim-autopairs.completion.cmp")

			-- import nvim-cmp plugin
			local cmp = require("cmp")

			-- make autopairs and completion work together
			cmp.event:on("confirm_done", cmp_autopairs.on_confirm_done())
		end,
	},
}
