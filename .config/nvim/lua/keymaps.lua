local utils = require("utils")

require("telescope").load_extension("fzf")
require("telescope").load_extension("live_grep_args")
local key = vim.keymap

-- LSP Keymaps
local ts = require("telescope.builtin")
key.set("n", "-", "<CMD>Oil<CR>", { desc = "[Oil] Open parent directory (Utilities)" })
key.set("n", "<leader>rn", vim.lsp.buf.rename, { desc = "[R]e[n]ame (LSP)" })
key.set("n", "<leader>ca", vim.lsp.buf.code_action, { desc = "[C]ode [A]ction (LSP)" })
key.set("n", "gd", ts.lsp_definitions, { desc = "[G]oto [D]efinition (LSP)" })
key.set("n", "gr", ts.lsp_references, { desc = "[G]oto [R]eferences (LSP)" })
key.set("n", "gi", ts.lsp_implementations, { desc = "[G]oto [I]mplementation (LSP)" })
key.set("n", "<leader>D", ts.lsp_type_definitions, { desc = "Type [D]efinition (LSP)" })
key.set("n", "<leader>ds", ts.lsp_document_symbols, { desc = "[D]ocument [S]ymbols (LSP)" })
key.set("n", "<leader>ws", ts.lsp_dynamic_workspace_symbols, { desc = "[W]orkspace [S]ymbols (LSP)" })
key.set("n", "<leader>gf", ts.git_files, { desc = "Search [G]it [F]iles" })
key.set("n", "<leader>ff", ts.find_files, { desc = "[S]earch [F]iles" })
key.set("n", "<leader>fr", ts.lsp_references, { desc = "[G]oto [R]eferences (LSP)" })
key.set("n", "<leader>fh", ts.help_tags, { desc = "[S]earch [H]elp" })
key.set("n", "<leader>fw", ts.grep_string, { desc = "[S]earch current [W]ord" })
key.set("n", "<leader>fg", ts.live_grep, { desc = "[S]earch by [G]rep" })
key.set("n", "K", vim.lsp.buf.hover, { desc = "Hover Documentation (LSP)" })
key.set("n", "<C-k>", vim.lsp.buf.signature_help, { desc = "Signature Documentation (LSP)" })
key.set("n", "gD", vim.lsp.buf.declaration, { desc = "[G]oto [D]eclaration (LSP)" })
key.set("n", "<leader>wa", vim.lsp.buf.add_workspace_folder, { desc = "[W]orkspace [A]dd Folder (LSP)" })
key.set("n", "<leader>wr", vim.lsp.buf.remove_workspace_folder, { desc = "[R]emove Folder (LSP)" })
key.set("n", "<leader>xx", "<CMD>Trouble diagnostics toggle<CR>", { desc = "Diagnostics (Trouble)" })
key.set("n", "<leader>xX", "<CMD>Trouble diagnostics toggle filter.buf=0<CR>", { desc = "Buf Diagnostics (Trouble)" })
key.set("n", "<leader>cs", "<CMD>Trouble symbols toggle focus=false<CR>", { desc = "Symbols (Trouble)" })
key.set("n", "<leader>cl", "<CMD>Trouble lsp toggle focus=false win.position=right<CR>", { desc = "LSP (Trouble)" })
key.set("n", "<leader>xL", "<CMD>Trouble loclist toggle<CR>", { desc = "Location List (Trouble)" })
key.set("n", "<leader>xQ", "<CMD>Trouble qflist toggle<CR>", { desc = "Quickfix List (Trouble)" })
key.set("n", "<leader>yy", [["+y]], { desc = "[y]ank to clipboard (Utilities)" })
key.set("n", "<leader>Y", [["+Y]], { desc = "[Y]ank to clipboard (Utilities)" })
key.set("n", "<leader>p", [["_dP]], { desc = "[P]aste over visual selection (Utilities)" })
key.set("n", "<leader>u", "<CMD>UndotreeToggle<CR>", { desc = "[U]ndotree (Undotree)" })
key.set("n", "<leader>fj", function()
	vim.cmd(":set filetype=json")
	vim.cmd(":%!jq '.'")
end, { desc = "[J]SON Format (Utilities)" })
key.set("n", "<leader>wl", function()
	print(vim.inspect(vim.lsp.buf.list_workspace_folders()))
end, { desc = "[W]orkspace [L]ist Folders (LSP)" })
key.set("n", "<leader>fF", function()
	vim.lsp.buf.format()
end, { desc = "Format [F]ile (Utilities)" })

key.set("i", "<C-l>", 'copilot#Accept("\\<CR>")', {
	expr = true,
	replace_keycodes = false,
})

vim.g.copilot_no_tab_map = true

key.set("n", "<leader>tt", function()
	local class_name = utils.get_current_class_name()
	local test_class_command = string.format(
		"sf apex run test --code-coverage --detailed-coverage --result-format human --wait 5 --class-names %s",
		class_name
	)
	local window_id = utils.get_tmux_window_id("deploy")
	local tmux_command = string.format('tmux send-keys -t %s "%s" Enter', window_id, test_class_command)
	os.execute(tmux_command)
end, { desc = "Run [T]est on Current Class (Salesforce - SFDX)" })

key.set("n", "<leader>tm", function()
	local method_name = utils.get_current_full_method_name()
	local test_method_command = string.format(
		"sf apex run test --code-coverage --detailed-coverage --result-format human --wait 5 --tests %s",
		method_name
	)
	local window_id = utils.get_tmux_window_id("deploy")
	local tmux_command = string.format('tmux send-keys -t %s "%s" Enter', window_id, test_method_command)
	os.execute(tmux_command)
end, { desc = "Run [T]est on Current Method (Salesforce - SFDX)" })

key.set("n", "<leader>tl", function()
	local command =
		"sf apex run test --code-coverage --detailed-coverage --result-format human --test-level RunLocalTests -w 15"
	local window_id = utils.get_tmux_window_id("deploy")
	local tmux_command = string.format('tmux send-keys -t %s "%s" Enter', window_id, command)
	os.execute(tmux_command)
end, { desc = "Run All [L]ocal Tests (Salesforce - SFDX)" })

key.set("n", "<leader>lg", function()
	local user_input = vim.fn.input("How many logs?: ")
	local number = tonumber(user_input)
	local command = string.format("sf apex get log --number %d", number)
	local window_id = utils.get_tmux_window_id("deploy")
	local tmux_command = string.format('tmux send-keys -t %s "%s" Enter', window_id, command)
	os.execute(tmux_command)
end, { desc = "[G]et Last N Logs (Salesforce - SFDX)" })

key.set("n", "<leader>ld", function()
	local user_input = vim.fn.input("Which window name?: ", "logs")
	local command = "sf apex log tail --color | grep  USER_DEBUG"
	local window_id = utils.get_tmux_window_id(user_input)
	local tmux_command = string.format('tmux send-keys -t %s "%s" Enter', window_id, command)
	os.execute(tmux_command)
end, { desc = "Long Tail Logs (Salesforce - SFDX)" })

key.set("n", "<leader>ll", function()
	local user_input = vim.fn.input("Which window name?: ", "logs")
	local command = "sf apex log tail --color | grep  USER_DEBUG"
	local window_id = utils.get_tmux_window_id(user_input)
	local tmux_command = string.format('tmux send-keys -t %s "%s" Enter', window_id, command)
	os.execute(tmux_command)
end, { desc = "Long Tail Logs (Salesforce - SFDX)" })

key.set(
	"n",
	"<leader>li",
	"tabnew | read !sfdx force:apex:log:list",
	{ desc = "[I]nteractive Log List (Salesforce - SFDX)" }
)

key.set("n", "<leader>cc", function()
	local user_input = vim.fn.input("Class Name: ")
	local path = "force-app/main/default/classes"
	local command = string.format("sf apex generate class --output-dir %s --name %s", path, user_input)
	utils.run_command_in_pane("deploy", command)
end, { desc = "Create [C]lass (Salesforce)" })

key.set("n", "<leader>ss", function()
	vim.api.nvim_command("w")
	local path = vim.fn.expand("%:p")
	local command = string.format("sf project deploy start --source-dir %s -l NoTestRun -w 5", path)
	local window_id = utils.get_tmux_window_id("deploy")
	local tmux_command = string.format('tmux send-keys -t %s "%s" Enter', window_id, command)
	os.execute(tmux_command)
end, { desc = "Deploy [S]ource to org (Salesforce - SFDX)" })

key.set("n", "<leader>ct", function()
	local user_input = vim.fn.input("Trigger Name: ")
	local path = "force-app/main/default/triggers"
	local command = string.format("sf apex generate trigger --output-dir %s --name %s", path, user_input)
	utils.run_command_in_pane("deploy", command)
end, { desc = "Create [T]rigger (Salesforce)" })
