vim.bo.expandtab = false
vim.bo.tabstop = 4
vim.bo.shiftwidth = 4
vim.bo.softtabstop = 0

-- Vim's GoIndent handles :=, struct literals and case/default blocks better than treesitter
vim.bo.indentexpr = "GoIndent(v:lnum)"

vim.opt_local.listchars:append({ tab = "| " })
