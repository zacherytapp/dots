-- Bootstrap lazy.nvim
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

local python_host = vim.fn.expand("~/.pyenv/versions/neovim/bin/python")
if vim.fn.filereadable(python_host) == 1 then
  vim.g.python3_host_prog = python_host
end

vim.g.mapleader = " "
vim.g.maplocalleader = "\\"
vim.g.have_nerd_font = true
-- Format on save (toggle: <leader>uf buffer, <leader>uF global)
vim.g.autoformat = true

-- Options and filetypes load before plugins so plugin setup sees the final values
require("config.options")
require("config.filetypes")

require("lazy").setup({
  spec = {
    { import = "plugins" },
    -- One file per language: parsers, LSP servers, formatters, linters, DAP, tests
    { import = "plugins.lang" },
  },
  defaults = { version = false },
  install = { colorscheme = { "gruvbox-material", "habamax" } },
  checker = { enabled = true, notify = false },
  change_detection = { notify = false },
  rocks = { enabled = false }, -- no plugin here needs luarocks
  ui = { border = "rounded" },
  performance = {
    rtp = {
      disabled_plugins = { "gzip", "tarPlugin", "tohtml", "tutor", "zipPlugin" },
    },
  },
})

require("config.autocmds")
require("config.python_venv")
require("config.keymaps")
vim.cmd.colorscheme("gruvbox-material")
