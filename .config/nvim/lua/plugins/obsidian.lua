return {
	"obsidian-nvim/obsidian.nvim",
	version = "*",
	lazy = true,
	event = {
		"BufReadPre " .. vim.fn.expand("~") .. "/notes/obsidian/**.md",
		"BufNewFile " .. vim.fn.expand("~") .. "/notes/obsidian/**.md",
	},
	dependencies = {
		"nvim-lua/plenary.nvim",
	},
	opts = {
		legacy_commands = false,
		workspaces = {
			{ name = "personal", path = "/home/zakk/notes/obsidian" },
		},
		daily_notes = {
			folder = "daily",
			date_format = "%Y-%m-%d",
			default_tags = { "daily" },
		},
		completion = {
			nvim_cmp = false,
			min_chars = 2,
		},
		picker = { name = "telescope.nvim" },
		ui = { enable = false }, -- Let render-markdown.nvim handle rendering
		attachments = {
			folder = "attachments",
		},
	},
	commander = {
		{ keys = { "n", "<leader>noo" }, cmd = "<cmd>Obsidian quick_switch<cr>", desc = "Notes: Open note" },
		{ keys = { "n", "<leader>non" }, cmd = "<cmd>Obsidian new<cr>", desc = "Notes: New note" },
		{ keys = { "n", "<leader>nod" }, cmd = "<cmd>Obsidian today<cr>", desc = "Notes: Daily note" },
		{ keys = { "n", "<leader>nos" }, cmd = "<cmd>Obsidian search<cr>", desc = "Notes: Search" },
		{ keys = { "n", "<leader>nob" }, cmd = "<cmd>Obsidian backlinks<cr>", desc = "Notes: Backlinks" },
		{ keys = { "n", "<leader>nol" }, cmd = "<cmd>Obsidian links<cr>", desc = "Notes: Links" },
		{ keys = { "n", "<leader>not" }, cmd = "<cmd>Obsidian tags<cr>", desc = "Notes: Tags" },
		{ keys = { "n", "<leader>nor" }, cmd = "<cmd>Obsidian rename<cr>", desc = "Notes: Rename" },
		{ keys = { "n", "<leader>nop" }, cmd = "<cmd>Obsidian pasteimg<cr>", desc = "Notes: Paste image" },
	},
}
