return {
	{
		"tpope/vim-fugitive",
		config = function()
			vim.keymap.set("n", "<leader>gs", vim.cmd.Git)
		end,
	},
	{
		"lewis6991/gitsigns.nvim",
		lazy = true,
		event = { "BufNewFile", "BufReadPre" },
		opts = {
			numhl = true,
			current_line_blame_opts = {
				delay = 0,
			},
		},
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
				keys = { "n", "<leader>ghs" },
				cmd = [[<cmd>lua require'gitsigns'.stage_hunk()<cr>]],
				desc = "Git: Stage hunk",
			},
			{
				keys = { "n", "<leader>ghr" },
				cmd = [[<cmd>lua require'gitsigns'.reset_hunk()<cr>]],
				desc = "Git: Reset hunk",
			},
			{
				keys = { "v", "<leader>ghs" },
				cmd = function()
					require("gitsigns").stage_hunk({ vim.fn.line("."), vim.fn.line("v") })
				end,
				desc = "Git: Stage selection",
			},
			{
				keys = { "v", "<leader>ghr" },
				cmd = function()
					require("gitsigns").reset_hunk({ vim.fn.line("."), vim.fn.line("v") })
				end,
				desc = "Git: Reset selection",
			},
			{
				keys = { "n", "<leader>ghu" },
				cmd = [[<cmd>lua require'gitsigns'.undo_stage_hunk()<cr>]],
				desc = "Git: Undo stage hunk",
			},
			{
				keys = { "n", "<leader>ghp" },
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
}
