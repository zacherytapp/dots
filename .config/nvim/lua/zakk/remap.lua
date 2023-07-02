vim.g.mapleader = " "

vim.keymap.set("n", "<leader>pv", vim.cmd.Ex)
vim.keymap.set("n", "<leader>cl", "<cmd>bel term sfdx force:apex:class:create -n")

vim.keymap.set("n", "<S-Tab>", "<<")
vim.keymap.set("n", "<Tab>", ">>")
vim.keymap.set("v", "<S-Tab>", "<gv")
vim.keymap.set("v", "<Tab>", ">gv")

-- Saleforce remaps
vim.keymap.set("n", "<C-s>", ":w <cr> :AsyncRun -mode=term -pos=bottom -rows=10 sfdx force:source:deploy -p \"%\" -l NoTestRun -w 5<cr>")
vim.keymap.set("i", "<C-s>", ":w <cr> :AsyncRun -mode=term -pos=bottom -rows=10 sfdx force:source:deploy -p \"%\" -l NoTestRun -w 5<cr>")

vim.keymap.set("n", "<C-e>", ":AsyncRun -mode=term -pos=bottom -rows=10 -close=0 sfdx force:source:push<cr>")
vim.keymap.set("i", "<C-e>", ":AsyncRun -mode=term -pos=bottom -rows=10 -close=0 sfdx force:source:push<cr>")

vim.keymap.set("n", "<leader>cc", ":AsyncRun -mode=term -pos=bottom -rows=10 -close=0 force:apex:class:create -d force-app/main/default/classes -n ")
vim.keymap.set("n", "<leader>ct", ":AsyncRun -mode=term -pos=bottom -rows=10 -close=0 force:apex:trigger:create -d force-app/main/default/triggers -n ")

vim.keymap.set("n", "<leader>al", ":tabnew /tmp/apexlogs.log<CR><C-w>s<C-w>j:term sfdx force:apex:log:tail --color <bar> tee /tmp/apexlogs.log<CR>")

-- Test
vim.keymap.set("n", "<leader>tt", "?@IsTest<CR>j0f(hyiw<C-w>s<C-w>j12<C-w>-:term sfdx apex:run:test -y -r human -w 5 -t \"%:t:r\".<C-r>\"<CR>")
vim.keymap.set("n", "<leader>tc", "<C-w>s<C-w>j12<C-w>-:term sfdx apex:run:test -c -r human -w 5 -n \"%:t:r\"<CR>")
vim.keymap.set("n", "<leader>tl", "<C-w>s<C-w>j12<C-w>-:term sfdx force:apex:test:run -r human --testlevel RunLocalTests -w 15<CR>")

-- Logs
vim.keymap.set("n", "<leader>l", ":tabnew /tmp/apexlogs.log<CR><C-w>s<C-w>j:term sfdx force:apex:log:tail --color -u <bar> tee /tmp/apexlogs.log<C-left><C-left><C-left>")
vim.keymap.set("n", "<leader>ll", ":tabnew /tmp/apexlogs.log<CR><C-w>s<C-w>j:term sfdx force:apex:log:tail --color <bar> tee /tmp/apexlogs.log<CR>")
vim.keymap.set("n", "<leader>li", "tabnew | read !sfdx force:apex:log:list")

-- Basic autoclosing of stuff
local silentnoremap = { noremap = true, silent = true }

vim.keymap.set('i', '"', '""<left>', silentnoremap )
vim.keymap.set('i', '\'', '\'\'<left>', silentnoremap )
vim.keymap.set('i', '(', '()<left>', silentnoremap )
vim.api.nvim_set_keymap('i', '[', '[]<left>', silentnoremap )
vim.api.nvim_set_keymap('i', '{', '{}<left>', silentnoremap )
vim.api.nvim_set_keymap('i', '{<CR>', '{<CR>}<ESC>0', silentnoremap )
vim.api.nvim_set_keymap('i', '{;<CR>', '{<CR>};<ESC>0', silentnoremap )

