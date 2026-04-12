-- Go: tabs with visual width 4 (Go convention)
-- Runs after all plugins (vim-sleuth, treesitter) to guarantee settings.
vim.bo.expandtab = false
vim.bo.tabstop = 4
vim.bo.shiftwidth = 4
vim.bo.softtabstop = 0

-- Use Vim's built-in GoIndent instead of treesitter indentexpr.
-- GoIndent handles Go's := operator, struct literals, and case/default
-- blocks correctly. Treesitter Go indent has known edge cases.
vim.bo.indentexpr = "GoIndent(v:lnum)"

-- Visual tab markers
vim.opt_local.listchars:append({ tab = "| " })
