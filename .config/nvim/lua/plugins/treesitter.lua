return {
	{
		{
			"nvim-treesitter/nvim-treesitter-context",
			event = { "BufReadPost", "BufNewFile" },
			dependencies = { "nvim-treesitter/nvim-treesitter" },
			opts = {
				max_lines = 3,
				separator = "─",
			},
			keys = {
				{ "<leader>ut", "<cmd>TSContextToggle<CR>", desc = "Toggle treesitter context" },
			},
		},
		{
			"nvim-treesitter/nvim-treesitter",
			build = ":TSUpdate",
			version = false,
			lazy = false,
			dependencies = {
				"nvim-treesitter/nvim-treesitter-textobjects",
			},
			config = function()
				local parsers = {
					"sflog",
					"apex",
					"soql",
					"sosl",
					"html",
					"bash",
					"css",
					"lua",
					"java",
					"javascript",
					"json",
					"json5",
					"make",
					"markdown",
					"markdown_inline",
					"typescript",
					"tsx",
					"python",
					"go",
					"yaml",
					"gotmpl",
					"gitignore",
					"dockerfile",
					"vim",
					"xml",
					"toml",
					"ninja",
				"svelte",
				"jsdoc",
				"hcl",
				"terraform",
				}

				local ts = require("nvim-treesitter")
				local installed = ts.get_installed()
				local to_install = vim.tbl_filter(function(p)
					return not vim.list_contains(installed, p)
				end, parsers)
				if #to_install > 0 then
					ts.install(to_install)
				end

				-- Enable treesitter highlighting and indentation for all filetypes with a parser
				vim.api.nvim_create_autocmd("FileType", {
					callback = function()
						pcall(vim.treesitter.start)
						vim.bo.indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
					end,
				})

				vim.treesitter.language.register("html", "tmpl")
				vim.treesitter.language.register("json", "jsonc")
				vim.treesitter.language.register("hcl", "terraform-vars")
				vim.treesitter.language.register("bash", "dotenv")
			end,
		},
	},
	{
		"nvim-treesitter/nvim-treesitter-textobjects",
		branch = "main",
		lazy = true,
		config = function()
			-- Configure behavior options
			require("nvim-treesitter-textobjects").setup({
				select = {
					lookahead = true,
				},
				move = {
					set_jumps = true,
				},
			})

			local select = require("nvim-treesitter-textobjects.select")
			local swap = require("nvim-treesitter-textobjects.swap")
			local move = require("nvim-treesitter-textobjects.move")

			-- Textobject select keymaps
			local select_keymaps = {
				["a="] = { "@assignment.outer", "Select outer part of an assignment" },
				["i="] = { "@assignment.inner", "Select inner part of an assignment" },
				["l="] = { "@assignment.lhs", "Select left-hand side of an assignment" },
				["r="] = { "@assignment.rhs", "Select right-hand side of an assignment" },
				["aa"] = { "@parameter.outer", "Select outer part of a parameter/argument" },
				["ia"] = { "@parameter.inner", "Select inner part of a parameter/argument" },
				["ai"] = { "@conditional.outer", "Select outer part of a conditional (if)" },
				["ii"] = { "@conditional.inner", "Select inner part of a conditional (if)" },
				["al"] = { "@loop.outer", "Select outer part of a loop" },
				["il"] = { "@loop.inner", "Select inner part of a loop" },
				["af"] = { "@call.outer", "Select outer part of a function call" },
				["if"] = { "@call.inner", "Select inner part of a function call" },
				["am"] = { "@function.outer", "Select outer part of a method/function definition" },
				["im"] = { "@function.inner", "Select inner part of a method/function definition" },
				["ac"] = { "@class.outer", "Select outer part of a class" },
				["ic"] = { "@class.inner", "Select inner part of a class" },
			}
			for key, val in pairs(select_keymaps) do
				vim.keymap.set({ "x", "o" }, key, function()
					select.select_textobject(val[1])
				end, { desc = val[2] })
			end

			-- Swap keymaps
			local swap_next = {
				["<leader>na"] = { "@parameter.inner", "Swap parameters/argument with next" },
				["<leader>n:"] = { "@property.outer", "Swap object property with next" },
				["<leader>nm"] = { "@function.outer", "Swap function with next" },
			}
			for key, val in pairs(swap_next) do
				vim.keymap.set("n", key, function()
					swap.swap_next(val[1])
				end, { desc = val[2] })
			end
			local swap_prev = {
				["<leader>pa"] = { "@parameter.inner", "Swap parameters/argument with prev" },
				["<leader>p:"] = { "@property.outer", "Swap object property with prev" },
				["<leader>pm"] = { "@function.outer", "Swap function with previous" },
			}
			for key, val in pairs(swap_prev) do
				vim.keymap.set("n", key, function()
					swap.swap_previous(val[1])
				end, { desc = val[2] })
			end

			-- Move keymaps
			local move_next_start = {
				["]f"] = { "@call.outer", "Next function call start" },
				["]m"] = { "@function.outer", "Next method/function def start" },
				["]k"] = { "@class.outer", "Next class start" },
				["]i"] = { "@conditional.outer", "Next conditional start" },
				["]l"] = { "@loop.outer", "Next loop start" },
			}
			for key, val in pairs(move_next_start) do
				vim.keymap.set({ "n", "x", "o" }, key, function()
					move.goto_next_start(val[1])
				end, { desc = val[2] })
			end

			local move_next_end = {
				["]F"] = { "@call.outer", "Next function call end" },
				["]M"] = { "@function.outer", "Next method/function def end" },
				["]K"] = { "@class.outer", "Next class end" },
				["]I"] = { "@conditional.outer", "Next conditional end" },
				["]L"] = { "@loop.outer", "Next loop end" },
			}
			for key, val in pairs(move_next_end) do
				vim.keymap.set({ "n", "x", "o" }, key, function()
					move.goto_next_end(val[1])
				end, { desc = val[2] })
			end

			local move_prev_start = {
				["[f"] = { "@call.outer", "Prev function call start" },
				["[m"] = { "@function.outer", "Prev method/function def start" },
				["[k"] = { "@class.outer", "Prev class start" },
				["[i"] = { "@conditional.outer", "Prev conditional start" },
				["[l"] = { "@loop.outer", "Prev loop start" },
			}
			for key, val in pairs(move_prev_start) do
				vim.keymap.set({ "n", "x", "o" }, key, function()
					move.goto_previous_start(val[1])
				end, { desc = val[2] })
			end

			local move_prev_end = {
				["[F"] = { "@call.outer", "Prev function call end" },
				["[M"] = { "@function.outer", "Prev method/function def end" },
				["[K"] = { "@class.outer", "Prev class end" },
				["[I"] = { "@conditional.outer", "Prev conditional end" },
				["[L"] = { "@loop.outer", "Prev loop end" },
			}
			for key, val in pairs(move_prev_end) do
				vim.keymap.set({ "n", "x", "o" }, key, function()
					move.goto_previous_end(val[1])
				end, { desc = val[2] })
			end
		end,
	},
}
