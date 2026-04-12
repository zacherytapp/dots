return {
	"nvim-telescope/telescope.nvim",
	branch = "master",
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
						["<C-q>"] = actions.smart_send_to_qflist + actions.open_qflist,
					},
					n = {
						["<C-q>"] = actions.smart_send_to_qflist + actions.open_qflist,
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
			cmd = [[<cmd>Telescope notify<cr>]],
			desc = "Telescope: Show notifications",
		},
		{
			keys = { "n", "<leader>ff" },
			cmd = [[<cmd>Telescope find_files<cr>]],
			desc = "Telescope: Find files",
		},
		{
			keys = { "n", "<leader>fo" },
			cmd = [[<cmd>Telescope oldfiles<cr>]],
			desc = "Telescope: Find old files",
		},
		{
			keys = { "n", "<leader>ft" },
			cmd = [[<cmd>Telescope live_grep<cr>]],
			desc = "Telescope: Find text",
		},
		{
			keys = { "n", "<leader>fb" },
			cmd = [[<cmd>Telescope buffers<cr>]],
			desc = "Telescope: Find buffers",
		},

		{
			keys = { "n", "<leader>sh" },
			cmd = [[<cmd>Telescope command_history<cr>]],
			desc = "Telescope: Find command history",
		},
		{
			keys = { "n", "<leader>fn" },
			cmd = function()
				require("telescope.builtin").find_files({ cwd = "~/Documents/work/" })
			end,
			desc = "Telescope: Find notes",
		},
		{
			keys = { "n", "<leader>fr" },
			cmd = function()
				require("telescope.builtin").find_files({ cwd = "~/projects/ref" })
			end,
			desc = "Telescope: Find reference",
		},
		{
			keys = { "n", "<leader>fk" },
			cmd = [[<cmd>Telescope keymaps<cr>]],
			desc = "Telescope: Find keymaps",
		},
		{
			keys = { "n", "<leader>fP" },
			cmd = function()
				require("telescope.builtin").find_files({ cwd = "~/projects/" })
			end,
			desc = "Telescope: Find files in projects dir",
		},
		{
			keys = { "n", "<leader>fh" },
			cmd = [[<cmd>Telescope help_tags<cr>]],
			desc = "Telescope: Search help",
		},
		{
			keys = { "n", "<leader>fg" },
			cmd = [[<cmd>Telescope git_files<cr>]],
			desc = "Telescope: Find git files",
		},
		{
			keys = { "n", "<leader>gc" },
			cmd = [[<cmd>Telescope git_commits<cr>]],
			desc = "Telescope: Git commits",
		},
		{
			keys = { "n", "<leader>gC" },
			cmd = [[<cmd>Telescope git_bcommits<cr>]],
			desc = "Telescope: Git commits (current buffer)",
		},
		{
			keys = { "n", "<leader>gR" },
			cmd = [[<cmd>Telescope git_branches<cr>]],
			desc = "Telescope: Git branches",
		},
		{
			keys = { "n", "<leader>gS" },
			cmd = [[<cmd>Telescope git_stash<cr>]],
			desc = "Telescope: Git stash",
		},
		{
			keys = { "n", "gd" },
			cmd = [[<cmd>Telescope lsp_definitions<cr>]],
			desc = "Telescope: Open definitions",
		},
		{
			keys = { "n", "gr" },
			cmd = [[<cmd>Telescope lsp_references<cr>]],
			desc = "Telescope: Open references",
		},
		{
			keys = { "n", "gi" },
			cmd = [[<cmd>Telescope lsp_implementations<cr>]],
			desc = "Telescope: Open implementations",
		},
		{
			keys = { "n", "<leader>fw" },
			cmd = [[<cmd>Telescope grep_string<cr>]],
			desc = "Telescope: Search current word",
		},
		{
			keys = { "n", "<leader>ls" },
			cmd = [[<cmd>Telescope lsp_document_symbols<cr>]],
			desc = "Telescope: List symbols in buffer",
		},
	},
}
