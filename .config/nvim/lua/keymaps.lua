local utils = require("utils")
local wk = require("which-key")

require("telescope").load_extension("fzf")
require("telescope").load_extension("live_grep_args")

-- Formatting
local function format_json()
	vim.cmd(":set filetype=json")
	vim.cmd(":%!jq '.'")
end

local function format_file()
	vim.lsp.buf.format()
end

local mappings = {
	{ "-", "<CMD>Oil<CR>", desc = "[Oil] Open parent directory (Utilities)" },
	{ "<ESC>", [[<C-\><C-n>:q<CR>]], desc = "Exit Terminal Mode (Terminal)", mode = { "t" } },
	{ "C-d", [[<C-\><C-d>]], desc = "Exit Terminal Mode (Terminal)", mode = { "t" } },
	{ "<C-k", "Signiature Documentation (LSP)", mode = { "n" } },
	{ "K", "Hover Documentation (LSP)", mode = { "n" } },
	{ "<leader>D", "Type [D]efinition (LSP)", mode = { "n" } },
	{ "<leader>ds", "[D]ocument [S]ymbols (LSP)", mode = { "n" } },
	{ "<leader>ca", "[C]ode [A]ction (LSP)", mode = { "n" } },
	{ "<leader>ws", "[W]orkspace [S]ymbols (LSP)", mode = { "n" } },
	{ "gD", "[G]oto [D]eclaration (LSP)", mode = { "n" } },
	{ "<leader>wa", "[W]orkspace [A]dd Folder (LSP)", mode = { "n" } },
	{ "<leader>wr", "[W]orkspace [R]emove Folder (LSP)", mode = { "n" } },
	{ "<leader>wl", "[W]orkspace [L]ist Folders (LSP)", mode = { "n" } },
	{ "<leader>rn", "[R]e[n]ame (LSP)", mode = { "n" } },
	{ "<leader>x", group = "+Trouble" },
	{ "<leader>f", group = "+Find and Format" },
	{ "<leader>fj", format_json, desc = "Format [J]SON (Utilities)" },
	{ "<leader>fF", format_file, desc = "Format [F]ile (Utilities)" },
	{ "<leader>y", group = "+Yank Utilities" },
	{ "<leader>yy", [["+y]], desc = "[y]ank to clipboard (Utilities)", mode = { "n", "v" } },
	{ "<leader>Y", [["+Y]], desc = "[Y]ank to clipboard (Utilities)" },
	{ "<leader>p", [["_dP]], desc = "[P]aste over visual selection (Utilities)" },
	{ "<leader>u", "<CMD>UndotreeToggle<CR>", desc = "Toggle [U]ndotree (Undotree)" },
	{ "<leader>t", group = "+Toggle & Salesforce Testing" },
	{
		"<leader>to",
		"<CMD>ToggleTerm dir=git_dir direction=horizontal name=git size=10<CR>",
		desc = "[O]pen Terminal in Git Directory (Terminal)",
	},
	{
		"<leader>tf",
		"<CMD>ToggleTerm dir=git_dir direction=float name=git size=20<CR>",
		desc = "Open Terminal in Git Directory in [F]loat Mode (Terminal)",
	},
	{
		"<leader>tt",
		function()
			local class_name = utils.get_current_class_name()
			local test_class_command = string.format(
				"sf apex run test --code-coverage --detailed-coverage --result-format human --wait 5 --class-names %s",
				class_name
			)
			local window_id = utils.get_tmux_window_id("deploy")
			local tmux_command = string.format('tmux send-keys -t %s "%s" Enter', window_id, test_class_command)
			os.execute(tmux_command)
		end,
		desc = "Run [T]est on Current Class (Salesforce - SFDX)",
	},
	{
		"<leader>tm",
		function()
			local method_name = utils.get_current_full_method_name()
			local test_method_command = string.format(
				"sf apex run test --code-coverage --detailed-coverage --result-format human --wait 5 --tests %s",
				method_name
			)
			local window_id = utils.get_tmux_window_id("deploy")
			local tmux_command = string.format('tmux send-keys -t %s "%s" Enter', window_id, test_method_command)
			os.execute(tmux_command)
		end,
		desc = "Run [T]est on Current Method (Salesforce - SFDX)",
	},
	{
		"<leader>tl",
		function()
			local command =
				"sf apex run test --code-coverage --detailed-coverage --result-format human --testlevel RunLocalTests -w 15"
			local window_id = utils.get_tmux_window_id("deploy")
			local tmux_command = string.format('tmux send-keys -t %s "%s" Enter', window_id, command)
			os.execute(tmux_command)
		end,
		desc = "Run All [L]ocal Tests (Salesforce - SFDX)",
	},
	{ "<leader>l", group = "+Salesforce Logs" },
	{
		"<leader>lg",
		function()
			local user_input = vim.fn.input("How many logs?: ")
			local number = tonumber(user_input)
			local command = string.format("sf apex get log --number %d", number)
			local window_id = utils.get_tmux_window_id("deploy")
			local tmux_command = string.format('tmux send-keys -t %s "%s" Enter', window_id, command)
			os.execute(tmux_command)
		end,
		desc = "[G]et Last N Logs (Salesforce - SFDX)",
	},
	{
		"<leader>ld",
		function()
			local user_input = vim.fn.input("Which window name?: ", "logs")
			local command = "sf apex log tail --color | grep  USER_DEBUG"
			local window_id = utils.get_tmux_window_id(user_input)
			local tmux_command = string.format('tmux send-keys -t %s "%s" Enter', window_id, command)
			os.execute(tmux_command)
		end,
		desc = "Long Tail Logs (Salesforce - SFDX)",
	},
	{
		"<leader>ll",
		function()
			local user_input = vim.fn.input("Which window name?: ", "logs")
			local command = "sf apex log tail --color | grep  USER_DEBUG"
			local window_id = utils.get_tmux_window_id(user_input)
			local tmux_command = string.format('tmux send-keys -t %s "%s" Enter', window_id, command)
			os.execute(tmux_command)
		end,
		desc = "[L]ong Tail Logs (Salesforce - SFDX)",
	},
	{
		"<leader>li",
		"tabnew | read !sfdx force:apex:log:list",
		desc = "[I]nteractive Log List (Salesforce - SFDX)",
	},
	{ "<leader>c", group = "+Salesforce Code Creation" },
	{
		"<leader>cc",
		function()
			local user_input = vim.fn.input("Class Name: ")
			local path = "force-app/main/default/classes"
			local command = string.format("sf apex generate class --output-dir %s --name %s", path, user_input)
			utils.run_command_in_pane("deploy", command)
		end,
		desc = "Create Apex [C]lass (Salesforce)",
	},
	{
		"<leader>ct",
		function()
			local user_input = vim.fn.input("Trigger Name: ")
			local path = "force-app/main/default/triggers"
			local command = string.format("sf apex generate trigger --output-dir %s --name %s", path, user_input)
			utils.run_command_in_pane("deploy", command)
		end,
		desc = "Create Apex [T]rigger (Salesforce)",
	},
	{ "<leader>s", group = "+Salesforce Saving/Deployment" },
	{
		"<leader>ss",
		function()
			vim.api.nvim_command("w")
			local path = vim.fn.expand("%:p")
			local command = string.format("sf project deploy start --source-dir %s -l NoTestRun -w 5", path)
			local window_id = utils.get_tmux_window_id("deploy")
			local tmux_command = string.format('tmux send-keys -t %s "%s" Enter', window_id, command)
			os.execute(tmux_command)
		end,
		desc = "Deploy [S]ource to org (Salesforce - SFDX)",
	},
	-- {
	-- 	"<C-s>",
	-- 	function()
	--    vim.api.nvim_command("w")
	-- 		local path = vim.fn.expand("%:p")
	-- 		local command = string.format("sf project deploy start --source-dir %s -l NoTestRun -w 5", path)
	-- 		utils.run_command_in_pane("deploy", command)
	-- 	end,
	-- 	desc = "Deploy [S]ource to org (Salesforce)",
	-- 	mode = { "n", "i" },
	-- },
	{ "<leader>pp", desc = "Open [P]rojects (Legendary)" },
}

-- Harpoon
local mark = require("harpoon.mark")
local ui = require("harpoon.ui")
vim.keymap.set("n", "<leader>a", mark.add_file, { desc = "Add file to Harpoon" })
vim.keymap.set("n", "<C-e>", ui.toggle_quick_menu, { desc = "Toggle Harpoon Menu" })
wk.add(mappings)

vim.keymap.set("n", "<leader>pp", function()
	local legendary = require("legendary")
	legendary.find({
		filters = { require("legendary.filters").keymaps() },
	})
end, { desc = "Legendary" })

-- Keymaps

vim.keymap.set("n", "k", "v:count == 0 ? 'gk' : 'k'", { expr = true, silent = true })
vim.keymap.set("n", "j", "v:count == 0 ? 'gj' : 'j'", { expr = true, silent = true })

vim.keymap.set("v", "<S-Tab>", "<gv", { desc = "Select previous text object" })
vim.keymap.set("n", "<A-t>", ":tabnew<CR>", { desc = "New Tab" })
