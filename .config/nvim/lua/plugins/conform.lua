return {
	"stevearc/conform.nvim",
	event = { "BufReadPre", "BufNewFile" },
	cmd = { "ConformInfo" },
	opts = {
		formatters_by_ft = {
			lua = { "stylua" },
			javascript = { "prettierd" },
			typescript = { "prettierd" },
			apex = { "prettier" },
			json = { "prettierd" },
			yaml = { "prettierd" },
			python = { "black" },
			markdown = { "prettierd" },
			tmpl = { "tmpl" },
			go = { "goimports", "gofmt" },
			html = { "prettierd" },
		},
		format_on_save = {
			timeout_ms = 500,
			lsp_format = "fallback",
		},
	},
}
