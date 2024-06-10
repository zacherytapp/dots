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
	opts = {
		defaults = {
			prompt_prefix = "   ",
			layout_strategy = "horizontal",
			layout_config = {
				horizontal = {
					prompt_position = "bottom",
					preview_width = 0.55,
					results_width = 0.8,
				},
				vertical = {
					mirror = false,
				},
				width = 0.87,
				height = 0.80,
			},
			border = {},
			borderchars = {
				prompt = { "─", " ", " ", " ", "─", "─", " ", " " },
				results = { " " },
				preview = { " " },
			},
			color_devicons = true,
			file_ignore_patters = { "node_modules", "**/node_modules", ".git" },
			mappings = {
				i = {
					["<C-u>"] = false,
					["<C-d>"] = false,
				},
			},
			extensions = {
				fzf = {
					fuzzy = true,
					override_generic_sorter = true,
					override_file_sorter = true,
					case_mode = "smart_case",
				},
			},
		},
	},
	keys = {
		{
			"<leader>ff",
			require("telescope.builtin").find_files,
			desc = "[F]ind [F]iles (Telescope)",
		},
		{
			"<leader>fg",
			require("telescope.builtin").live_grep,
			desc = "[F]ind [G]rep (Telescope)",
		},
		{
			"<leader>fh",
			require("telescope.builtin").help_tags,
			desc = "[F]ind [H]elp (Telescope)",
		},
		{
			"<leader>fw",
			require("telescope.builtin").grep_string,
			desc = "[F]ind [W]ord (Telescope)",
		},
		{
			"<leader>fd",
			require("telescope.builtin").lsp_document_diagnostics,
			desc = "[F]ind [D]iagnostics (Telescope)",
		},
		{
			"<leader>fr",
			require("telescope.builtin").lsp_references,
			desc = "[F]ind [R]eferences (Telescope)",
		},
		{
			"<leader>fi",
			require("telescope.builtin").git_files,
			desc = "[F]ind G[i]t Files (Telescope)",
		},
	},
}
