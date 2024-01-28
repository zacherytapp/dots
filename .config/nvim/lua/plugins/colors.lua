return {
	"luisiacc/gruvbox-baby",
	branch = "main",
	lazy = false,
	priority = 1000,
	opts = {},
	config = function()
		vim.g.gruvbox_baby_function_style = "NONE"
		vim.g.gruvbox_baby_keyword_style = "italic"
		vim.g.gruvbox_baby_telescope_theme = 1
		vim.g.gruvbox_baby_transparent_mode = 1
		vim.cmd("colorscheme gruvbox-baby")
	end,
}
