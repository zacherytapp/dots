return {
	{
		"mbbill/undotree",
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
	-- fast colorizer for showing hex colors
	{
		"norcalli/nvim-colorizer.lua",
		config = function()
			require("colorizer").setup({
				"css",
			})
		end,
	},
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
		"lukas-reineke/indent-blankline.nvim",
		main = "ibl",
		---@module "ibl"
		---@type ibl.config
		opts = {},
		config = function(_, opts)
			local highlight = {
				"RainbowRed",
				"RainbowYellow",
				"RainbowBlue",
				"RainbowOrange",
				"RainbowGreen",
				"RainbowViolet",
				"RainbowCyan",
			}

			local hooks = require("ibl.hooks")
			-- create the highlight groups in the highlight setup hook, so they are reset
			-- every time the colorscheme changes
			hooks.register(hooks.type.HIGHLIGHT_SETUP, function()
				vim.api.nvim_set_hl(0, "RainbowRed", { fg = "#E46876" })
				vim.api.nvim_set_hl(0, "RainbowYellow", { fg = "#E6C384" })
				vim.api.nvim_set_hl(0, "RainbowBlue", { fg = "#8ba4b0" })
				vim.api.nvim_set_hl(0, "RainbowOrange", { fg = "#b6927b" })
				vim.api.nvim_set_hl(0, "RainbowGreen", { fg = "#87a987" })
				vim.api.nvim_set_hl(0, "RainbowViolet", { fg = "#8992a7" })
				vim.api.nvim_set_hl(0, "RainbowCyan", { fg = "#8ea4a2" })
			end)

			require("ibl").setup({ indent = { highlight = highlight } })
		end,
	},
	{
		"hedyhli/outline.nvim",
		lazy = true,
		cmd = { "Outline", "OutlineOpen" },
		keys = {
			{ "<leader>lo", "<cmd>Outline<CR>", desc = "Toggle outline" },
		},
		opts = {
			providers = {
				priority = { "lsp", "treesitter", "markdown", "norg", "man" },
			},
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
