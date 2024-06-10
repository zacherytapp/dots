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
	["-"] = { "<CMD>Oil<CR>", "[Oil] Open parent directory (Utilities)" },
	["<ESC>"] = { [[<C-\><C-n>:q<CR>]], "Exit Terminal Mode (Terminal)", mode = { "t" } },
	["<C-d>"] = { [[<C-\><C-d>]], "Exit Terminal Mode (Terminal)", mode = { "t" } },
	["<leader>"] = {
		x = { name = "+Trouble" },
		f = {
			name = "+Find and Format",
			j = { format_json, "Format [J]SON (Utilities)" },
			F = { format_file, "Format [F]ile (Utilities)" },
		},
		y = {
			name = "+Yank Utilities",
			y = { [["+y]], "[y]ank to clipboard (Utilities)", mode = { "n", "v" } },
			Y = { [["+Y]], "[Y]ank to clipboard (Utilities)" },
		},
		p = { [["_dP]], "[P]aste over visual selection (Utilities)" },
		u = { "<CMD>UndotreeToggle<CR>", "Toggle [U]ndotree (Undotree)" },
		t = {
			name = "+Toggle & Salesforce Testing",
			o = {
				"<CMD>ToggleTerm dir=git_dir direction=horizontal name=git size=10<CR>",
				"[O]pen Terminal in Git Directory (Terminal)",
			},
			f = {
				"<CMD>ToggleTerm dir=git_dir direction=float name=git size=20<CR>",
				"Open Terminal in Git Directory in [F]loat Mode (Terminal)",
			},
			t = {
				function()
					local class_name = utils.get_current_class_name()
					local test_class_command = string.format(
						"sf apex run test --code-coverage --detailed-coverage --result-format human --wait 5 --class-names %s",
						class_name
					)
					utils.run_command_in_pane("test", test_class_command)
				end,
				"Run [T]est on Current Class (Salesforce - SFDX)",
			},
			m = {
				function()
					local method_name = utils.get_current_full_method_name(".")
					local test_method_command = string.format(
						"sf apex run test --synchronous --detailed-coverage --code-coverage --result-format human --wait 5 --tests %s",
						method_name
					)
					utils.run_command_in_pane("test", test_method_command)
				end,
				"Run Test on Current [M]ethod (Salesforce - SFDX)",
			},
			l = {
				function()
					local command =
						"sf apex run test --code-coverage --detailed-coverage --result-format human --testlevel RunLocalTests -w 15"
					utils.run_command_in_pane("test", command)
				end,
				"Run All [L]ocal Tests (Salesforce - SFDX)",
			},
		},
		-- Salesforce Saving/Deployment
		s = {
			name = "+Salesforce Saving/Deployment",
			s = {
				function()
					local path = vim.fn.expand("%:p")
					local command = string.format("sf project deploy start --source-dir %s -l NoTestRun -w 5", path)
					utils.run_command_in_pane("deploy", command)
				end,
				"Deploy [s]ource to org (Salesforce - SFDX)",
			},
		},
		l = {
			name = "+Salesforce Logs",
			g = {
				function()
					local user_input = vim.fn.input("How many logs?: ")
					local number = tonumber(user_input)
					local command = string.format("sf apex get log --number %d", number)
					utils.run_command_in_pane("deploy", command)
				end,
				"[G]et Last N Logs (Salesforce - SFDX)",
			},
			d = {
				function()
					local user_input = vim.fn.input("Which window name?: ", "logs")
					local command = "sf apex log tail --color | grep  USER_DEBUG"
					local window_id = utils.get_tmux_window_id(user_input)
					local tmux_command = string.format('tmux send-keys -t %s "%s" Enter', window_id, command)
					os.execute(tmux_command)
				end,
				"Long Tail Logs (Salesforce - SFDX)",
			},
			l = {
				function()
					local user_input = vim.fn.input("Which window name?: ", "logs")
					local command = "sf apex log tail --color | grep  USER_DEBUG"
					local window_id = utils.get_tmux_window_id(user_input)
					local tmux_command = string.format('tmux send-keys -t %s "%s" Enter', window_id, command)
					os.execute(tmux_command)
				end,
				"[L]ong Tail Logs (Salesforce - SFDX)",
			},
			i = {
				"tabnew | read !sfdx force:apex:log:list",
				"[I]nteractive Log List (Salesforce - SFDX)",
			},
		},
		-- Salesforce Code Creation
		c = {
			name = "+Salesforce Code Creation",
			c = {
				function()
					local user_input = vim.fn.input("Class Name: ")
					local path = "force-app/main/default/classes"
					local command = string.format("sf apex generate class --output-dir %s --name %s", path, user_input)
					utils.run_command_in_pane("deploy", command)
				end,
				"Create Apex [C]lass (Salesforce)",
			},
			t = {
				function()
					local user_input = vim.fn.input("Trigger Name: ")
					local path = "force-app/main/default/triggers"
					local command =
						string.format("sf apex generate trigger --output-dir %s --name %s", path, user_input)
					utils.run_command_in_pane("deploy", command)
				end,
				"Create Apex [T]rigger (Salesforce)",
			},
		},
	},
	-- Salesforce Saving/Deployment
	["<C-s>"] = {
		function()
			local path = vim.fn.expand("%:p")
			local command = string.format("sf project deploy start --source-dir %s -l NoTestRun -w 5", path)
			utils.run_command_in_pane("deploy", command)
		end,
		"Deploy [s}ource to org (Salesforce)",
		mode = { "n", "i" },
	},
}

-- Harpoon
local mark = require("harpoon.mark")
local ui = require("harpoon.ui")
vim.keymap.set("n", "<leader>a", mark.add_file, { desc = "Add file to Harpoon" })
vim.keymap.set("n", "<C-e>", ui.toggle_quick_menu, { desc = "Toggle Harpoon Menu" })
local function register_which_key()
	require("which-key").register()
end
register_which_key()

vim.keymap.set("n", "<leader>pp", function()
	local legendary = require("legendary")
	legendary.find({
		filters = { require("legendary.filters").keymaps() },
	})
end, { desc = "Legendary" })

-- Keymaps
wk.register(mappings)

vim.keymap.set("n", "k", "v:count == 0 ? 'gk' : 'k'", { expr = true, silent = true })
vim.keymap.set("n", "j", "v:count == 0 ? 'gj' : 'j'", { expr = true, silent = true })

vim.keymap.set("v", "<S-Tab>", "<gv", { desc = "Select previous text object" })
vim.keymap.set("n", "<A-t>", ":tabnew<CR>", { desc = "New Tab" })
