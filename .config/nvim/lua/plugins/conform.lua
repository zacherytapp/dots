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
			terraform = { "terraform_fmt" },
			go = { "gofmt", "goimports" },
			lua = { "stylua" },
			ruby = { "rubocop" },
			php = { "pint" },
			python = function(bufnr)
				if require("conform").get_formatter_info("ruff_format", bufnr).available then
					return { "ruff_format" }
				else
					return { "isort", "black" }
				end
			end,
		},
		format_on_save = {
			lsp_format = "fallback",
			timeout_ms = 1000,
		},
	},
}
