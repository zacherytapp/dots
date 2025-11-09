return {
	"tpope/vim-unimpaired",
	"tpope/vim-ragtag",
	"tpope/vim-abolish",
	"tpope/vim-repeat",
	"tpope/vim-sleuth",
	"mbbill/undotree",
	"RRethy/vim-illuminate",
	"editorconfig/editorconfig-vim", -- TODO is this still required?
	{
		"andymass/vim-matchup",
		cond = not vim.g.vscode,
		config = function()
			vim.g.matchup_matchparen_offscreen = { method = "popup" }
		end,
	},
	{
		"itchyny/vim-qfedit",
		cond = not vim.g.vscode,
		event = "VeryLazy",
	},
	{
		"nvim-pack/nvim-spectre",
		dependencies = {
			"nvim-lua/plenary.nvim",
		},
		cond = not vim.g.vscode,
		config = true,
		keys = {
			{ "<leader>sr", "<cmd>lua require('spectre').open()<cr>", desc = "Open spectre" },
			{ "<leader>sw", "<cmd>lua require('spectre').open_visual({select_word=true})<cr>", desc = "Open spectre" },
			{ "<leader>sp", "<cmd>lua require('spectre').open_file_search()<cr>", desc = "Open spectre" },
			{ "<leader>ss", "<cmd>lua require('spectre').open()<cr>", desc = "Open spectre" },
		},
	},
	{
		"nat-418/boole.nvim",
		opts = {
			mappings = {
				increment = "<C-a>",
				decrement = "<C-x>",
			},
			-- User defined loops
			additions = {
				-- { "Foo", "Bar" },
				-- { "tic", "tac", "toe" },
			},
			allow_caps_additions = {
				{ "enable", "disable" },
				-- enable → disable
				-- Enable → Disable
				-- ENABLE → DISABLE
			},
		},
	},
	{
		"folke/which-key.nvim",
		event = "VeryLazy",
		cond = not vim.g.vscode,
		init = function()
			vim.o.timeout = true
			vim.o.timeoutlen = 300
		end,
		opts = {
			-- your configuration comes here
			-- or leave it empty to use the default settings
			-- refer to the configuration section below
		},
	},
	{
		"Bekaboo/dropbar.nvim",
		-- optional, but required for fuzzy finder support
		cond = not vim.g.vscode,
		dependencies = {
			"nvim-telescope/telescope-fzf-native.nvim",
		},
	},
	-- fast colorizer for showing hex colors
	{
		"NvChad/nvim-colorizer.lua",
		opts = {
			filetypes = { "*" },
			user_default_options = {
				mode = "background",
				tailwind = true,
				RGB = true,
				RRGGBB = true,
				names = true,
				RRGGBBAA = true,
				rgb_fn = true,
				hsl_fn = true,
				css = true,
				css_fn = true,
			},
		},
	},
	-- file drawer plugin
	-- Floating statuslines. This is used to show buffer names in splits
	{
		"b0o/incline.nvim",
		cond = not vim.g.vscode,
		event = "BufReadPre",
		opts = {
			highlight = {
				groups = {
					InclineNormal = { default = true, group = "lualine_a_normal" },
					InclineNormalNC = { default = true, group = "lualine_a_normal" },
				},
			},
			window = { margin = { vertical = 0, horizontal = 1 } },
			render = function(props)
				local filename = vim.fn.fnamemodify(vim.api.nvim_buf_get_name(props.buf), ":t")
				local icon, color = require("nvim-web-devicons").get_icon_color(filename)
				return { { icon, guifg = color }, { icon and " " or "" }, { filename } }
			end,
			hide = {
				cursorline = false,
				focused_win = false,
				only_win = true,
			},
		},
	},
	{ "alvarosevilla95/luatab.nvim", config = true },
	-- improve the default neovim interfaces, such as refactoring
	{ "stevearc/dressing.nvim", event = "VeryLazy" },
	{ "MunifTanjim/nui.nvim", lazy = true },
	{
		"folke/noice.nvim",
		event = "VeryLazy",
		opts = {
			-- add any options here
			lsp = {
				-- override markdown rendering so that **cmp** and other plugins use **Treesitter**
				override = {
					["vim.lsp.util.convert_input_to_markdown_lines"] = true,
					["vim.lsp.util.stylize_markdown"] = true,
					["cmp.entry.get_documentation"] = true,
				},
			},
			-- you can enable a preset for easier configuration
			presets = {
				bottom_search = false, -- use a classic bottom cmdline for search
				command_palette = true, -- position the cmdline and popupmenu together
				long_message_to_split = true, -- long messages will be sent to a split
				inc_rename = false, -- enables an input dialog for inc-rename.nvim
				lsp_doc_border = false, -- add a border to hover docs and signature help
			},
			routes = {
				{
					filter = { find = "No information available" },
					opts = { stop = true },
				},
			},
		},
		dependencies = {
			-- if you lazy-load any plugin below, make sure to add proper `module="..."` entries
			"MunifTanjim/nui.nvim",
			-- OPTIONAL:
			--   `nvim-notify` is only needed, if you want to use the notification view.
			--   If not available, we use `mini` as the fallback
			"rcarriga/nvim-notify",
		},
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
