-- Go: tabs with visual width 4 (Go convention)
-- Indentation uses Vim's built-in GoIndent (lang/go.lua sets treesitter
-- runtime_indent for go, so treesitter leaves indentexpr alone).
vim.bo.expandtab = false
vim.bo.tabstop = 4
vim.bo.shiftwidth = 4
vim.bo.softtabstop = 0

-- Visual tab markers
vim.opt_local.listchars:append({ tab = "| " })
