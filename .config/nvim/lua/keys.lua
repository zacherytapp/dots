vim.keymap.set("n", "-", "<CMD>Oil<CR>", { desc = "Open parent directory" })
vim.keymap.set("n", "k", "v:count == 0 ? 'gk' : 'k'", { expr = true, silent = true })
vim.keymap.set("n", "j", "v:count == 0 ? 'gj' : 'j'", { expr = true, silent = true })

vim.keymap.set("v", "<S-Tab>", "<gv", { desc = "Select previous text object" })
vim.keymap.set("n", "<A-t>", ":tabnew<CR>", { desc = "New Tab" })

-- Primeagen
vim.keymap.set("x", "<leader>p", [["_dP]], { desc = "Paste over visual selection" })
vim.keymap.set({ "n", "v" }, "<leader>y", [["+y]], { desc = "Yank to clipboard" })
vim.keymap.set("n", "<leader>Y", [["+Y]], { desc = "Yank to clipboard" })
vim.keymap.set("n", "<leader><F5>", vim.cmd.UndotreeToggle, { desc = "Toggle Undotree" })

vim.keymap.set("n", "<C-b>", "<Cmd>Neotree toggle<CR>")
vim.keymap.set("n", "<C-p>", "<Cmd>TroubleToggle<CR>")

-- Exit Terminal Mode
vim.api.nvim_set_keymap("t", "<ESC>", [[<C-\><C-n>:q<CR>]], { noremap = true })
vim.api.nvim_set_keymap("t", "<C-d>", [[<C-\><C-d>]], { noremap = true })

vim.keymap.set(
	"n",
	"<leader>to",
	":ToggleTerm dir=git_dir direction=horizontal name=git size=10<CR>",
	{ desc = "Open Terminal in Git Directory" }
)

vim.keymap.set(
	"n",
	"<leader>tf",
	":ToggleTerm dir=git_dir direction=float name=git size=20<CR>",
	{ desc = "Open Terminal in Git Directory" }
)

-- Salesforce Stuff
vim.keymap.set(
	"n",
	"<C-s>",
	':w | :TermExec cmd="sf project deploy start --source-dir % -l NoTestRun -w 5"<CR>',
	{ desc = "SFDC - Deplay Source (Insert Mode)" }
)

vim.keymap.set(
	"i",
	"<C-s>",
	':w | :TermExec cmd="sf project deploy start --source-dir % -l NoTestRun -w 5"<CR>',
	{ desc = "SFDC - Deplay Source (Insert Mode)" }
)

vim.keymap.set(
	"n",
	"<leader>cc",
	":TermExec open=0 cmd='sf apex generate class --output-dir force-app/main/default/classes --name '<left>",
	{ desc = "SFDC - Create Page" }
)

vim.keymap.set(
	"n",
	"<leader>ct",
	":TermExec open=0 cmd='sf apex generate trigger --output-dir force-app/main/default/triggers --name '<left>",
	{ desc = "SFDC - Create Trigger" }
)

vim.keymap.set(
	"n",
	"<leader>al",
	":tabnew /tmp/apexlogs.log<CR><C-w>s<C-w>j:term sfdx force:apex:log:tail --color <bar> tee /tmp/apexlogs.log<CR>",
	{ desc = "SFDC - Long Tail Logs" }
)

-- Salesforce Testing
vim.keymap.set(
	"n",
	"<leader>tt",
	'?@isTest<CR>j0f(hyiw<C-w>s<C-w>j12<C-w>-:term sf apex run test --synchronous --detailed-coverage --code-coverage --result-format human --wait 5 --tests "%:t:r".<C-r>"<CR>',
	{ desc = "SFDC - Run Test on Current Method (Human)" }
)

vim.keymap.set(
	"n",
	"<leader>td",
	'?@isTest<CR>j0f(hyiw<C-w>s<C-w>j12<C-w>-:term sf apex run test --synchronous --detailed-coverage --code-coverage --result-format human --wait 5 --tests  "%:t:r".<C-r>"<CR>',
	{ desc = "SFDC - Run Test on Current Method (Human)" }
)

vim.keymap.set(
	"n",
	"<leader>tc",
	'<C-w>s<C-w>j12<C-w>-:term sf apex run test --code-coverage --detailed-coverage --result-format human --wait 5 --class-names "%:t:r"<CR>',
	{ desc = "SFDC - Run Test on Current Class (Human)" }
)

vim.keymap.set(
	"n",
	"<leader>tl",
	"<C-w>s<C-w>j12<C-w>-:term sf apex run test --code-coverage --detailed-coverage --result-format human --testlevel RunLocalTests -w 15<CR>",
	{ desc = "SFDC - Run All Local Tests (Human)" }
)

-- Salesforce Logs
vim.keymap.set(
	"n",
	"<leader>l",
	":tabnew /tmp/apexlogs.log<CR><C-w>s<C-w>j:term sfdx force:apex:log:tail --color -u <bar> tee /tmp/apexlogs.log<C-left><C-left><C-left>",
	{ desc = "SFDC - Long Tail Logs" }
)

vim.keymap.set(
	"n",
	"<leader>ll",
	":tabnew /tmp/apexlogs.log<CR><C-w>s<C-w>j:term sfdx force:apex:log:tail --color <bar> tee /tmp/apexlogs.log<CR>",
	{ desc = "SFDC - Long Tail Logs" }
)

vim.keymap.set("n", "<leader>li", "tabnew | read !sfdx force:apex:log:list", { desc = "SFDC - List Logs" })

vim.keymap.set("i", "<M-l>", 'copilot#Accept("\\<CR>")', {
	expr = true,
	replace_keycodes = false,
	desc = "Accept Copilot Suggestion",
})
vim.g.copilot_no_tab_map = true

-- Harpoon
local mark = require("harpoon.mark")
local ui = require("harpoon.ui")
vim.keymap.set("n", "<leader>a", mark.add_file, { desc = "Add file to Harpoon" })
vim.keymap.set("n", "<C-e>", ui.toggle_quick_menu, { desc = "Toggle Harpoon Menu" })
vim.keymap.set("n", "<C-y>", function()
	ui.nav_file(1)
end)
vim.keymap.set("n", "<C-u>", function()
	ui.nav_file(2)
end)
vim.keymap.set("n", "<C-i>", function()
	ui.nav_file(3)
end)
vim.keymap.set("n", "<C-o>", function()
	ui.nav_file(4)
end)
