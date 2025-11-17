local icons = {
	hint = "󰌶",
	error = " ",
	warning = " ",
	info = " ",
}

return {
	{
		"nvimtools/none-ls.nvim",
		cmd = { "LspInfo", "LspInstall", "LspStart" },
		event = { "BufReadPre", "BufNewFile" },
		dependencies = {
			"nvim-lua/plenary.nvim",
		},
		config = function()
			local default_apex_ruleset = vim.env.HOME .. "/.config/pmd/apex.xml"
			local null_ls = require("null-ls")
			local mason_null_ls = require("mason-null-ls")
			mason_null_ls.setup({
				ensure_installed = {
					"stylua",
					"eslint_d",
				},
			})
			local diagnostics = null_ls.builtins.diagnostics
			local augroup = vim.api.nvim_create_augroup("LspFormatting", {})
			null_ls.setup({
				sources = {
					null_ls.builtins.diagnostics.actionlint,
					null_ls.builtins.diagnostics.gitlint,
					null_ls.builtins.diagnostics.golangci_lint,
					null_ls.builtins.code_actions.gitsigns,
					null_ls.builtins.diagnostics.markdownlint,
					diagnostics.pmd.with({

						filetypes = { "apex" },

						args = function(params)
							local project_apex_ruleset = params.cwd .. "/pmd/rulesets/apex.xml"
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
				null_ls.builtins.formatting.golines,
				null_ls.builtins.formatting.goimports_reviser,
				null_ls.builtins.formatting.isort,
				null_ls.builtins.formatting.prettier.with({
					timeout = -1,
					extra_filetypes = { "apex" },
				}),
				null_ls.builtins.formatting.shfmt.with({
					extra_args = {
						"--indent",
						2,
						"--case-indent",
					},
				}),
				null_ls.builtins.formatting.stylua,
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
									timeout_ms = 3000, -- add because apex prettier formatting is slow
								})
							end,
						})
					end
				end,
			})
		end,
	},
	{
		"jay-babu/mason-null-ls.nvim",
		event = { "BufReadPre", "BufNewFile" },
		dependencies = {
			"williamboman/mason.nvim",
			"nvimtools/none-ls.nvim",
		},
		opts = {
			ensure_installed = nil,
			automatic_installation = true,
		},
	},
}
