vim.g.mapleader = " "

vim.keymap.set("n", "<leader>pv", vim.cmd.Ex)
vim.keymap.set("n", "<leader>cl", "<cmd>bel term sfdx force:apex:class:create -n")

vim.keymap.set("n", "<S-Tab>", "<<")
vim.keymap.set("n", "<Tab>", ">>")
vim.keymap.set("v", "<S-Tab>", "<gv")
vim.keymap.set("v", "<Tab>", ">gv")
vim.keymap.set("n", "<A-t>", ":tabnew<CR>")

-- Saleforce remaps
vim.keymap.set("n", "<C-s>", ":w<CR> :AsyncRun -mode=term -pos=bottom -rows=10 sfdx force:source:deploy -p \"%\" -l NoTestRun -w 5<CR>")
vim.keymap.set("i", "<C-s>", ":w<CR> :AsyncRun -mode=term -pos=bottom -rows=10 sfdx force:source:deploy -p \"%\" -l NoTestRun -w 5<CR>")

vim.keymap.set("n", "<C-e>", ":w<CR> :AsyncRun -mode=term -pos=bottom -rows=10 -close=0 sfdx force:source:push<CR>")
vim.keymap.set("i", "<C-e>", ":w<CR> :AsyncRun -mode=term -pos=bottom -rows=10 -close=0 sfdx force:source:push<CR>")

vim.keymap.set("n", "<leader>cc", ":AsyncRun -mode=term -pos=bottom -rows=10 -close=0 sfdx force:apex:class:create -d force-app/main/default/classes -n ")
vim.keymap.set("n", "<leader>ct", ":AsyncRun -mode=term -pos=bottom -rows=10 -close=0 sfdx force:apex:trigger:create -d force-app/main/default/triggers -n ")

vim.keymap.set("n", "<leader>al", ":tabnew /tmp/apexlogs.log<CR><C-w>s<C-w>j:term sfdx force:apex:log:tail --color <bar> tee /tmp/apexlogs.log<CR>")

-- Salesforce Testing
vim.keymap.set("n", "<leader>tt", "?@IsTest<CR>j0f(hyiw<C-w>s<C-w>j12<C-w>-:term sfdx apex:run:test -y -r human -w 5 -t \"%:t:r\".<C-r>\"<CR>")
vim.keymap.set("n", "<leader>tc", "<C-w>s<C-w>j12<C-w>-:term sfdx apex:run:test -c -r human -w 5 -n \"%:t:r\"<CR>")
vim.keymap.set("n", "<leader>tl", "<C-w>s<C-w>j12<C-w>-:term sfdx force:apex:test:run -r human --testlevel RunLocalTests -w 15<CR>")

-- Salesforce Logs
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

-- Barbar Config (Mostly Default)
local map = vim.api.nvim_set_keymap
local opts = { noremap = true, silent = true }

-- Move to previous/next
map('n', '<A-,>', '<Cmd>BufferPrevious<CR>', opts)
map('n', '<A-.>', '<Cmd>BufferNext<CR>', opts)
-- Re-order to previous/next
map('n', '<A-<>', '<Cmd>BufferMovePrevious<CR>', opts)
map('n', '<A->>', '<Cmd>BufferMoveNext<CR>', opts)
-- Goto buffer in position...
map('n', '<A-1>', '<Cmd>BufferGoto 1<CR>', opts)
map('n', '<A-2>', '<Cmd>BufferGoto 2<CR>', opts)
map('n', '<A-3>', '<Cmd>BufferGoto 3<CR>', opts)
map('n', '<A-4>', '<Cmd>BufferGoto 4<CR>', opts)
map('n', '<A-5>', '<Cmd>BufferGoto 5<CR>', opts)
map('n', '<A-6>', '<Cmd>BufferGoto 6<CR>', opts)
map('n', '<A-7>', '<Cmd>BufferGoto 7<CR>', opts)
map('n', '<A-8>', '<Cmd>BufferGoto 8<CR>', opts)
map('n', '<A-9>', '<Cmd>BufferGoto 9<CR>', opts)
map('n', '<A-0>', '<Cmd>BufferLast<CR>', opts)
-- Pin/unpin buffer
map('n', '<A-p>', '<Cmd>BufferPin<CR>', opts)
-- Close buffer
map('n', '<A-c>', '<Cmd>BufferClose<CR>', opts)
-- Wipeout buffer
--                 :BufferWipeout
-- Close commands
--                 :BufferCloseAllButCurrent
--                 :BufferCloseAllButPinned
--                 :BufferCloseAllButCurrentOrPinned
--                 :BufferCloseBuffersLeft
--                 :BufferCloseBuffersRight
-- Magic buffer-picking mode
map('n', '<C-p>', '<Cmd>BufferPick<CR>', opts)
-- Sort automatically by...
map('n', '<leader>bb', '<Cmd>BufferOrderByBufferNumber<CR>', opts)
map('n', '<leader>bd', '<Cmd>BufferOrderByDirectory<CR>', opts)
map('n', '<leader>bl', '<Cmd>BufferOrderByLanguage<CR>', opts)
map('n', '<leader>bw', '<Cmd>BufferOrderByWindowNumber<CR>', opts)

-- Other:
-- :BarbarEnable - enables barbar (enabled by default)
-- :BarbarDisable - very bad command, should never be used

