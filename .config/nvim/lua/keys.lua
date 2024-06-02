local utils = require("utils")

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

-- Neovim Terminal - Togglterm
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

-- Formatting
local function format_json()
	vim.cmd(":set filetype=json")
	vim.cmd(":%!jq '.'")
end

local function format_file()
	vim.lsp.buf.format()
end

-- format json
vim.keymap.set("n", "<leader>fj", format_json, { desc = "Format JSON" })

-- format current file
vim.keymap.set("n", "<leader>F", format_file, { desc = "Format File" })

-- Salesforce Stuff
local function tmux_execute_in_next_window(command)
	os.execute(string.format('tmux next-window && tmux send-keys "%s" C-m', command))
end

local function tmux_execute_in_split_pane(command)
	os.execute(string.format('tmux split-window -hf && tmux send-keys "%s" C-m', command))
end

-- Salesforce Testing
vim.keymap.set("n", "<leader>tm", function()
	local method_name = utils.get_current_full_method_name(".")
	local test_method_command = string.format(
		"sf apex run test --synchronous --detailed-coverage --code-coverage --result-format human --wait 5 --tests %s",
		method_name
	)
	utils.run_command_in_pane("test", test_method_command)
end, { desc = "Run Test on Current Method" })

vim.keymap.set("n", "<leader>tt", function()
	local class_name = utils.get_current_class_name()
	local test_class_command = string.format(
		"sf apex run test --code-coverage --detailed-coverage --result-format human --wait 5 --class-names %s",
		class_name
	)
	utils.run_command_in_pane("test", test_class_command)
end, { desc = "Run Test on Current Class" })

vim.keymap.set("n", "<leader>tl", function()
	local command =
		"sf apex run test --code-coverage --detailed-coverage --result-format human --testlevel RunLocalTests -w 15"
	utils.run_command_in_pane("test", command)
end, { desc = "Run All Local Tests" })

-- Salesforce Saving/Deployment stuff
vim.keymap.set("n", "<leader>ss", function()
	local path = vim.fn.expand("%:p")
	local command = string.format("sf project deploy start --source-dir %s -l NoTestRun -w 5", path)
	utils.run_command_in_pane("deploy", command)
end, { desc = "Deploy source to org" })

vim.keymap.set("n", "<C-s>", function()
	local path = vim.fn.expand("%:p")
	local command = string.format("sf project deploy start --source-dir %s -l NoTestRun -w 5", path)
	utils.run_command_in_pane("deploy", command)
end, { desc = "Deploy source to org" })

vim.keymap.set("i", "<C-s>", function()
	local path = vim.fn.expand("%:p")
	local command = string.format("sf project deploy start --source-dir %s -l NoTestRun -w 5", path)
	utils.run_command_in_pane("deploy", command)
end, { desc = "Deploy source to org (Insert Mode)" })

vim.keymap.set("n", "<leader>cc", function()
	local user_input = vim.fn.input("Class Name: ")
	local path = "force-app/main/default/classes"
	local command = string.format("sf apex generate class --output-dir %s --name %s", path, user_input)
	utils.run_command_in_pane("deploy", command)
end, { desc = "Create Apex Class" })

vim.keymap.set("n", "<leader>ct", function()
	local user_input = vim.fn.input("Trigger Name: ")
	local path = "force-app/main/default/triggers"
	local command = string.format("sf apex generate trigger --output-dir %s --name %s", path, user_input)
	utils.run_command_in_pane("deploy", command)
end, { desc = "Create Apex Trigger" })

-- Salesforce Logs
vim.keymap.set("n", "<leader>lg", function()
	local user_input = vim.fn.input("How many logs?: ")
	local number = tonumber(user_input)
	local command = string.format("sf apex get log --number %d", number)
	utils.run_command_in_pane("deploy", command)
end, { desc = "SFDC - Get Last 3 Logs" })

vim.keymap.set("n", "<leader>ld", function()
	local user_input = vim.fn.input("Which window name?: ", "logs")
	local command = "sf apex log tail --color | grep  USER_DEBUG"
	local window_id = utils.get_tmux_window_id(user_input)
	local tmux_command = string.format('tmux send-keys -t %s "%s" Enter', window_id, command)
	os.execute(tmux_command)
end, { desc = "SFDC - Long Tail Logs" })

vim.keymap.set("n", "<leader>ll", function()
	local user_input = vim.fn.input("Which window name?: ", "logs")
	local command = "sf apex log tail --color | grep  USER_DEBUG"
	local window_id = utils.get_tmux_window_id(user_input)
	local tmux_command = string.format('tmux send-keys -t %s "%s" Enter', window_id, command)
	os.execute(tmux_command)
end, { desc = "SFDC - Long Tail Logs" })

vim.keymap.set("n", "<leader>li", "tabnew | read !sfdx force:apex:log:list", { desc = "SFDC - List Logs" })

-- Harpoon
local mark = require("harpoon.mark")
local ui = require("harpoon.ui")
vim.keymap.set("n", "<leader>a", mark.add_file, { desc = "Add file to Harpoon" })
vim.keymap.set("n", "<C-e>", ui.toggle_quick_menu, { desc = "Toggle Harpoon Menu" })
