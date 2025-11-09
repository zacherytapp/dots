return {
	{
		"echasnovski/mini.nvim",
		version = "*",
		config = function()
			-- misc useful functions
			require("mini.misc").setup({})

			-- Better a/i text objects
			require("mini.ai").setup({})

			-- Better surround
			-- - saiw) - [S]urround [A]dd [I]n [W]ord with )
			-- - sd' - [S]urround [D]elete '
			-- - sr)'' - [S]urround [R]eplace ) with (
			require("mini.surround").setup({})

			-- Splitjoin
			-- - gS - Split
			-- - gJ - Join
			require("mini.splitjoin").setup({
				mappings = {
					toggle = "",
					split = "gS",
					join = "gJ",
				},
			})

			-- Highlight word under cursor
			require("mini.cursorword").setup({})

			-- Move text in any direction
			require("mini.move").setup({
				mappings = {
					left = "<M-S-h>",
					right = "<M-S-l>",
					down = "<M-S-j>",

					up = "<M-S-k>",
					-- Move current line in Normal mode
					line_left = "<M-S-h>",
					line_right = "<M-S-l>",
					line_down = "<M-S-j>",
					line_up = "<M-S-k>",
				},
			})

			-- only load tjese plugins if not in vscode
			if not vim.g.vscode then
				-- Better pairs
				require("mini.pairs").setup()
			end
		end,
		commander = {
			{
				keys = { "n", "<leader>us" },
				cmd = "<cmd>MiniSurround<cr>",
				desc = "Mini: Surround",
			},
			{
				keys = { "n", "<leader>um" },
				cmd = "<cmd>MiniMove<cr>",
				desc = "Mini: Move",
			},
			{
				keys = { "n", "saiw)" },
				cmd = "<cmd>MiniSurroundAdd aiw )<cr>",
				desc = "Mini: Surround Add aiw with )",
			},
			{
				keys = { "n", "sd'" },
				cmd = "<cmd>MiniSurroundDelete '<cr>",
				desc = "Mini: Surround Delete '",
			},
			{
				keys = { "n", "sr)''" },
				cmd = "<cmd>MiniSurroundReplace ) ''<cr>",
				desc = "Mini: Surround Replace ) with (",
			},
			{
				keys = { "n", "gS" },
				cmd = "<cmd>MiniSplitjoinSplit<cr>",
				desc = "Mini: Splitjoin Split",
			},
			{
				keys = { "n", "gJ" },
				cmd = "<cmd>MiniSplitjoinJoin<cr>",
				desc = "Mini: Splitjoin Join",
			},
			{
				keys = { "n", "<M-S-h>" },
				cmd = "<cmd>MiniMoveLeft<cr>",
				desc = "Mini: Move Left",
			},
			{
				keys = { "n", "<M-S-l>" },
				cmd = "<cmd>MiniMoveRight<cr>",
				desc = "Mini: Move Right",
			},
			{
				keys = { "n", "<M-S-j>" },
				cmd = "<cmd>MiniMoveDown<cr>",
				desc = "Mini: Move Down",
			},
			{
				keys = { "n", "<M-S-k>" },
				cmd = "<cmd>MiniMoveUp<cr>",
				desc = "Mini: Move Up",
			},
			{
				keys = { "v", "<M-S-h>" },
				cmd = "<cmd>MiniMoveLeft<cr>",
				desc = "Mini: Move Line Left",
			},
			{
				keys = { "v", "<M-S-l>" },
				cmd = "<cmd>MiniMoveRight<cr>",
				desc = "Mini: Move Line Right",
			},
			{
				keys = { "v", "<M-S-j>" },
				cmd = "<cmd>MiniMoveDown<cr>",
				desc = "Mini: Move Line Down",
			},
			{
				keys = { "v", "<M-S-k>" },
				cmd = "<cmd>MiniMoveUp<cr>",
				desc = "Mini: Move Line Up",
			},
		},
	},
}
