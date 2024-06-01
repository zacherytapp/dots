return {
	"nvimtools/none-ls.nvim",
	dependencies = {
		"mason.nvim",
		"jay-babu/mason-null-ls.nvim",
	},
	event = { "BufReadPre", "BufNewFile" },
	config = function()
		local null_ls = require("null-ls")
		local mason_null_ls = require("mason-null-ls")

		local null_ls_utils = require("null-ls.utils")

		mason_null_ls.setup({
			ensure_installed = {
				"prettier",
				"stylua",
				"black",
				"pylint",
				"eslint_d",
				"djlint",
				"python-lsp-server",
				"pyright",
			},
		})

		local formatting = null_ls.builtins.formatting
		local diagnostics = null_ls.builtins.diagnostics

		local augroup = vim.api.nvim_create_augroup("LspFormatting", {})
		null_ls.setup({
			root_dir = null_ls_utils.root_pattern(".null-ls-root", "Makefile", ".git", "package.json"),

			-- setup formatters & linters
			sources = {
				formatting.prettier.with({
					extra_filetypes = {
						"apex",
						"lua",
						"javascript",
						"typescript",
						"pylint",
						"java",
						"djlint",
						"python-lsp-server",
						"templ",
					},
				}), -- js/ts formatter
				formatting.stylua, -- lua formatter
				formatting.isort,
				formatting.black,
				formatting.djlint,
				diagnostics.pylint.with({
					diagnostic_config = { underline = false, virtual_text = false, signs = false },
					method = null_ls.methods.DIAGNOSTICS_ON_SAVE,
				}),
				diagnostics.pmd.with({
					extra_filetypes = { "apex" },
					filetypes = { "apex" },
					args = { "check", "--dir", "$ROOT", "--format", "json" },
					extra_args = {
						"--rulesets",
						"/home/zakk/.config/rules/apex_ruleset.xml",
					},
				}),
			},
			-- configure format on save
			on_attach = function(current_client, bufnr)
				if current_client.supports_method("textDocument/formatting") then
					vim.api.nvim_clear_autocmds({ group = augroup, buffer = bufnr })
					vim.api.nvim_create_autocmd("BufWritePre", {
						group = augroup,
						buffer = bufnr,
						callback = function()
							vim.lsp.buf.format({
								filter = function(client)
									return client.name == "null-ls"
								end,
								bufnr = bufnr,
							})
						end,
					})
				end
			end,
		})
	end,
}
