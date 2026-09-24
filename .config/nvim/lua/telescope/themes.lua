-- Shim: commander.nvim's model/Config.lua unconditionally requires
-- "telescope._extensions.commander.theme", which requires "telescope.themes",
-- even with the telescope integration disabled. fzf-lua is this config's only
-- picker (commander falls back to vim.ui.select -> fzf-lua), so this stub keeps
-- `require("commander")` working without telescope.nvim. The theme function it
-- gets assigned is never called. Delete this file if commander stops requiring it.
return {}
