return {
	{
		"folke/noice.nvim",
		lazy = true,
		event = "VeryLazy",
		dependencies = {
			"MunifTanjim/nui.nvim",
			"rcarriga/nvim-notify",
		},
		opts = {
			lsp = {
				progress = {
					enabled = false,
					override = {
						["vim.lsp.util.convert_input_to_markdown_lines"] = true,
						["vim.lsp.util.stylize_markdown"] = true,
						["cmp.entry.get_documentation"] = true,
					},
				},
				hover = {
					enabled = true,
					opts = {
						size = {
							width = 70,
						},
						border = {
							style = "rounded",
						},
					},
				},
				signature = {
					enabled = true,
					opts = {
						size = {
							width = 70,
						},
						border = {
							style = "rounded",
						},
						position = {
							row = 3,
						},
					},
				},
			},
			presets = {
				bottom_search = true,
				command_palette = true,
				long_message_to_split = true,
				inc_rename = false,
				lsp_doc_border = false,
			},
			routes = {},
		},
	},
	{ "rcarriga/nvim-notify", enabled = false },
}
