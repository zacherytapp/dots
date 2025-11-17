local icons = {
	hint = "󰌶",
	error = " ",
	warning = " ",
	info = " ",
}

return {
	{
		"b0o/schemastore.nvim",
	},
	{
		"L3MON4D3/LuaSnip",
		lazy = true,
		dependencies = {
			"rafamadriz/friendly-snippets",
		},
		config = function()
			require("luasnip.loaders.from_lua").lazy_load({ paths = { "./snippets" } })
			require("luasnip.loaders.from_vscode").lazy_load()
			require("luasnip").setup({ enable_autosnippets = true })
		end,
		commander = {
			{
				keys = { { "i", "s" }, "<C-f>", { silent = true } },
				cmd = [[<cmd>lua require'luasnip'.jump(1)<cr>]],
				desc = "LuaSnip: Jump forward",
				show = false,
			},
			{
				keys = { { "i", "s" }, "<C-b>", { silent = true } },
				cmd = [[<cmd>lua require'luasnip'.jump(-1)<cr>]],
				desc = "LuaSnip: Jump backwards",
				show = false,
			},
			{
				keys = { { "i", "s" }, "<C-E>", { silent = true } },
				cmd = function()
					if require("luasnip").choice_active() then
						require("luasnip").change_choice(1)
					end
				end,
				desc = "LuaSnip: Next Choice",
				show = false,
			},
		},
	},
	{
		"vuki656/package-info.nvim",
		config = true,
	},
	{
		"liuchengxu/vista.vim",
		lazy = true,
		cmd = "Vista",
		cond = not vim.g.vscode,
		config = function()
			vim.g.vista_default_executive = "nvim_lsp"
		end,
	},
	{
		"folke/lazydev.nvim",
		ft = "lua", -- only load on lua files
		opts = {
			library = {
				{ path = "${3rd}/luv/library", words = { "vim%.uv" } },
			},
		},
	},
	{
		"mason-org/mason.nvim",
		opts = {},
	},
	{
		"mfussenegger/nvim-lint",
	},
	{
		"vuki656/package-info.nvim",
		config = true,
	},
	{
		"folke/trouble.nvim",
		opts = {},
		cmd = "Trouble",
		commander = {
			{
				keys = { "n", "<leader>xx" },
				cmd = "<cmd>Trouble diagnostics toggle<cr>",
				desc = "Toggle Trouble",
			},
			{
				keys = { "n", "<leader>xX" },
				cmd = "<cmd>Trouble diagnostics toggle filter.buf=0<cr>",
				desc = "Trouble: Toggle errors",
			},
			{
				keys = { "n", "<leader>cs" },
				cmd = "<cmd>Trouble symbols toggle focus=false<cr>",
				desc = "Trouble: Toggle symbols",
			},
			{
				keys = { "n", "<leader>cl" },
				cmd = "<cmd>Trouble lsp toggle focus=false win.position=right<cr>",
				desc = "Trouble: Toggle LSP",
			},
			{
				keys = { "n", "<leader>xL" },
				cmd = "<cmd>Trouble loclist toggle<cr>",
				desc = "Trouble: Toggle location list",
			},
			{
				keys = { "n", "<leader>xQ" },
				cmd = "<cmd>Trouble qflist toggle<cr>",
				desc = "Trouble: Toggle quickfix list",
			},
		},
	},
}
