return {
	{
		"nvim-lualine/lualine.nvim",
		dependencies = { "nvim-tree/nvim-web-devicons" },
		config = function()
			require("lualine").setup({
				options = {
					theme = "gruvbox-flat",
					section_separators = { left = "", right = "" },
					component_separators = { left = "", right = "" },
					sections = {
						lualine_a = { "mode" },
						lualine_b = { "branch" },
						lualine_c = {
							"filename",
							{ "require'salesforce.org_manager':get_default_alias()", icon = "󰢎" },
						},
						lualine_x = { "encoding", "fileformat", "filetype" },
						lualine_y = { "progress" },
						lualine_z = { "location" },
					},
					tabline = {},
					extensions = { "neotree" },
				},
			})
		end,
	},
}
