return {
	{
		"skywind3000/asyncrun.vim",
	},
	{
		"akinsho/toggleterm.nvim",
		cmd = { "TermExec", "ToggleTerm" },
		config = function()
			require("toggleterm").setup({
				function(term)
					if term.direction == "horizontal" then
						return 20
					elseif term.direction == "vertical" then
						return vim.o.columns * 0.4
					end
				end,
				hide_numbers = false,
				shade_filetypes = {},
				shade_terminals = true,
				start_in_insert = true,
				insert_mappings = false,
				persist_size = true,
				direction = "horizontal",
				close_on_exit = true,
				shell = zsh,
				float_opts = {
					border = "curved",
					winblend = 3,
					highlights = {
						border = "Normal",
						background = "Normal",
					},
				},
			})
		end,
	},
}
