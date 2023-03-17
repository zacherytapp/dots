vim.g.mapleader = " "

vim.keymap.set("n", "<leader>pv", vim.cmd.Ex)
vim.keymap.set("n", "<leader>cl", "<cmd>bel term sfdx force:apex:class:create -n")

vim.keymap.set("n", "<S-Tab>", "<<")
vim.keymap.set("n", "<Tab>", ">>")
vim.keymap.set("v", "<S-Tab>", "<gv")
vim.keymap.set("v", "<Tab>", ">gv")

-- Saleforce remaps
vim.keymap.set("n", "<C-s>", ":w <cr> | :AsyncRun -mode=term -pos=bottom -rows=10 sfdx force:source:deploy -p \"%\" -l NoTestRun -w 5<cr>")
vim.keymap.set("i", "<C-s>", ":w <cr> | :AsyncRun -mode=term -pos=bottom -rows=10 sfdx force:source:deploy -p \"%\" -l NoTestRun -w 5<cr>")

vim.keymap.set("n", "<C-e>", ":AsyncRun -mode=term -pos=bottom -rows=10 -close=0 sfdx force:source:push<cr>")
vim.keymap.set("i", "<C-e>", ":AsyncRun -mode=term -pos=bottom -rows=10 -close=0 sfdx force:source:push<cr>")

vim.keymap.set("n", "<leader>cl", ":AsyncRun -mode=term -pos=bottom -rows=10 -close=0 force:apex:class:create -d ../force-app/main/default/classes -n ")

vim.keymap.set("n", "<leader>al", ":tabnew /tmp/apexlogs.log<CR><C-w>s<C-w>j:term sfdx force:apex:log:tail --color <bar> tee /tmp/apexlogs.log<CR>")

-- Basic autoclosing of stuff
local silentnoremap = { noremap = true, silent = true }

vim.keymap.set('i', '"', '""<left>', silentnoremap )
vim.keymap.set('i', '\'', '\'\'<left>', silentnoremap )
vim.keymap.set('i', '(', '()<left>', silentnoremap )
vim.api.nvim_set_keymap('i', '[', '[]<left>', silentnoremap )
vim.api.nvim_set_keymap('i', '{', '{}<left>', silentnoremap )
vim.api.nvim_set_keymap('i', '{<CR>', '{<CR>}<ESC>0', silentnoremap )
vim.api.nvim_set_keymap('i', '{;<CR>', '{<CR>};<ESC>0', silentnoremap )

