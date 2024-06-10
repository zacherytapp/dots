vim.g.mapleader = " "
vim.g.maplocalleader = " "

local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not (vim.uv or vim.loop).fs_stat(lazypath) then
	vim.fn.system({
		"git",
		"clone",
		"--filter=blob:none",
		"https://github.com/folke/lazy.nvim.git",
		"--branch=stable", -- latest stable release
		lazypath,
	})
end
vim.opt.rtp:prepend(lazypath)

require("lazy").setup({

	{ import = "plugins" },
}, {})

require("legendary").setup({
	extensions = {
		lazy_nvim = true,
		which_key = {
			auto_register = true,
			use_groups = false,
		},
	},
})

require("opts")
require("keymaps")
require("utils")
