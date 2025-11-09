local utils = require("utils")

return {
	"nvim-telescope/telescope.nvim",
	branch = "0.1.x",
	dependencies = {
		"nvim-lua/plenary.nvim",
		"nvim-telescope/telescope-live-grep-args.nvim",
		"debugloop/telescope-undo.nvim",
		"nvim-telescope/telescope-ui-select.nvim",
		"nvim-telescope/telescope-file-browser.nvim",
		"rcarriga/nvim-notify",
		{
			"nvim-telescope/telescope-fzf-native.nvim",
			build = "make",
			cond = function()
				return vim.fn.executable("make") == 1
			end,
		},
		{
			"nvim-tree/nvim-web-devicons",
			enabled = vim.g.have_nerd_font,
		},
	},
	config = function()
		local sorters = require("telescope.sorters")
		local telescope = require("telescope")
		local actions = require("telescope.actions")
		local width = 0.85
		local height = 0.85
		local preview_width = 0.6
		require("telescope").setup({
			extensions = {
				fzf = {},
				["ui-select"] = {
					require("telescope.themes").get_dropdown({}),
				},
			},
			defaults = {
				vimgrep_arguments = {
					"rg",
					"--color=never",
					"--column",
					"--follow",
					"--glob",
					"!**/.git/*",
					"--ignore-file",
					".rgignore",
					"--line-number",
					"--no-heading",
					"--smart-case",
					"--trim",
					"--with-filename",
				},
				prompt_prefix = " ",
				selection_caret = " ",
				entry_prefix = "  ",
				set_env = { ["COLORTERM"] = "truecolor" },
				initial_mode = "insert",
				selection_strategy = "reset",
				sorting_strategy = "ascending",
				layout_strategy = "horizontal",
				mappings = {
					i = {
						["<C-k>"] = actions.move_selection_previous,
						["<C-j>"] = actions.move_selection_next,
					},
				},
				layout_config = {
					prompt_position = "top",
					horizontal = {
						mirror = false,
						width = width,
						height = height,
						preview_width = preview_width,
					},
					vertical = {
						mirror = false,
						width = width,
						height = height,
						preview_height = 0.5,
					},
				},
				file_sorter = sorters.get_fuzzy_file,
				file_ignore_patterns = { "gtk/**/*", "node_modules", ".git", "pdf_viewer" },
				generic_sorter = sorters.get_generic_fuzzy_sorter,
				winblend = 0,
				border = {},
				borderchars = { "─", "│", "─", "│", "╭", "╮", "╯", "╰" },
				color_devicons = true,
				use_less = true,
				path_display = {},
			},
			pickers = {
				buffers = {
					show_all_buffers = true,
					sort_lastused = true,
					sort_mru = true,
					previewer = true,
					theme = "dropdown",
				},

				find_files = {
					find_command = {
						"rg",
						"--files",
						"--follow",
						"--glob",
						"!**/.git/*",
						"--ignore-file",
						".rgignore",
						"--no-ignore-vcs",
					},
				},
			},
		})
		telescope.load_extension("ui-select")
		telescope.load_extension("fzf")
		telescope.load_extension("file_browser")
		telescope.load_extension("notify")
	end,
	commander = {
		-- Notifications
		{
			keys = { "n", "<leader>sn" },
			cmd = function()
				utils.notifications()
			end,
			desc = "Telescope: Show notifications",
		},
		{
			keys = { "n", "<leader>ff" },
			cmd = function()
				utils.find_files()
			end,
			desc = "Telescope: Find files",
		},
		{
			keys = { "n", "<leader>fo" },
			cmd = function()
				utils.oldfiles()
			end,
			desc = "Telescope: Find old files",
		},
		{
			keys = { "n", "<leader>ft" },
			cmd = function()
				utils.live_grep()
			end,
			desc = "Telescope: Find text",
		},
		{
			keys = { "n", "<leader>fb" },
			cmd = function()
				utils.search_buffers()
			end,
			desc = "Telescope: Find buffers",
		},

		{
			keys = { "n", "<leader>sh" },
			cmd = function()
				utils.search_history()
			end,
			desc = "Telescope: Find marks",
		},
		{
			keys = { "n", "<leader>fn" },
			cmd = function()
				utils.search_notes()
			end,
			desc = "Telescope: Find notes",
		},
		{
			keys = { "n", "<leader>fr" },
			cmd = function()
				utils.search_reference()
			end,
			desc = "Telescope: Find reference",
		},
		{
			keys = { "n", "<leader>fk" },
			cmd = function()
				utils.keymaps()
			end,
			desc = "Telescope: Find keymaps",
		},
		{
			keys = { "n", "<leader>fp" },
			cmd = function()
				utils.search_projects_dir()
			end,
			desc = "Telescope: Find projects",
		},
		{
			keys = { "n", "<leader>fh" },
			cmd = function()
				utils.search_help()
			end,
			desc = "Telescope: Grep over help",
		},
		{
			keys = { "n", "<leader>fg" },
			cmd = [[<cmd>Telescope git_files<cr>]],
			desc = "Telescope: Find git files",
		},
		-- Diagnostics
		{
			keys = { "n", "<leader>da" },
			cmd = [[<cmd>Telescope diagnostics bufnr=0<cr>]],
			desc = "Telescope: Open diagnostic",
		},
		{
			keys = { "n", "gd" },
			cmd = [[<cmd>Telescope lsp_defininitions<cr>]],
			desc = "Telescope: Open definitions",
		},
		{
			keys = { "n", "gr" },
			cmd = [[<cmd>Telescope lsp_references<cr>]],
			desc = "Telescope: Open references",
		},
		{
			keys = { "n", "gr" },
			cmd = [[<cmd>Telescope lsp_implementations<cr>]],
			desc = "Telescope: Open implementations",
		},
		{
			keys = { "n", "<leader>fr" },
			cmd = [[<cmd>Telescope lsp_references<cr>]],
			desc = "Telescope: Find references",
		},
		{
			keys = { "n", "<leader>fh" },
			cmd = function()
				utils.search_help()
			end,
			desc = "Telescope: Open Search in Help",
		},
		{
			keys = { "n", "<leader>fg" },
			cmd = [[<cmd>Telescope live_grep<cr>]],
			desc = "Telescope: Search by Grep",
		},
		{
			keys = { "n", "<leader>fw" },
			cmd = [[<cmd>Telescope grep_string<cr>]],
			desc = "Telescope: Search current word",
		},
		{
			keys = { "n", "<leader>dr" },
			cmd = [[<cmd>Telescope lsp_references<cr>]],
			desc = "Telescope: Open references",
		},
		{
			keys = { "n", "<leader>ds" },
			cmd = [[<cmd>Telescope lsp_document_symbols<cr>]],
			desc = "Telescope: Open document symbols",
		},
		{
			keys = { "n", "<leader>ls" },
			cmd = [[<cmd>Telescope lsp_document_symbols<cr>]],
			desc = "Telescope: List symbols in buffer",
		},
		{
			keys = { "n", "<leader>b" },
			cmd = [[<cmd>Telescope buffers<cr>]],
			desc = "Telescope: List buffers",
		},
	},
}
