return {
	-- Test coverage
	{
		"andythigpen/nvim-coverage",
		dependencies = { "nvim-lua/plenary.nvim" },
		ft = { "go" },
		keys = {
			{ "<leader>tc", "<cmd>CoverageToggle<cr>", desc = "Test: Toggle coverage" },
			{
				"<leader>tC",
				function()
					require("coverage").load(true)
				end,
				desc = "Test: Load coverage",
			},
		},
		opts = {
			auto_reload = true,
			lang = {
				go = {
					coverage_file = vim.fn.getcwd() .. "/coverage.out",
				},
			},
		},
	},

	-- Go helpers: struct tags, interface impl, iferr, test generation
	{
		"olexsmir/gopher.nvim",
		ft = { "go" },
		dependencies = {
			"nvim-treesitter/nvim-treesitter",
		},
		build = function()
			if not require("lazy.core.config").spec.plugins["mason.nvim"] then
				vim.print("Installing Go tools...")
				vim.cmd.GoInstallDeps()
			end
		end,
		keys = {
			{ "<leader>gta", "<cmd>GoTagAdd json<cr>", desc = "Go: Add json tags", ft = "go" },
			{ "<leader>gtr", "<cmd>GoTagRm json<cr>", desc = "Go: Remove json tags", ft = "go" },
			{ "<leader>gie", "<cmd>GoIfErr<cr>", desc = "Go: Generate if err", ft = "go" },
			{
				"<leader>gi",
				function()
					local interface = vim.fn.input("Interface: ")
					if interface ~= "" then
						vim.cmd("GoImpl " .. interface)
					end
				end,
				desc = "Go: Implement interface",
				ft = "go",
			},
			{ "<leader>gg", "<cmd>GoTestAdd<cr>", desc = "Go: Generate test for function", ft = "go" },
			{ "<leader>gG", "<cmd>GoTestsAll<cr>", desc = "Go: Generate all tests", ft = "go" },
		},
		opts = {},
	},

	-- Linting with golangci-lint
	{
		"mfussenegger/nvim-lint",
		event = { "BufReadPre", "BufNewFile" },
		config = function()
			local lint = require("lint")
			lint.linters_by_ft = {
				go = { "golangcilint" },
			}

			vim.api.nvim_create_autocmd({ "BufWritePost", "InsertLeave" }, {
				group = vim.api.nvim_create_augroup("nvim-lint", { clear = true }),
				callback = function()
					lint.try_lint()
				end,
			})
		end,
	},
}
