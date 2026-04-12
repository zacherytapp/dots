return {
	"tpope/vim-unimpaired",
	"tpope/vim-abolish",
	"tpope/vim-repeat",
	"tpope/vim-sleuth",
	{
		"stevearc/overseer.nvim",
		opts = {},
	},
	{
		"MagicDuck/grug-far.nvim",
		cond = not vim.g.vscode,
		opts = {},
		commander = {
			{
				keys = { "n", "<leader>sr" },
				cmd = "<cmd>GrugFar<cr>",
				desc = "Search and replace (grug-far)",
			},
			{
				keys = { "v", "<leader>sw" },
				cmd = function()
					require("grug-far").with_visual_selection()
				end,
				desc = "Search and replace current selection",
			},
			{
				keys = { "n", "<leader>sp" },
				cmd = function()
					require("grug-far").open({ prefills = { paths = vim.fn.expand("%") } })
				end,
				desc = "Search and replace in current file",
			},
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
			},
		},
	},
	{
		"folke/which-key.nvim",
		event = "VeryLazy",
		cond = not vim.g.vscode,
		opts = {},
	},
	{
		"Bekaboo/dropbar.nvim",
		-- optional, but required for fuzzy finder support
		cond = not vim.g.vscode,
		dependencies = {
			"nvim-telescope/telescope-fzf-native.nvim",
		},
	},
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
				{
				"rcarriga/nvim-notify",
				opts = {
					background_colour = "#000000",
				},
			},
		},
	},
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
}
