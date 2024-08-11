return {
	"jonathanmorris180/salesforce.nvim",
	dependencies = {
		"nvim-lua/plenary.nvim",
		"nvim-treesitter/nvim-treesitter",
	},
	dev = false,
	config = function()
		require("salesforce").setup({
			file_manager = {
				ignore_conflicts = true,
			},
		})
		-- local keymap = vim.keymap
		-- keymap.set("n", "<leader>se", "<cmd>SalesforceExecuteFile<cr>")
		-- keymap.set("n", "<leader>sc", "<cmd>SalesforceClosePopup<cr>")
		-- keymap.set("n", "<leader>sS", "<cmd>SalesforceRefocusPopup<cr>")
		-- keymap.set("n", "<leader>stm", "<cmd>SalesforceExecuteCurrentMethod<cr>")
		-- keymap.set("n", "<leader>stc", "<cmd>SalesforceExecuteCurrentClass<cr>")
		-- keymap.set("n", "<leader>ss", "<cmd>SalesforcePushToOrg<cr>")
		-- keymap.set("n", "<leader>sr", "<cmd>SalesforceRetrieveFromOrg<cr>")
		-- keymap.set("n", "<leader>sd", "<cmd>SalesforceDiffFile<cr>")
		-- keymap.set("n", "<leader>so", "<cmd>SalesforceSetDefaultOrg<cr>")
		-- keymap.set("n", "<leader>sp", "<cmd>SalesforceRefreshOrgInfo<cr>")
	end,
}
