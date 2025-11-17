return {
	{
		"zbirenbaum/copilot.lua",
		requires = {
			"copilotlsp-nvim/copilot-lsp", -- (optional) for NES functionality
		},
		cmd = "Copilot",
		build = ":Copilot auth",
		event = { "BufReadPost" },
		opts = {},
		config = function()
			require("copilot").setup({
				panel = {
					enabled = true,
					auto_refresh = false,
					keymap = {
						jump_prev = "[[",
						jump_next = "]]",
						accept = "<CR>",
						refresh = "gr",
						open = "<C-p>",
					},
					layout = {
						position = "bottom",
						ratio = 0.4,
					},
				},
				suggestion = {
					enabled = true,
					auto_trigger = true,
					debounce = 20,
					keymap = {
						accept = "<C-l>",
						accept_word = false,
						accept_line = false,
						dismiss = "<C-u>",
					},
				},
				filetypes = {
					markdown = true,
					go = true,
					sh = true,
					["."] = true,
				},
				copilot_node_command = "node",
				server_opts_overrides = {},
			})
		end,
	},
	{
		"NickvanDyke/opencode.nvim",
		dependencies = {
			{
				"folke/snacks.nvim",
				opts = {
					input = {},
					picker = {},
				},
			},
		},
		config = function()
			vim.g.opencode_opts = {}

			vim.opt.autoread = true

			vim.keymap.set({ "n", "x" }, "<leader>oa", function()
				require("opencode").ask("@this: ", { submit = true })
			end, { desc = "Ask about this" })
			vim.keymap.set({ "n", "x" }, "<leader>o+", function()
				require("opencode").prompt("@this")
			end, { desc = "Add this" })
			vim.keymap.set({ "n", "x" }, "<leader>os", function()
				require("opencode").select()
			end, { desc = "Select prompt" })
			vim.keymap.set("n", "<leader>ot", function()
				require("opencode").toggle()
			end, { desc = "Toggle embedded" })
			vim.keymap.set("n", "<leader>oc", function()
				require("opencode").command()
			end, { desc = "Select command" })
			vim.keymap.set("n", "<leader>on", function()
				require("opencode").command("session_new")
			end, { desc = "New session" })
			vim.keymap.set("n", "<leader>oi", function()
				require("opencode").command("session_interrupt")
			end, { desc = "Interrupt session" })
			vim.keymap.set("n", "<leader>oA", function()
				require("opencode").command("agent_cycle")
			end, { desc = "Cycle selected agent" })
			vim.keymap.set("n", "<S-C-u>", function()
				require("opencode").command("messages_half_page_up")
			end, { desc = "Messages half page up" })
			vim.keymap.set("n", "<S-C-d>", function()
				require("opencode").command("messages_half_page_down")
			end, { desc = "Messages half page down" })
		end,
	},
}
