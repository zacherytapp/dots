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

vim.g.python3_host_prog = "/home/zakk/.pyenv/versions/neovim/bin/python"
vim.opt.termguicolors = true
vim.g.mapleader = " "

require("assets")
require("lazy").setup({

	{ import = "plugins" },
}, {})

require("keymaps")
require("options")
require("filetypes")
require("colors")
vim.cmd.colorscheme("gruvbox")

vim.lsp.enable({ "lua_ls", "apex_ls", "ctags_lsp", "gopls", "jsonls", "yamlls", "html" })
