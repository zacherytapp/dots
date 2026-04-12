local ts_filetypes = { "javascript", "javascriptreact", "typescript", "typescriptreact" }

return {
	-- TypeScript-specific LSP commands via nvim-vtsls
	{
		"yioneko/nvim-vtsls",
		ft = ts_filetypes,
		dependencies = { "neovim/nvim-lspconfig" },
		config = function()
			require("vtsls").config({})
		end,
		keys = {
			{
				"gs",
				function()
					require("vtsls").commands.goto_source_definition(0)
				end,
				desc = "TS: Goto source definition",
				ft = ts_filetypes,
			},
			{
				"gR",
				function()
					require("vtsls").commands.file_references(0)
				end,
				desc = "TS: File references",
				ft = ts_filetypes,
			},
			{
				"<leader>co",
				function()
					require("vtsls").commands.organize_imports(0)
				end,
				desc = "TS: Organize imports",
				ft = ts_filetypes,
			},
			{
				"<leader>cM",
				function()
					require("vtsls").commands.rename_file(0)
				end,
				desc = "TS: Rename file (update imports)",
				ft = ts_filetypes,
			},
			{
				"<leader>cp",
				function()
					require("vtsls").commands.goto_project_config(0)
				end,
				desc = "TS: Goto tsconfig.json",
				ft = ts_filetypes,
			},
			{
				"<leader>ci",
				function()
					require("vtsls").commands.add_missing_imports(0)
				end,
				desc = "TS: Add missing imports",
				ft = ts_filetypes,
			},
			{
				"<leader>cu",
				function()
					require("vtsls").commands.remove_unused_imports(0)
				end,
				desc = "TS: Remove unused imports",
				ft = ts_filetypes,
			},
		},
	},

	-- Project-wide type checking
	{
		"dmmulroy/tsc.nvim",
		cmd = "TSC",
		ft = ts_filetypes,
		opts = {},
		keys = {
			{ "<leader>ck", "<cmd>TSC<cr>", desc = "TS: Type-check project", ft = ts_filetypes },
		},
	},

}
