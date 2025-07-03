return {
	{
		"sainnhe/gruvbox-material",
		lazy = false,
		priority = 1000,
		opts = {
			gruvbox_material_transparent_background = true,
		},
		name = "gruvbox-material",
		config = function()
			vim.cmd([[colorscheme gruvbox-material]])
		end,
	},
}
