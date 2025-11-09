require("telescope").load_extension("fzf")
require("telescope").load_extension("live_grep_args")

local key = vim.keymap

-- Commander
local commander = require("commander")
commander.add({
	-- Commander
	{ desc = "Commander: Open", cmd = commander.show, keys = { "n", "<leader>k" } },

	-- Editing
	{ keys = { "n", "<leader>w" }, cmd = ":w<cr>", desc = "Write file" },
	{ keys = { "v", "<M-j>" }, cmd = ":m '>+1<cr>gv=gv", desc = "Move selection up" },
	{ keys = { "v", "<M-k>" }, cmd = ":m '<-2<cr>gv=gv", desc = "Move selection down" },
	{ keys = { "x", "<leader>p" }, cmd = '"_dP', desc = "Paste, but don't replace register" },
	{ keys = { "n", "<leader>y" }, cmd = '"+y', desc = "Yank into clipboard" },
	{ keys = { "v", "<leader>y" }, cmd = '"+y', desc = "Yank into clipboard" },
	{ keys = { "n", "<leader>Y" }, cmd = '"+Y', desc = "Yank lines into clipboard" },
	{ keys = { "n", "<leader>wr" }, cmd = vim.lsp.buf.remove_workspace_folder, desc = "Remove workspace folder" },
	{ keys = { "n", "<leader>wa" }, cmd = vim.lsp.buf.add_workspace_folder, desc = "Add workspace folder" },
	{ keys = { "n", "-" }, cmd = "<cmd>Oil<cr>", desc = "Oil: Open parent directory" },
	{ keys = { "n", "<leader>rn" }, cmd = vim.lsp.buf.rename, desc = "LSP: Rename" },
	{ keys = { "n", "<leader>ca" }, cmd = vim.lsp.buf.code_action, desc = "LSP: Code action" },
	{ keys = { "n", "K" }, cmd = vim.lsp.buf.hover, desc = "LSP: Hover" },
	{ keys = { "n", "<C-k>" }, cmd = vim.lsp.buf.signature_help, desc = "LSP: Signature help" },
	{ keys = { "n", "<leader>ge" }, cmd = "vim.lsp.buf.declaration", desc = "LSP: Go to declaration" },
	{ keys = { "n", "<leader>wa" }, cmd = vim.lsp.buf.add_workspace_folder, desc = "LSP: Add workspace folder" },
	{ keys = { "n", "<leader>u" }, cmd = "<cmd>UndotreeToggle<cr>", desc = "Undotree: Toggle" },

	-- Utilities
	{
		keys = { "n", "<leader>fj" },
		cmd = function()
			vim.cmd(":set filetype=json")
			vim.cmd(":%!jq '.'")
		end,
		desc = "JSON: Format",
	},
	{
		keys = { "n", "<leader>fF" },
		cmd = function()
			vim.lsp.buf.format()
		end,
	},
})
