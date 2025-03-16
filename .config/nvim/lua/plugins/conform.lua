return {
	"stevearc/conform.nvim",
	event = { "BufReadPre", "BufNewFile" },
	cmd = { "ConformInfo" },
	opts = {
		formatters_by_ft = {
			lua = { "stylua" },
			javascript = { "prettierd" },
			typescript = { "prettierd" },
			apex = { "prettierd", "prettier" },
			bash = { "shfmt" },
			zsh = { "shfmt" },
			sh = { "shfmt" },
			json = { "prettierd" },
			yaml = { "prettierd" },
			python = function(bufnr)
				if require("conform").get_formatter_info("ruff_format", bufnr).available then
					return { "ruff_format" }
				else
					return { "isort", "black" }
				end
			end,
			markdown = { "prettierd" },
			tmpl = { "tmpl" },
			go = { "goimports", "gofmt" },
			html = { "prettierd" },
			templ = {
				"templ",
				"injected",
			},
		},
		format_on_save = {
			timeout_ms = 500,
			lsp_format = "fallback",
		},
	},
}
