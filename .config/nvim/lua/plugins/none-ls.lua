return {
	"nvimtools/none-ls.nvim",
	cmd = { "LspInfo", "LspInstall", "LspStart" },
	dependencies = {
		"mason.nvim",
		"jay-babu/mason-null-ls.nvim",
	},
	event = { "BufReadPre", "BufNewFile" },
	config = function()
		local null_ls = require("null-ls")
		local default_apex_ruleset = vim.env.HOME .. "/.config/rules/apex.xml"
		local mason_null_ls = require("mason-null-ls")
		mason_null_ls.setup({
			ensure_installed = {
				"prettier",
				"stylua",
				"eslint_d",
			},
		})
		local formatting = null_ls.builtins.formatting
		local diagnostics = null_ls.builtins.diagnostics
		local augroup = vim.api.nvim_create_augroup("LspFormatting", {})
		null_ls.setup({
			sources = {
				null_ls.builtins.code_actions.gitsigns,
				null_ls.builtins.diagnostics.actionlint,
				null_ls.builtins.diagnostics.gitlint,
				null_ls.builtins.diagnostics.markdownlint,
				formatting.prettier.with({
					extra_filetypes = {
						"apex",
						"html",
					},
				}),
				formatting.sql_formatter.with({ -- install with Mason or npm -g (see https://github.com/sql-formatter-org/sql-formatter#readme)
					extra_args = { "--config", '{"language": "postgresql", "tabWidth": 2, "keywordCase": "upper"}' },
				}),
				formatting.stylua,
				diagnostics.pmd.with({
					filetypes = { "apex" },
					args = function(params)
						local project_apex_ruleset = params.cwd .. "/rules/apex.xml"
						local ruleset
						if vim.fn.filereadable(project_apex_ruleset) == 1 then
							ruleset = project_apex_ruleset
						else
							ruleset = default_apex_ruleset
						end
						return {
							"--format",
							"json",
							"--dir",
							vim.api.nvim_buf_get_name(params.bufnr),
							"--rulesets",
							ruleset,
							"--no-cache",
							"--no-progress",
						}
					end,
					timeout = 10000,
				}),
			},
			null_ls.builtins.diagnostics.trail_space,
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
