return {
	{
		"ThePrimeagen/harpoon",
		branch = "harpoon2",
		dependencies = { "nvim-lua/plenary.nvim", "nvim-telescope/telescope.nvim" },
		lazy = true,
		opts = {
			settings = {
				save_on_toggle = true,
				sync_on_ui_close = true,
			},
		},
		commander = {
			{
				keys = { "n", "<leader>ho" },
				cmd = function()
					local harpoon = require("harpoon")
					harpoon.ui:toggle_quick_menu(harpoon:list())
				end,
				desc = "Harpoon: Open",
			},
			{
				keys = { "n", "<leader>ha" },
				cmd = function()
					local harpoon = require("harpoon")
					harpoon:list():add()
				end,
				desc = "Harpoon: Append",
			},
			{
				keys = { "n", "<leader>1" },
				cmd = function()
					local harpoon = require("harpoon")
					harpoon:list():select(1)
				end,
				desc = "Harpoon: Go to 1",
			},
			{
				keys = { "n", "<leader>2" },
				cmd = function()
					local harpoon = require("harpoon")
					harpoon:list():select(2)
				end,
				desc = "Harpoon: Go to 2",
			},
			{
				keys = { "n", "<leader>3" },
				cmd = function()
					local harpoon = require("harpoon")
					harpoon:list():select(3)
				end,
				desc = "Harpoon: Go to 3",
			},
			{
				keys = { "n", "<leader>4" },
				cmd = function()
					local harpoon = require("harpoon")
					harpoon:list():select(4)
				end,
				desc = "Harpoon: Go to 4",
			},
			{
				keys = { "n", "<leader>5" },
				cmd = function()
					local harpoon = require("harpoon")
					harpoon:list():select(5)
				end,
				desc = "Harpoon: Go to 5",
			},
		},
	},
}
