-- [[ Basic Keymaps ]]
-- Keymaps for better default experience
-- See `:help vim.keymap.set()`
vim.keymap.set({ 'n', 'v' }, '<Space>', '<Nop>', { silent = true })

-- Remap for dealing with word wrap
vim.keymap.set('n', 'k', "v:count == 0 ? 'gk' : 'k'", { expr = true, silent = true })
vim.keymap.set('n', 'j', "v:count == 0 ? 'gj' : 'j'", { expr = true, silent = true })

-- Tab stuff
-- vim.keymap.set("n", "<S-Tab>", "<<")
-- vim.keymap.set("n", "<Tab>", ">>")
-- vim.keymap.set("v", "<Tab>", ">gv")
vim.keymap.set("v", "<S-Tab>", "<gv")
vim.keymap.set("n", "<A-t>", ":tabnew<CR>")

-- Salesforce remaps
vim.keymap.set("n", "<leader>cl", "<cmd>bel term sfdx force:apex:class:create -n")
vim.keymap.set("n", "<C-s>", ":w<CR> :AsyncRun -mode=term -pos=bottom -rows=10 sfdx force:source:deploy -p \"%\" -l NoTestRun -w 5<CR>", { desc = 'SFDC - Deploy Source (Normal Mode)' })
vim.keymap.set("i", "<C-s>", ":w<CR> :AsyncRun -mode=term -pos=bottom -rows=10 sfdx force:source:deploy -p \"%\" -l NoTestRun -w 5<CR>", { desc = 'SFDC - Deplay Source (Normal Mode)' })

vim.keymap.set("n", "<C-e>", ":w<CR> :AsyncRun -mode=term -pos=bottom -rows=10 -close=0 sfdx force:source:push<CR>", { desc = 'SFDC - Push Source (Normal Mode)' })
vim.keymap.set("i", "<C-e>", ":w<CR> :AsyncRun -mode=term -pos=bottom -rows=10 -close=0 sfdx force:source:push<CR>", { desc = 'SFDC - Push Source (Normal Mode)' })

vim.keymap.set("n", "<leader>cc", ":AsyncRun -mode=term -pos=bottom -rows=10 -close=0 sfdx force:apex:class:create -d force-app/main/default/classes -n ", { desc = 'SFDC - Create Class' })
vim.keymap.set("n", "<leader>ct", ":AsyncRun -mode=term -pos=bottom -rows=10 -close=0 sfdx force:apex:trigger:create -d force-app/main/default/triggers -n ", { desc = 'SFDC - Create Trigger' })

vim.keymap.set("n", "<leader>al", ":tabnew /tmp/apexlogs.log<CR><C-w>s<C-w>j:term sfdx force:apex:log:tail --color <bar> tee /tmp/apexlogs.log<CR>", { desc = 'SFDC - Long Tail Logs' })

-- Salesforce Testing
vim.keymap.set("n", "<leader>tt", "?@isTest<CR>j0f(hyiw<C-w>s<C-w>j12<C-w>-:term sfdx apex:run:test -y -r human -w 5 -t \"%:t:r\".<C-r>\"<CR>", { desc = 'SFDC - Run Test on Current Method (Human)' })
vim.keymap.set("n", "<leader>td", "?@isTest<CR>j0f(hyiw<C-w>s<C-w>j12<C-w>-:term sfdx apex:run:test -y -r human -w 5 -t \"%:t:r\".<C-r>\"<CR>", { desc = 'SFDC - Run Test on Current Method (Human)' })
vim.keymap.set("n", "<leader>tc", "<C-w>s<C-w>j12<C-w>-:term sfdx apex:run:test -c -r human -w 5 -n \"%:t:r\"<CR>", { desc = 'SFDC - Run Test on Current Class (Human)' })
vim.keymap.set("n", "<leader>tl", "<C-w>s<C-w>j12<C-w>-:term sfdx force:apex:test:run -r human --testlevel RunLocalTests -w 15<CR>", { desc = 'SFDC - Run All Local Tests (Human)' })

-- Salesforce Logs
vim.keymap.set("n", "<leader>l", ":tabnew /tmp/apexlogs.log<CR><C-w>s<C-w>j:term sfdx force:apex:log:tail --color -u <bar> tee /tmp/apexlogs.log<C-left><C-left><C-left>")
vim.keymap.set("n", "<leader>ll", ":tabnew /tmp/apexlogs.log<CR><C-w>s<C-w>j:term sfdx force:apex:log:tail --color <bar> tee /tmp/apexlogs.log<CR>")
vim.keymap.set("n", "<leader>li", "tabnew | read !sfdx force:apex:log:list")
