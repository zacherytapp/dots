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
			prettierd = {
				timeout_ms = 5000,
			},
		},
		formatters_by_ft = {
			javascript = { "prettierd" },
			javascriptreact = { "prettierd" },
			typescript = { "prettierd" },
			typescriptreact = { "prettierd" },
			-- markdown intentionally excluded - prose shouldn't be auto-formatted
			svelte = { "prettierd" },
			astro = { "prettierd" },
			json = { "prettierd" },
			jsonc = { "prettierd" },
			html = { "prettierd" },
			yaml = { "prettierd" },
			css = { "stylelint", "prettierd" },
			scss = { "prettierd" },
			less = { "prettierd" },
			sh = { "shellcheck", "shfmt" },
			terraform = { "terraform_fmt" },
			["terraform-vars"] = { "terraform_fmt" },
			go = { "goimports", "gofumpt" },
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
			htmldjango = { "djlint" },
			jinja = { "djlint" },
			toml = { "taplo" },
			nix = { "alejandra" },
			apex = { "prettierd" },
		},
		format_on_save = {
			lsp_format = "fallback",
			timeout_ms = 5000,
		},
	},
}
