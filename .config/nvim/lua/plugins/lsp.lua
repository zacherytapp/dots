return {
	{
		"neovim/nvim-lspconfig",
		dependencies = {
			"saghen/blink.cmp",
			"williamboman/mason.nvim",
			"williamboman/mason-lspconfig.nvim",
		},
		config = function()
			-- Python configuration
			local venv_path = os.getenv("VIRTUAL_ENV")
			local py_path = nil
			if venv_path ~= nil then
				py_path = venv_path .. "/bin/python3"
			else
				py_path = vim.g.python3_host_prog
			end

			local lspconfig_defaults = require("lspconfig").util.default_config
			lspconfig_defaults.capabilities = vim.tbl_deep_extend(
				"force",
				lspconfig_defaults.capabilities,
				require("blink.cmp").get_lsp_capabilities()
			)
			vim.api.nvim_create_autocmd("LspAttach", {
				desc = "LSP actions",
				callback = function(event)
					local signs = {
						ERROR = "✘",
						WARN = "▲",
						HINT = "⚑",
						INFO = "»",
					}
					vim.diagnostic.config({
						virtual_text = {
							errors = { "italic" },
							hints = { "italic" },
							warnings = { "italic" },
							information = { "italic" },
							prefix = function(diagnostic)
								return signs[vim.diagnostic.severity[diagnostic.severity]]
							end,
						},
					})
					local opts = { buffer = event.buf }

					vim.keymap.set("n", "K", "<cmd>lua vim.lsp.buf.hover()<cr>", opts)
					vim.keymap.set("n", "gd", "<cmd>lua vim.lsp.buf.definition()<cr>", opts)
					vim.keymap.set("n", "gD", "<cmd>lua vim.lsp.buf.declaration()<cr>", opts)
					vim.keymap.set("n", "gi", "<cmd>lua vim.lsp.buf.implementation()<cr>", opts)
					vim.keymap.set("n", "go", "<cmd>lua vim.lsp.buf.type_definition()<cr>", opts)
					vim.keymap.set("n", "gr", "<cmd>lua vim.lsp.buf.references()<cr>", opts)
					vim.keymap.set("n", "gs", "<cmd>lua vim.lsp.buf.signature_help()<cr>", opts)
					vim.keymap.set(
						"n",
						"<leader>vd",
						"<cmd>lua vim.diagnostic.open_float()<cr>",
						{ desc = "View Diagnostics" }
					)
					vim.keymap.set("n", "<leader>rn", "<cmd>lua vim.lsp.buf.rename()<cr>", opts)
					vim.keymap.set({ "n", "x" }, "<F3>", "<cmd>lua vim.lsp.buf.format({async = true})<cr>", opts)
					vim.keymap.set("n", "<leader>ca", "<cmd>lua vim.lsp.buf.code_action()<cr>", opts)
				end,
			})

			require("mason").setup()
			require("mason-lspconfig").setup({
				ensure_installed = {
					"apex_ls",
					"eslint",
					"cssls",
					"cssmodules_ls",
					"jdtls",
					"astro",
					"cssls",
					"vtsls",
					"cssmodules_ls",
					"gopls",
					"lua_ls",
					"htmx",
					"pyright",
					"jinja_lsp",
				},
			})

			require("mason-lspconfig").setup_handlers({
				function(server_name) -- default handler (optional)
					require("lspconfig")[server_name].setup({
						on_init = function(client)
							client.server_capabilities.documentFormattingProvider = false
							client.server_capabilities.documentFormattingRangeProvider = false
						end,
						opts = {
							autoformat = false,
						},
					})
				end,
				["pylsp"] = function()
					require("lspconfig").pylsp.setup({
						settings = {
							pylsp = {
								plugins = {
									-- formatter options
									black = { enabled = true },
									autopep8 = { enabled = false },
									yapf = { enabled = false },
									-- linter options
									pylint = { enabled = true, executable = "pylint" },
									ruff = { enabled = false },
									pyflakes = { enabled = false },
									pycodestyle = { enabled = false },
									-- type checker
									pylsp_mypy = {
										enabled = true,
										overrides = { "--python-executable", py_path, true },
										report_progress = true,
										live_mode = false,
									},
									-- auto-completion options
									jedi_completion = { fuzzy = true },
									-- import sorting
									isort = { enabled = true },
								},
							},
						},
					})
				end,
				["lua_ls"] = function()
					require("lspconfig").lua_ls.setup({
						settings = {
							Lua = {
								workspace = { checkThirdParty = false },
								telemetry = { enable = false },
								diagnostics = {
									disable = { "missing-fields" },
									globals = { "vim" },
								},
							},
						},
					})
				end,
				["apex_ls"] = function()
					require("lspconfig").apex_ls.setup({
						apex_jar_path = vim.fn.stdpath("config") .. "/lspserver/" .. "apex-jorje-lsp.jar",
						apex_enable_semantic_errors = false,
						apex_enable_completion_statistics = false,
						filetypes = { "apex", "apexcode" },
						root_dir = require("lspconfig").util.root_pattern(".git", "sfdx-project.json"),
					})
				end,
				["gopls"] = function()
					require("lspconfig").gopls.setup({
						cmd = { "gopls" },
						filetypes = { "go", "gomod", "gowork", "tmpl" },
						settings = {
							gopls = {
								templateExtensions = { "tpl", "yaml", "tmpl", "tmpl.html" },
								gofumpt = true,
								usePlaceholders = true,
								analyses = {
									nilness = true,
									unusedresult = true,
									unusedparams = true,
									unusedwrite = true,
									useany = true,
									unreachable = true,
								},
								hints = {
									assignVariableTypes = true,
									compositeLiteralFields = true,
									compositeLiteralTypes = true,
									constantValues = true,
									functionTypeParameters = true,
									parameterNames = true,
									rangeVariableTypes = true,
								},
								staticcheck = true,
							},
						},
					})
				end,
				["tailwindcss"] = function()
					require("lspconfig").tailwindcss.setup({
						filetypes = { "tmpl", "html" },
					})
				end,
				["html"] = function()
					require("lspconfig").html.setup({
						filetypes = { "tmpl,gotmpl", "html" },
					})
				end,
			})
		end,
	},
}
