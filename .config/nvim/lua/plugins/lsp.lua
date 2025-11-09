local icons = {
	hint = "󰌶",
	error = " ",
	warning = " ",
	info = " ",
}

local formatters = {
	javascript = { "prettierd" },
	javascriptreact = { "prettierd" },
	typescript = { "prettierd" },
	typescriptreact = { "prettierd" },
	markdown = { "prettierd" },
	astro = { "prettierd" },
	json = { "prettierd" },
	jsonc = { "prettierd" },
	html = { "prettierd" },
	yaml = { "prettierd" },
	css = { "stylelint", "prettierd" },
	sh = { "shellcheck", "shfmt" },
	python = { "black", "isort" },
	go = { "gofmt" },
	lua = { "stylua" },
	ruby = { "rubocop" },
	php = { "pint" },
}

return {
	{
		"hrsh7th/vim-vsnip",
		cond = not vim.g.vscode,
		dependencies = {
			"hrsh7th/vim-vsnip-integ",
		},
		config = function()
			local snippet_dir = "/home/zakk/.config/nvim/snippets"
			vim.g.vsnip_snippet_dir = snippet_dir
			vim.g.vsnip_filetypes = {
				javascriptreact = { "javascript" },
				typescriptreact = { "typescript" },
				["typescript.tsx"] = { "typescript" },
			}
		end,
	},

	{
		"vuki656/package-info.nvim",
		config = true,
	},
	{
		"liuchengxu/vista.vim",
		lazy = true,
		cmd = "Vista",
		cond = not vim.g.vscode,
		config = function()
			vim.g.vista_default_executive = "nvim_lsp"
		end,
	},
	{
		"stevearc/conform.nvim",
		opts = {
			format_on_save = {
				timeout_ms = 2000,
				lsp_fallback = false,
			},
			formatters = {
				caddy = {
					command = "caddy",
					args = { "fmt", "-" },
					stdin = true,
				},
			},
			formatters_by_ft = formatters,
		},
	},
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
						ERROR = icons.error,
						WARN = icons.warning,
						HINT = icons.hint,
						INFO = icons.info,
					}
					vim.diagnostic.config({
						signs = {
							text = {
								[vim.diagnostic.severity.ERROR] = "",
								[vim.diagnostic.severity.WARN] = "",
								[vim.diagnostic.severity.INFO] = "",
								[vim.diagnostic.severity.HINT] = "",
							},
							numhl = {
								[vim.diagnostic.severity.WARN] = "WarningMsg",
								[vim.diagnostic.severity.ERROR] = "ErrorMsg",
								[vim.diagnostic.severity.INFO] = "DiagnosticInfo",
								[vim.diagnostic.severity.HINT] = "DiagnosticHint",
							},
						},
						virtual_text = {
							spacing = 4,
							prefix = "●",
							errors = { "italic" },
							hints = { "italic" },
							warnings = { "italic" },
							information = { "italic" },
						},
						float = {
							border = "rounded",
							source = "if_many",
							header = "",
							prefix = "",
						},
						underline = true,
						update_in_insert = false,
						severity_sort = true,
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
					"eslint",
					"cssls",
					"cssmodules_ls",
					"jdtls",
					"astro",
					"vtsls",
					"gopls",
					"ruby_lsp",
					"tailwindcss",
					"html",
					"jsonls",
					"lua_ls",
					"htmx",
					"pyright",
					"jinja_lsp",
				},
			})

			require("mason-lspconfig").setup({
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
				["vimls"] = function()
					require("lspconfig").vimls.setup({
						init_options = { isNeovim = true },
					})
				end,
				["lua_ls"] = function()
					require("lspconfig").lua_ls.setup({
						settings = {
							Lua = {
								runtime = {
									version = "LuaJIT",
								},
								telemetry = { enable = false },
								hint = { enable = true },
								workspace = {
									checkThirdParty = false,
									library = vim.api.nvim_get_runtime_file("", true),
								},
								codeLens = {
									enable = true,
								},
								diagnostics = {
									globals = { "vim" },
								},
								completion = {
									callSnippet = "Replace",
								},
							},
						},
					})
				end,
				["apex-language-server"] = function()
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
						root_markers = {
							"tailwind.config.js",
							"tailwind.config.ts",
							"tailwind.config.cjs",
						},
						init_options = {
							userLanguages = {
								elixir = "html-eex",
								eelixir = "html-eex",
								heex = "html-eex",
							},
						},
						settings = {
							tailwindCSS = {
								lint = {
									cssConflict = "warning",
									invalidApply = "error",
									invalidConfigPath = "error",
									invalidScreen = "error",
									invalidTailwindDirective = "error",
									recommendedVariantOrder = "warning",
									unusedClass = "warning",
								},
								experimental = {},
								validate = true,
							},
						},
					})
				end,
				["html"] = function()
					require("lspconfig").html.setup({
						filetypes = { "tmpl,gotmpl", "html" },
					})
				end,
				["jinja_lsp"] = function()
					require("lspconfig").jinja_lsp.setup({
						filetypes = { "j2", "jinja", "jinja2" },
					})
				end,
			})
		end,
	},
}
