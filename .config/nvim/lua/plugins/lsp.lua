local icons = {
	hint = "󰌶",
	error = " ",
	warning = " ",
	info = " ",
}

return {
	{
		"neovim/nvim-lspconfig",
		dependencies = {
			"saghen/blink.cmp",
		},
		config = function()
			local capabilities = require("blink.cmp").get_lsp_capabilities()

			-- Default on_attach function
			local on_attach = function(client, bufnr)
				vim.bo[bufnr].omnifunc = "v:lua.vim.lsp.omnifunc"
			end

			-- Table of LSP servers to configure
			local servers = {
				lua_ls = {},
				gopls = {},
				jsonls = {},
				yamlls = {},
				html = {},
				pyright = {},
				djlsp = {},
				jinja_lsp = {},
				tailwindcss = {},
				svelte = {},
				vtsls = {},
				eslint = {
					on_attach = function(client, bufnr)
						on_attach(client, bufnr)
						-- Define LspEslintFixAll command (normally created by nvim-lspconfig's
						-- built-in on_attach, which we override in the loop below)
						vim.api.nvim_buf_create_user_command(bufnr, "LspEslintFixAll", function()
							client:request("workspace/executeCommand", {
								command = "eslint.applyAllFixes",
								arguments = {
									{
										uri = vim.uri_from_bufnr(bufnr),
										version = vim.lsp.util.buf_versions
												and vim.lsp.util.buf_versions[bufnr]
											or 0,
									},
								},
							})
						end, { desc = "Fix all ESLint issues in buffer" })
						-- Auto-fix ESLint issues on save
						vim.api.nvim_create_autocmd("BufWritePre", {
							buffer = bufnr,
							command = "LspEslintFixAll",
						})
					end,
				},
				terraformls = {},
				ctags_lsp = {},
				apex_ls = {
					on_attach = function(client, bufnr)
						on_attach(client, bufnr)
						vim.notify("Apex LSP attached to buffer " .. bufnr, vim.log.levels.INFO)
					end,
				},
				lwc_ls = {},
				visualforce_ls = {},
			}

			-- Setup all LSP servers with error handling
			for server_name, custom_opts in pairs(servers) do
				local ok, config = pcall(require, "lsp." .. server_name)
				if ok then
					-- Add capabilities and on_attach
					config.capabilities = capabilities
					config.on_attach = custom_opts.on_attach or on_attach

					-- Use new vim.lsp.config API
					vim.lsp.config(server_name, config)
				else
					vim.notify("LSP config not found: " .. server_name, vim.log.levels.WARN)
				end
			end

			-- Enable all configured LSP servers
			local server_names = {}
			for server_name, _ in pairs(servers) do
				table.insert(server_names, server_name)
			end
			vim.schedule(function()
				vim.lsp.enable(server_names)
			end)

			-- Ensure Apex LSP starts for apex files (fallback autocmd)
			vim.api.nvim_create_autocmd("FileType", {
				pattern = "apex",
				callback = function(args)
					-- Check if LSP is already attached
					local clients = vim.lsp.get_clients({ bufnr = args.buf })
					local has_apex_ls = false
					for _, client in ipairs(clients) do
						if client.name == "apex_ls" then
							has_apex_ls = true
							break
						end
					end

					-- If not attached, try to start it manually
					if not has_apex_ls then
						vim.schedule(function()
							local bufname = vim.api.nvim_buf_get_name(args.buf)
							local root_dir = vim.fs.root(bufname, { "sfdx-project.json", ".git" })

							-- Only start if we found a root directory
							if root_dir then
								local apex_config = require("lsp.apex_ls")
								vim.lsp.start({
									name = "apex_ls",
									cmd = apex_config.cmd,
									root_dir = root_dir,
									capabilities = capabilities,
									on_attach = servers.apex_ls.on_attach or on_attach,
									init_options = apex_config.init_options,
									settings = apex_config.settings,
								})
							end
						end)
					end
				end,
			})

			-- Diagnostic configuration
			vim.diagnostic.config({
				virtual_text = {
					prefix = "●",
					source = "if_many",
				},
				signs = {
					text = {
						[vim.diagnostic.severity.ERROR] = icons.error,
						[vim.diagnostic.severity.WARN] = icons.warning,
						[vim.diagnostic.severity.HINT] = icons.hint,
						[vim.diagnostic.severity.INFO] = icons.info,
					},
				},
				underline = true,
				update_in_insert = false,
				severity_sort = true,
				float = {
					border = "rounded",
					source = true,
				},
			})
		end,
	},
	{
		"b0o/schemastore.nvim",
	},
	{
		"L3MON4D3/LuaSnip",
		version = "v2.*",
		lazy = true,
		dependencies = {
			"rafamadriz/friendly-snippets",
		},
		config = function()
			require("luasnip.loaders.from_lua").lazy_load({ paths = { "./snippets" } })
			require("luasnip.loaders.from_vscode").lazy_load()
			require("luasnip").setup({ enable_autosnippets = true })
		end,
		commander = {
			{
				keys = { { "i", "s" }, "<C-E>", { silent = true } },
				cmd = function()
					if require("luasnip").choice_active() then
						require("luasnip").change_choice(1)
					end
				end,
				desc = "LuaSnip: Next Choice",
				show = false,
			},
		},
	},
	{
		"vuki656/package-info.nvim",
		config = true,
	},
	{
		"folke/lazydev.nvim",
		ft = "lua", -- only load on lua files
		opts = {
			library = {
				{ path = "${3rd}/luv/library", words = { "vim%.uv" } },
			},
		},
	},
	{
		"mason-org/mason.nvim",
		opts = {},
		config = function(_, opts)
			require("mason").setup(opts)

			local ensure_installed = {
				"lua-language-server",
				"gopls",
				"pyright",
				"json-lsp",
				"yaml-language-server",
				"html-lsp",
				"tailwindcss-language-server",
				"prettierd",
				"stylua",
				"ruff",
				"djlint",
				"shfmt",
				"shellcheck",
				"svelte-language-server",
				"vtsls",
				"eslint-lsp",
				"terraform-ls",
				"tflint",
				"goimports",
				"gofumpt",
				"golangci-lint",
				"gomodifytags",
				"impl",
				"gotests",
			}

			local registry = require("mason-registry")
			for _, name in ipairs(ensure_installed) do
				local ok, pkg = pcall(registry.get_package, name)
				if ok and not pkg:is_installed() then
					pkg:install()
				end
			end
		end,
	},
	{
		"folke/trouble.nvim",
		opts = {},
		cmd = "Trouble",
		commander = {
			{
				keys = { "n", "<leader>xx" },
				cmd = "<cmd>Telescope diagnostics<cr>",
				desc = "Telescope: Workspace diagnostics",
			},
			{
				keys = { "n", "<leader>xX" },
				cmd = "<cmd>Telescope diagnostics bufnr=0<cr>",
				desc = "Telescope: Buffer diagnostics",
			},
			{
				keys = { "n", "<leader>cs" },
				cmd = "<cmd>Trouble symbols toggle focus=false<cr>",
				desc = "Trouble: Toggle symbols",
			},
			{
				keys = { "n", "<leader>cl" },
				cmd = "<cmd>Trouble lsp toggle focus=false win.position=right<cr>",
				desc = "Trouble: Toggle LSP",
			},
			{
				keys = { "n", "<leader>xL" },
				cmd = "<cmd>Trouble loclist toggle<cr>",
				desc = "Trouble: Toggle location list",
			},
			{
				keys = { "n", "<leader>xQ" },
				cmd = "<cmd>Trouble qflist toggle<cr>",
				desc = "Trouble: Toggle quickfix list",
			},
		},
	},
}
