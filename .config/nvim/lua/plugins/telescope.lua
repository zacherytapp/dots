return {

	"nvim-telescope/telescope.nvim",
	branch = "0.1.x",
	dependencies = {
		"nvim-lua/plenary.nvim",
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
		require("telescope").setup({
			defaults = {
				prompt_prefix = "   ",
				selection_caret = "  ",
				entry_prefix = "  ",
				initial_mode = "insert",
				selection_strategy = "reset",
				sorting_strategy = "ascending",
				layout_strategy = "horizontal",
				layout_config = {
					horizontal = {
						prompt_position = "top",
						preview_width = 0.55,
						results_width = 0.8,
					},
					vertical = {
						mirror = false,
					},
					width = 0.87,
					height = 0.80,
					preview_cutoff = 120,
				},
				file_sorter = require("telescope.sorters").get_fuzzy_file,
				file_ignore_patterns = {
					"node_modules",
					".git/.*",
					".cache",
					"./node_modules/.**",
					"^node_modules/*",
					"node_modules/*",
					".venv",
				},
				hidden = true,
				generic_sorter = require("telescope.sorters").get_generic_fuzzy_sorter,
				path_display = { "truncate" },
				winblend = 0,
				border = {},
				borderchars = {
					prompt = { "─", " ", " ", " ", "─", "─", " ", " " },
					results = { " " },
					preview = { " " },
				},
				color_devicons = true,
				file_previewer = require("telescope.previewers").vim_buffer_cat.new,
				grep_previewer = require("telescope.previewers").vim_buffer_vimgrep.new,
				qflist_previewer = require("telescope.previewers").vim_buffer_qflist.new,
				buffer_previewer_maker = require("telescope.previewers").buffer_previewer_maker,
				mappings = {
					n = { ["q"] = require("telescope.actions").close },
				},
			},
			extensions_list = { "themes", "terms", "undo" },
			mappings = {
				i = {
					["<C-u>"] = false,
					["<C-d>"] = false,
				},
			},
			vimgrep_arguments = {
				"rg",
				"--color=never",
				"--no-heading",
				"--with-filename",
				"--line-number",
				"--column",
				"--smart-case",
			},
			pickers = {
				live_grep = {
					additional_args = { "--hidden" },
				},
				grep_string = {
					additional_args = { "--hidden" },
				},
				find_files = {
					find_command = { "rg", "--files", "--iglob", "!.git", "--hidden" },
				},
			},
		})

		-- Enable telescope fzf native, if installed
		pcall(require("telescope").load_extension, "fzf")
		require("telescope").load_extension("undo")

		-- See `:help telescope.builtin`
		vim.keymap.set(
			"n",
			"<leader>?",
			require("telescope.builtin").oldfiles,
			{ desc = "[?] Find recently opened files" }
		)
		vim.keymap.set(
			"n",
			"<leader><space>",
			require("telescope.builtin").buffers,
			{ desc = "[ ] Find existing buffers" }
		)
		vim.keymap.set("n", "<leader>/", function()
			-- You can pass additional configuration to telescope to change theme, layout, etc.
			require("telescope.builtin").current_buffer_fuzzy_find(require("telescope.themes").get_dropdown({
				winblend = 10,
				previewer = false,
			}))
		end, { desc = "[/] Fuzzily search in current buffer" })

		vim.keymap.set("n", "<leader>gf", require("telescope.builtin").git_files, { desc = "Search [G]it [F]iles" })
		vim.keymap.set("n", "<leader>ff", require("telescope.builtin").find_files, { desc = "[S]earch [F]iles" })
		-- vim.keymap.set(
		-- 	"n",
		-- 	"<leader>ff",
		-- 	[[<cmd>lua require('telescope.builtin').find_files({ hidden = true })<CR>]],
		-- 	{ desc = "[S]earch [F]iles" }
		-- )
		vim.keymap.set("n", "<leader>fh", require("telescope.builtin").help_tags, { desc = "[S]earch [H]elp" })
		vim.keymap.set(
			"n",
			"<leader>fw",
			require("telescope.builtin").grep_string,
			{ desc = "[S]earch current [W]ord" }
		)
		vim.keymap.set("n", "<leader>fg", require("telescope.builtin").live_grep, { desc = "[S]earch by [G]rep" })
		vim.keymap.set("n", "<leader>fd", require("telescope.builtin").diagnostics, { desc = "[S]earch [D]iagnostics" })
		vim.keymap.set("n", "<leader>fr", require("telescope.builtin").resume, { desc = "[S]earch [R]esume" })
		vim.keymap.set("n", "<leader>fu", require("telescope").extensions.undo.undo, { desc = "[S]earch [U]ndo" })
	end,
}
