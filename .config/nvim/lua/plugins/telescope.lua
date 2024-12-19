return {
	"nvim-telescope/telescope.nvim",
	branch = "0.1.x",
	dependencies = {
		"nvim-lua/plenary.nvim",
		"nvim-telescope/telescope-live-grep-args.nvim",
		"debugloop/telescope-undo.nvim",
		{
			"nvim-telescope/telescope-fzf-native.nvim",
			build = "make",
			cond = function()
				return vim.fn.executable("make") == 1
			end,
		},
	},
	config = function()
		local sorters = require("telescope.sorters")
		local width = 0.70
		local height = 0.70
		require("telescope").setup({
			pickers = {
				buffers = {
					show_all_buffers = true,
					-- sort_lastused = true,
					sort_mru = true,
					previewer = true,
					theme = "dropdown",
				},
			},
			defaults = {
				vimgrep_arguments = {
					"rg",
					"--vimgrep",
					"--hidden",
					"--smart-case",
					"--trim",
					"--no-heading",
					"--with-filename",
					"--line-number",
					"--column",
				},
				prompt_prefix = " ",
				selection_caret = " ",
				entry_prefix = "  ",
				set_env = { ["COLORTERM"] = "truecolor" },
				initial_mode = "insert",
				selection_strategy = "reset",
				sorting_strategy = "ascending",
				layout_strategy = "horizontal",
				layout_config = {
					prompt_position = "top",
					horizontal = {
						mirror = false,
						width = width,
						height = height,
					},
					vertical = {
						mirror = false,
						width = width,
						height = height,
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
		})
	end,
}
