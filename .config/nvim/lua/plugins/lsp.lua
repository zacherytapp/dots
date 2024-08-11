return {
	"neovim/nvim-lspconfig",
	dependencies = {
		"williamboman/mason.nvim",
		"williamboman/mason-lspconfig.nvim",

		{ "j-hui/fidget.nvim", tag = "legacy", opts = {} },

		"folke/neodev.nvim",
	},
	config = function()
		local on_attach = function(_, bufnr)
			local signs = {
				ERROR = "",
				WARN = "",
				HINT = "󰌵",
				INFO = "",
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

			local ts = require("telescope.builtin")
			local key = vim.keymap
			key.set("n", "<leader>rn", vim.lsp.buf.rename, { desc = "[R]e[n]ame (LSP)" })
			key.set("n", "<leader>ca", vim.lsp.buf.code_action, { desc = "[C]ode [A]ction (LSP)" })
			key.set("n", "gd", ts.lsp_definitions, { desc = "[G]oto [D]efinition (LSP)" })
			key.set("n", "gr", ts.lsp_references, { desc = "[G]oto [R]eferences (LSP)" })
			key.set("n", "gi", ts.lsp_implementations, { desc = "[G]oto [I]mplementation (LSP)" })
			key.set("n", "<leader>D", ts.lsp_type_definitions, { desc = "Type [D]efinition (LSP)" })
			key.set("n", "<leader>ds", ts.lsp_document_symbols, { desc = "[D]ocument [S]ymbols (LSP)" })
			key.set("n", "<leader>ws", ts.lsp_dynamic_workspace_symbols, { desc = "[W]orkspace [S]ymbols (LSP)" })
			key.set("n", "K", vim.lsp.buf.hover, { desc = "Hover Documentation (LSP)" })
			key.set("n", "<C-k>", vim.lsp.buf.signature_help, { desc = "Signature Documentation (LSP)" })
			key.set("n", "gD", vim.lsp.buf.declaration, { desc = "[G]oto [D]eclaration (LSP)" })
			key.set("n", "<leader>wa", vim.lsp.buf.add_workspace_folder, { desc = "[W]orkspace [A]dd Folder (LSP)" })
			key.set("n", "gD", vim.lsp.buf.declaration, { desc = "[G]oto [D]eclaration (LSP)" })
			key.set("n", "<leader>wr", vim.lsp.buf.remove_workspace_folder, { desc = "[R]emove Folder (LSP)" })
			key.set("n", "<leader>wl", function()
				print(vim.inspect(vim.lsp.buf.list_workspace_folders()))
			end, { desc = "[W]orkspace [L]ist Folders (LSP)" })

			vim.api.nvim_buf_create_user_command(bufnr, "Format", function(_)
				vim.lsp.buf.format()
			end, { desc = "Format current buffer (LSP)" })
		end

		require("mason").setup()
		require("mason-lspconfig").setup()

		local servers = {
			apex_ls = {},
			eslint = {},
			tsserver = {},
			tailwindcss = {},
			rust_analyzer = {},
			jdtls = {},
			html = {
				filetypes = {
					"html",
					"javascript",
					"javascriptreact",
					"javascript.jsx",
					"typescript",
					"typescriptreact",
					"typescript.tsx",
				},
			},
			gopls = {},
			dockerls = {},
			lua_ls = {
				Lua = {
					workspace = { checkThirdParty = false },
					telemetry = { enable = false },
					diagnostics = { disable = { "missing-fields" } },
				},
			},
			templ = {},
			htmx = {}, -- Make sure rust and c++ are installed
		}

		-- Setup neovim lua configuration
		require("neodev").setup()

		local capabilities = vim.lsp.protocol.make_client_capabilities()
		capabilities = require("cmp_nvim_lsp").default_capabilities(capabilities)

		-- Ensure the servers above are installed
		local mason_lspconfig = require("mason-lspconfig")

		mason_lspconfig.setup({
			ensure_installed = vim.tbl_keys(servers),
		})

		mason_lspconfig.setup_handlers({
			function(server_name)
				require("lspconfig")[server_name].setup({
					capabilities = capabilities,
					on_attach = on_attach,
					settings = servers[server_name],
					filetypes = (servers[server_name] or {}).filetypes,
				})
			end,
		})

		local lspconfig = require("lspconfig")
		local apex_jar_path = vim.fn.stdpath("config") .. "/lspserver/" .. "apex-jorje-lsp.jar"
		vim.filetype.add({ extension = { templ = "templ" } })

		lspconfig.apex_ls.setup({
			apex_jar_path = apex_jar_path,
			apex_enable_semantic_errors = true,
			apex_enable_completion_statistics = false,
			filetypes = { "apex", "apexcode" },
			root_dir = lspconfig.util.root_pattern("sfdx-project.json"),

			on_attach = on_attach,
			capabilities = capabilities,
		})

		lspconfig.templ.setup({
			on_attach = on_attach,
			capabilities = capabilities,
		})

		lspconfig.htmx.setup({
			on_attach = on_attach,
			capabilities = capabilities,
			filetypes = { "html", "templ" },
		})

		lspconfig.html.setup({
			on_attach = on_attach,
			capabilities = capabilities,
			filetypes = { "html", "templ" },
		})

		lspconfig.tailwindcss.setup({
			on_attach = on_attach,
			capabilities = capabilities,
			filetypes = { "templ", "astro", "javascript", "typescript", "react" },
			init_options = { userLanguages = { templ = "html" } },
		})

		lspconfig.gopls.setup({
			on_attach = on_attach,
			capabilities = capabilities,
			cmd = { "gopls" },
			filetypes = { "go", "gomod", "gowork", "gotmpl" },
			settings = {
				gopls = {
					analyses = {
						nilness = true,
						unusedparams = true,
						unusedwrite = true,
						useany = true,
					},
					experimentalPostfixCompletions = true,
					gofumpt = true,
					usePlaceholders = true,
					hints = {
						assignVariableTypes = true,
						compositeLiteralFields = true,
						compositeLiteralTypes = true,
						constantValues = true,
						functionTypeParameters = true,
						parameterNames = true,
						rangeVariableTypes = true,
					},
				},
			},
		})
	end,
}
