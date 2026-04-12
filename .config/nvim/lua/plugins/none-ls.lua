return {
	"nvimtools/none-ls.nvim",
	event = { "BufReadPre", "BufNewFile" },
	config = function()
		local none_ls = require("null-ls")

		none_ls.setup({
			sources = {
				-- Django/Jinja template linting
				none_ls.builtins.diagnostics.djlint.with({
					filetypes = { "htmldjango", "jinja", "jinja.html" },
				}),

				-- PMD diagnostics for Apex (PMD v7)
				-- Skip files over 10k lines to avoid "Script too large" errors
				none_ls.builtins.diagnostics.pmd.with({
					command = "pmd",
					filetypes = { "apex" },
					runtime_condition = function(params)
						return vim.api.nvim_buf_line_count(params.bufnr) <= 10000
					end,
					args = function(params)
						return {
							"check",
							"-f",
							"json",
							"-R",
							vim.fn.expand("~/.config/apex/apex_ruleset.xml"),
							"--no-cache",
							"--no-progress",
							"-d",
							params.bufname,
						}
					end,
				}),
			},
		})
	end,
}
