return {
	"stevearc/conform.nvim",
	event = { "BufReadPre", "BufNewFile" },
	cmd = { "ConformInfo" },
	opts = {
		formatters = {
			caddy = {
				command = "caddy",
				args = { "fmt", "-" },
				stdin = true,
			},
		},
		formatters_by_ft = {
			lua = { "stylua" },
			javascript = { "prettierd" },
			typescript = { "prettierd" },
			apex = { "prettierd" },
			bash = { "shfmt" },
			shell = { "shfmt" },
			zsh = { "shfmt" },
			go = { "gofmt" },
			caddy = { "caddy" },
			sh = { "shfmt" },
			json = { "prettierd" },
			yaml = { "prettierd" },
			markdown = { "prettierd" },
			python = function(bufnr)
				if require("conform").get_formatter_info("ruff_format", bufnr).available then
					return { "ruff_format" }
				else
					return { "isort", "black" }
				end
			end,
		},
		format_on_save = {
			timeout_ms = 500,
			lsp_format = "fallback",
		},
	},
}
