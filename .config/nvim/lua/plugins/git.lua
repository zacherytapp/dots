return {
	{
		"sindrets/diffview.nvim",
		config = function()
			vim.keymap.set("n", "<leader>hv", vim.cmd.DiffviewOpen, { desc = "Diffview Open" })
			vim.keymap.set("n", "<leader>hc", vim.cmd.DiffviewClose, { desc = "Diffview Close" })
		end,
	},

	{
		"tpope/vim-fugitive",
		config = function()
			vim.keymap.set("n", "<leader>gs", vim.cmd.Git)
		end,
	},

	"tpope/vim-rhubarb",
}
