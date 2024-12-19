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
		mason_null_ls.setup({
			ensure_installed = {
				"prettier",
				"stylua",
				"eslint_d",
				"pyright",
			},
		})
		local formatting = null_ls.builtins.formatting
		local diagnostics = null_ls.builtins.diagnostics
		local augroup = vim.api.nvim_create_augroup("LspFormatting", {})
		null_ls.setup({
			sources = {
				formatting.prettier.with({
					extra_filetypes = {
						"apex",
					},
				}),
				formatting.sql_formatter.with({ -- install with Mason or npm -g (see https://github.com/sql-formatter-org/sql-formatter#readme)
					extra_args = { "--config", '{"language": "postgresql", "tabWidth": 2, "keywordCase": "upper"}' },
				}),
				formatting.stylua,
				diagnostics.pmd.with({
					filetypes = { "apex" },
					args = function(params)
						return {
							"check",
							"--format",
							"json",
							"--rulesets",
							"/home/zakk/.config/rules/apex_ruleset.xml",
							"--dir",
							params.bufname,
							"--cache",
							vim.fn.stdpath("cache") .. "/pmd-cache",
							"--no-progress",
						}
					end,
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
									--  only use null-ls for formatting instead of lsp server
									return client.name == "null-ls"
								end,
								bufnr = bufnr,
								timeout_ms = 3000, -- add because apex prettier formatting is slow
							})
						end,
					})
				end
			end,
		})
	end,
}
