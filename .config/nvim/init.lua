local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not (vim.uv or vim.loop).fs_stat(lazypath) then
	local lazyrepo = "https://github.com/folke/lazy.nvim.git"
	local out = vim.fn.system({ "git", "clone", "--filter=blob:none", "--branch=stable", lazyrepo, lazypath })
	if vim.v.shell_error ~= 0 then
		vim.api.nvim_echo({
			{ "Failed to clone lazy.nvim:\n", "ErrorMsg" },
			{ out, "WarningMsg" },
			{ "\nPress any key to exit..." },
		}, true, {})
		vim.fn.getchar()
		os.exit(1)
	end
end
vim.opt.rtp:prepend(lazypath)

local python_host = "/home/zakk/.pyenv/versions/neovim/bin/python"
if vim.fn.filereadable(python_host) == 1 then
	vim.g.python3_host_prog = python_host
end
vim.opt.termguicolors = true
vim.g.mapleader = " "
vim.g.have_nerd_font = true

require("assets")
require("lazy").setup({

	{ import = "plugins" },
}, {})

require("options")
require("config.autocmds")
require("keymaps")
require("filetypes")
require("colors")
vim.cmd.colorscheme("kanagawa")
