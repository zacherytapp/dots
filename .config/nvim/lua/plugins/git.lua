return {
	{
		"tpope/vim-fugitive",
		lazy = false,
		commander = {
			{
				keys = { "n", "<leader>gr" },
				cmd = "<cmd>Gread<cr>",
				desc = "Git: Read file from git",
			},
			{
				keys = { "n", "<leader>gs" },
				cmd = "<cmd>Git<cr>",
				desc = "Git: Open Git status",
			},
		},
		dependencies = { "tpope/vim-rhubarb" },
	},
	{
		"akinsho/git-conflict.nvim",
		version = "*",
		config = true,
	},
	{
		"lewis6991/gitsigns.nvim",
		opts = {},
		commander = {
			{
				keys = { "n", "[c" },
				cmd = function()
					if vim.wo.diff then
						return "[c"
					end
					vim.schedule(function()
						require("gitsigns").nav_hunk("prev")
					end)
					return "<Ignore>"
				end,
				desc = "Git: Previous hunk",
			},
			{
				keys = { "n", "]c" },
				cmd = function()
					if vim.wo.diff then
						return "]c"
					end
					vim.schedule(function()
						require("gitsigns").nav_hunk("next")
					end)
					return "<Ignore>"
				end,
				desc = "Git: Next hunk",
			},
			{
				keys = { "n", "<leader>hs" },
				cmd = [[<cmd>lua require'gitsigns'.stage_hunk()<cr>]],
				desc = "Git: Stage hunk",
			},
			{
				keys = { "n", "<leader>hr" },
				cmd = [[<cmd>lua require'gitsigns'.reset_hunk()<cr>]],
				desc = "Git: Reset hunk",
			},
			{
				keys = { "v", "<leader>hs" },
				cmd = function()
					require("gitsigns").stage_hunk({ vim.fn.line("."), vim.fn.line("v") })
				end,
				desc = "Git: Stage selection",
			},
			{
				keys = { "v", "<leader>hr" },
				cmd = function()
					require("gitsigns").reset_hunk({ vim.fn.line("."), vim.fn.line("v") })
				end,
				desc = "Git: Reset selection",
			},
			{
				keys = { "n", "<leader>hu" },
				cmd = [[<cmd>lua require'gitsigns'.undo_stage_hunk()<cr>]],
				desc = "Git: Undo stage hunk",
			},
			{
				keys = { "n", "<leader>hp" },
				cmd = [[<cmd>lua require'gitsigns'.preview_hunk()<cr>]],
				desc = "Git: Preview hunk",
			},
			{
				keys = { "n", "<leader>gfd" },
				cmd = [[<cmd>lua require'gitsigns'.diffthis()<cr>]],
				desc = "Git: Diff buffer",
			},
			{
				keys = { "n", "<leader>gb" },
				cmd = [[<cmd>lua require'gitsigns'.toggle_current_line_blame()<cr>]],
				desc = "Git: Toggle Line Blame",
			},
		},
	},
	{
		"sindrets/diffview.nvim",
		dependencies = { "nvim-lua/plenary.nvim" },
		cmd = { "DiffviewOpen", "DiffviewFileHistory", "DiffviewClose" },
		commander = {
			{
				keys = { "n", "<leader>gd" },
				cmd = "<cmd>DiffviewOpen<cr>",
				desc = "Git: Diff view (all changes)",
			},
			{
				keys = { "n", "<leader>gh" },
				cmd = "<cmd>DiffviewFileHistory %<cr>",
				desc = "Git: File history (current file)",
			},
			{
				keys = { "n", "<leader>gH" },
				cmd = "<cmd>DiffviewFileHistory<cr>",
				desc = "Git: File history (repo)",
			},
			{
				keys = { "n", "<leader>gx" },
				cmd = "<cmd>DiffviewClose<cr>",
				desc = "Git: Close diff view",
			},
		},
		opts = {
			enhanced_diff_hl = true,
			view = {
				default = { layout = "diff2_horizontal" },
				merge_tool = { layout = "diff3_mixed" },
			},
			file_panel = {
				listing_style = "tree",
				win_config = { position = "left", width = 35 },
			},
		},
	},
	{
		"pwntester/octo.nvim",
		dependencies = {
			"nvim-lua/plenary.nvim",
			"nvim-telescope/telescope.nvim",
			"nvim-tree/nvim-web-devicons",
		},
		cmd = "Octo",
		commander = {
			{
				keys = { "n", "<leader>gpl" },
				cmd = "<cmd>Octo pr list<cr>",
				desc = "Git: List pull requests",
			},
			{
				keys = { "n", "<leader>gpc" },
				cmd = "<cmd>Octo pr create<cr>",
				desc = "Git: Create pull request",
			},
			{
				keys = { "n", "<leader>gil" },
				cmd = "<cmd>Octo issue list<cr>",
				desc = "Git: List issues",
			},
			{
				keys = { "n", "<leader>gic" },
				cmd = "<cmd>Octo issue create<cr>",
				desc = "Git: Create issue",
			},
			{
				keys = { "n", "<leader>grs" },
				cmd = "<cmd>Octo review start<cr>",
				desc = "Git: Start PR review",
			},
			{
				keys = { "n", "<leader>grS" },
				cmd = "<cmd>Octo review submit<cr>",
				desc = "Git: Submit PR review",
			},
		},
		opts = {},
	},
}
