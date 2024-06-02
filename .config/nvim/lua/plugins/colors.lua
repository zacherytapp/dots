return {
	"ellisonleao/gruvbox.nvim",
	priority = 1000,
	config = function()
		local opts = {
			contrast = "soft",
			transparent_mode = true,
		}
		require("gruvbox").setup(opts)
		vim.cmd("colorscheme gruvbox")
	end,
}
