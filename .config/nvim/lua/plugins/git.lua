return {
	{
		"tpope/vim-fugitive",
		lazy = false,
		keys = {
			{ "<leader>gr", "<cmd>Gread<cr>", desc = "Read file from git" },
			{ "<leader>gb", "<cmd>G blame<cr>", desc = "Read file from git" },
		},
		dependencies = { "tpope/vim-rhubarb" },
	},
	{ "akinsho/git-conflict.nvim", version = "*", config = true },
	{
		"lewis6991/gitsigns.nvim",
		opts = {
			on_attach = function(bufnr)
				local gitsigns = require("gitsigns")

				-- Helper function to set buffer-local keymaps
				local function map(mode, lhs, rhs, opts)
					opts = opts or {}
					opts.buffer = bufnr
					vim.keymap.set(mode, lhs, rhs, opts)
				end

				-- Navigation
				map("n", "]c", function()
					if vim.wo.diff then
						vim.cmd.normal({ "]c", bang = true })
					else
						gitsigns.nav_hunk("next")
					end
				end, { desc = "Next hunk" })

				map("n", "[c", function()
					if vim.wo.diff then
						vim.cmd.normal({ "[c", bang = true })
					else
						gitsigns.nav_hunk("prev")
					end
				end, { desc = "Previous hunk" })

				-- Actions
				map("n", "<leader>hs", gitsigns.stage_hunk, { desc = "Stage hunk" })
				map("n", "<leader>hr", gitsigns.reset_hunk, { desc = "Reset hunk" })
				map("v", "<leader>hs", function()
					gitsigns.stage_hunk({ vim.fn.line("."), vim.fn.line("v") })
				end, { desc = "Stage hunk" })
				map("v", "<leader>hr", function()
					gitsigns.reset_hunk({ vim.fn.line("."), vim.fn.line("v") })
				end, { desc = "Reset hunk" })
				map("n", "<leader>hS", gitsigns.stage_buffer, { desc = "Stage buffer" })
				map("n", "<leader>hu", gitsigns.undo_stage_hunk, { desc = "Undo stage hunk" })
				map("n", "<leader>hR", gitsigns.reset_buffer, { desc = "Reset buffer" })
				map("n", "<leader>hp", gitsigns.preview_hunk, { desc = "Preview hunk" })
				map("n", "<leader>hb", function()
					gitsigns.blame_line({ full = true })
				end, { desc = "Blame line" })
				map("n", "<leader>tb", gitsigns.toggle_current_line_blame, { desc = "Toggle current line blame" })
				map("n", "<leader>hd", gitsigns.diffthis, { desc = "Diff this" })
				map("n", "<leader>hD", function()
					gitsigns.diffthis("~")
				end, { desc = "Diff this file" })
				map("n", "<leader>td", gitsigns.toggle_deleted, { desc = "Toggle deleted" })

				-- Text object
				map({ "o", "x" }, "ih", ":<C-U>Gitsigns select_hunk<CR>", { desc = "Select hunk" })
			end,
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
	-- {
	-- 	"tpope/vim-fugitive",
	-- 	config = function()
	-- 		vim.keymap.set("n", "<leader>gs", vim.cmd.Git)
	-- 	end,
	-- },
	-- {
	-- 	"lewis6991/gitsigns.nvim",
	-- 	lazy = true,
	-- 	event = { "BufNewFile", "BufReadPre" },
	-- 	opts = {
	-- 		numhl = true,
	-- 		current_line_blame_opts = {
	-- 			delay = 0,
	-- 		},
	-- 	},
	-- 	commander = {
	-- 		{
	-- 			keys = { "n", "[c" },
	-- 			cmd = function()
	-- 				if vim.wo.diff then
	-- 					return "[c"
	-- 				end
	-- 				vim.schedule(function()
	-- 					require("gitsigns").nav_hunk("prev")
	-- 				end)
	-- 				return "<Ignore>"
	-- 			end,
	-- 			desc = "Git: Previous hunk",
	-- 		},
	-- 		{
	-- 			keys = { "n", "]c" },
	-- 			cmd = function()
	-- 				if vim.wo.diff then
	-- 					return "]c"
	-- 				end
	-- 				vim.schedule(function()
	-- 					require("gitsigns").nav_hunk("next")
	-- 				end)
	-- 				return "<Ignore>"
	-- 			end,
	-- 			desc = "Git: Next hunk",
	-- 		},
	-- 		{
	-- 			keys = { "n", "<leader>ghs" },
	-- 			cmd = [[<cmd>lua require'gitsigns'.stage_hunk()<cr>]],
	-- 			desc = "Git: Stage hunk",
	-- 		},
	-- 		{
	-- 			keys = { "n", "<leader>ghr" },
	-- 			cmd = [[<cmd>lua require'gitsigns'.reset_hunk()<cr>]],
	-- 			desc = "Git: Reset hunk",
	-- 		},
	-- 		{
	-- 			keys = { "v", "<leader>ghs" },
	-- 			cmd = function()
	-- 				require("gitsigns").stage_hunk({ vim.fn.line("."), vim.fn.line("v") })
	-- 			end,
	-- 			desc = "Git: Stage selection",
	-- 		},
	-- 		{
	-- 			keys = { "v", "<leader>ghr" },
	-- 			cmd = function()
	-- 				require("gitsigns").reset_hunk({ vim.fn.line("."), vim.fn.line("v") })
	-- 			end,
	-- 			desc = "Git: Reset selection",
	-- 		},
	-- 		{
	-- 			keys = { "n", "<leader>ghu" },
	-- 			cmd = [[<cmd>lua require'gitsigns'.undo_stage_hunk()<cr>]],
	-- 			desc = "Git: Undo stage hunk",
	-- 		},
	-- 		{
	-- 			keys = { "n", "<leader>ghp" },
	-- 			cmd = [[<cmd>lua require'gitsigns'.preview_hunk()<cr>]],
	-- 			desc = "Git: Preview hunk",
	-- 		},
	-- 		{
	-- 			keys = { "n", "<leader>gfd" },
	-- 			cmd = [[<cmd>lua require'gitsigns'.diffthis()<cr>]],
	-- 			desc = "Git: Diff buffer",
	-- 		},
	-- 		{
	-- 			keys = { "n", "<leader>gb" },
	-- 			cmd = [[<cmd>lua require'gitsigns'.toggle_current_line_blame()<cr>]],
	-- 			desc = "Git: Toggle Line Blame",
	-- 		},
	-- 	},
	-- },
}
