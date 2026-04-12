return {
	{
		"mfussenegger/nvim-dap",
		dependencies = {
			-- UI
			"rcarriga/nvim-dap-ui",
			"nvim-neotest/nvim-nio",
			"theHamsta/nvim-dap-virtual-text",

			-- Mason integration
			"jay-babu/mason-nvim-dap.nvim",

			-- Language-specific
			"leoluz/nvim-dap-go",
			"mfussenegger/nvim-dap-python",
		},
		config = function()
			local dap = require("dap")
			local dapui = require("dapui")

			-------------------------------------------------------------
			-- DAP UI
			-------------------------------------------------------------
			dapui.setup({
				icons = { expanded = "▾", collapsed = "▸", current_frame = "▸" },
				layouts = {
					{
						elements = {
							{ id = "scopes", size = 0.35 },
							{ id = "breakpoints", size = 0.15 },
							{ id = "stacks", size = 0.25 },
							{ id = "watches", size = 0.25 },
						},
						position = "left",
						size = 40,
					},
					{
						elements = {
							{ id = "repl", size = 0.5 },
							{ id = "console", size = 0.5 },
						},
						position = "bottom",
						size = 10,
					},
				},
			})

			-- Auto open/close UI on debug session events
			dap.listeners.after.event_initialized["dapui_config"] = function()
				dapui.open()
			end
			dap.listeners.before.event_terminated["dapui_config"] = function()
				dapui.close()
			end
			dap.listeners.before.event_exited["dapui_config"] = function()
				dapui.close()
			end

			-------------------------------------------------------------
			-- Virtual text (inline variable values while debugging)
			-------------------------------------------------------------
			require("nvim-dap-virtual-text").setup({
				highlight_changed_variables = true,
				show_stop_reason = true,
			})

			-------------------------------------------------------------
			-- Breakpoint signs
			-------------------------------------------------------------
			vim.fn.sign_define("DapBreakpoint", { text = "", texthl = "DiagnosticError" })
			vim.fn.sign_define("DapBreakpointCondition", { text = "", texthl = "DiagnosticWarn" })
			vim.fn.sign_define("DapLogPoint", { text = "", texthl = "DiagnosticInfo" })
			vim.fn.sign_define("DapStopped", { text = "▶", texthl = "DiagnosticOk", linehl = "DapStoppedLine" })
			vim.fn.sign_define("DapBreakpointRejected", { text = "", texthl = "DiagnosticError" })

			-- Highlight for the current stopped line
			vim.api.nvim_set_hl(0, "DapStoppedLine", { bg = "#2B3328" })

			-------------------------------------------------------------
			-- Mason-DAP: auto-install debug adapters
			-------------------------------------------------------------
			require("mason-nvim-dap").setup({
				ensure_installed = {
					"python",
					"delve",
					"codelldb",
					"js",
					"bash",
				},
				automatic_installation = true,
				handlers = {},
			})

			-------------------------------------------------------------
			-- Go (via nvim-dap-go / delve)
			-------------------------------------------------------------
			require("dap-go").setup()

			-------------------------------------------------------------
			-- Python (via nvim-dap-python / debugpy)
			-------------------------------------------------------------
			-- Use the venv python if available, otherwise fall back to system
			local python_path = (function()
				local venv = vim.env.VIRTUAL_ENV
				if venv then
					return venv .. "/bin/python"
				end
				return vim.fn.exepath("python3") or "python3"
			end)()
			require("dap-python").setup(python_path)

			-------------------------------------------------------------
			-- Rust / C / C++ (via codelldb)
			-------------------------------------------------------------
			dap.configurations.rust = {
				{
					name = "Launch",
					type = "codelldb",
					request = "launch",
					program = function()
						-- Build first, then prompt for the binary
						vim.fn.jobwait({ vim.fn.jobstart("cargo build", { cwd = vim.fn.getcwd() }) })
						return vim.fn.input("Path to executable: ", vim.fn.getcwd() .. "/target/debug/", "file")
					end,
					cwd = "${workspaceFolder}",
					stopOnEntry = false,
				},
			}

			-------------------------------------------------------------
			-- JavaScript / TypeScript (via js-debug-adapter / pwa-node)
			-------------------------------------------------------------
			-- mason-nvim-dap registers the pwa-node and pwa-chrome adapters
			-- when "js" is in ensure_installed. We just define configurations.
			for _, lang in ipairs({ "javascript", "typescript", "javascriptreact", "typescriptreact" }) do
				dap.configurations[lang] = {
					{
						name = "Launch file (Node)",
						type = "pwa-node",
						request = "launch",
						program = "${file}",
						cwd = "${workspaceFolder}",
					},
					{
						name = "Attach to process (Node)",
						type = "pwa-node",
						request = "attach",
						processId = require("dap.utils").pick_process,
						cwd = "${workspaceFolder}",
					},
					{
						name = "Launch Chrome (localhost:3000)",
						type = "pwa-chrome",
						request = "launch",
						url = "http://localhost:3000",
						webRoot = "${workspaceFolder}",
					},
				}
			end

			-------------------------------------------------------------
			-- Bash (via bash-debug-adapter)
			-------------------------------------------------------------
			-- mason-nvim-dap registers the adapter; we add the configuration
			dap.configurations.sh = {
				{
					name = "Launch Bash script",
					type = "bash",
					request = "launch",
					program = "${file}",
					cwd = "${workspaceFolder}",
				},
			}
		end,
		commander = {
			-- Session control
			{
				keys = { "n", "<leader>dc" },
				cmd = function()
					require("dap").continue()
				end,
				desc = "DAP: Continue / Start",
			},
			{
				keys = { "n", "<leader>dq" },
				cmd = function()
					require("dap").terminate()
				end,
				desc = "DAP: Terminate session",
			},
			{
				keys = { "n", "<leader>dr" },
				cmd = function()
					require("dap").restart()
				end,
				desc = "DAP: Restart session",
			},
			{
				keys = { "n", "<leader>dp" },
				cmd = function()
					require("dap").pause()
				end,
				desc = "DAP: Pause",
			},

			-- Stepping
			{
				keys = { "n", "<leader>do" },
				cmd = function()
					require("dap").step_over()
				end,
				desc = "DAP: Step over",
			},
			{
				keys = { "n", "<leader>di" },
				cmd = function()
					require("dap").step_into()
				end,
				desc = "DAP: Step into",
			},
			{
				keys = { "n", "<leader>dO" },
				cmd = function()
					require("dap").step_out()
				end,
				desc = "DAP: Step out",
			},
			{
				keys = { "n", "<leader>dC" },
				cmd = function()
					require("dap").run_to_cursor()
				end,
				desc = "DAP: Run to cursor",
			},

			-- Breakpoints
			{
				keys = { "n", "<leader>db" },
				cmd = function()
					require("dap").toggle_breakpoint()
				end,
				desc = "DAP: Toggle breakpoint",
			},
			{
				keys = { "n", "<leader>dB" },
				cmd = function()
					require("dap").set_breakpoint(vim.fn.input("Breakpoint condition: "))
				end,
				desc = "DAP: Conditional breakpoint",
			},
			{
				keys = { "n", "<leader>dl" },
				cmd = function()
					require("dap").set_breakpoint(nil, nil, vim.fn.input("Log message: "))
				end,
				desc = "DAP: Log point",
			},
			{
				keys = { "n", "<leader>dx" },
				cmd = function()
					require("dap").clear_breakpoints()
				end,
				desc = "DAP: Clear all breakpoints",
			},

			-- UI & Inspection
			{
				keys = { "n", "<leader>du" },
				cmd = function()
					require("dapui").toggle()
				end,
				desc = "DAP: Toggle UI",
			},
			{
				keys = { { "n", "v" }, "<leader>de" },
				cmd = function()
					require("dapui").eval() -- dap-ui expression evaluator, not JS eval
				end,
				desc = "DAP: Evaluate expression",
			},
			{
				keys = { "n", "<leader>dR" },
				cmd = function()
					require("dap").repl.toggle()
				end,
				desc = "DAP: Toggle REPL",
			},

			-- Go-specific
			{
				keys = { "n", "<leader>dgt" },
				cmd = function()
					require("dap-go").debug_test()
				end,
				desc = "DAP Go: Debug nearest test",
			},
			{
				keys = { "n", "<leader>dgl" },
				cmd = function()
					require("dap-go").debug_last_test()
				end,
				desc = "DAP Go: Debug last test",
			},

			-- Python-specific
			{
				keys = { "n", "<leader>dpt" },
				cmd = function()
					require("dap-python").test_method()
				end,
				desc = "DAP Python: Debug test method",
			},
			{
				keys = { "n", "<leader>dpc" },
				cmd = function()
					require("dap-python").test_class()
				end,
				desc = "DAP Python: Debug test class",
			},
		},
	},
}
