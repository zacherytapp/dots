return {
	"nvim-treesitter/nvim-treesitter",
	dependencies = {
		"nvim-treesitter/nvim-treesitter-textobjects",
	},
	build = ":TSUpdate",
	config = function()
		local configs = require("nvim-treesitter.configs")
		configs.setup({
			ensure_installed = {
				"apex",
				"rust",
				"soql",
				"sosl",
				"bash",
				"html",
				"go",
				"javascript",
				"json",
				"lua",
				"markdown",
				"markdown_inline",
				"python",
				"query",
				"regex",
				"tsx",
				"typescript",
				"vim",
				"yaml",
				"templ",
			},

			sync_install = true,
			auto_install = true,
			ignore_install = {},
			indent = {
				enable = true,
			},

			highlight = {
				enable = true,
				additional_vim_regex_highlighting = false,
			},

			textobjects = {
				select = {
					enable = true,
					lookahead = true,

					keymaps = {
						["a="] = { query = "@assignment.outer", desc = "ts: outer assignment" },
						["i="] = { query = "@assignment.inner", desc = "ts: inner ssignment" },
						["l="] = { query = "@assignment.lhs", desc = "ts: left assignment" },
						["r="] = { query = "@assignment.rhs", desc = "ts: right assignment" },

						["aa"] = { query = "@parameter.outer", desc = "ts: outer parameter" },
						["ia"] = { query = "@parameter.inner", desc = "ts: inner parameter" },

						["ai"] = { query = "@conditional.outer", desc = "ts: outer conditional" },
						["ii"] = { query = "@conditional.inner", desc = "ts: inner conditional" },

						["al"] = { query = "@loop.outer", desc = "ts: outer loop" },
						["il"] = { query = "@loop.inner", desc = "ts: inner loop" },

						["af"] = { query = "@call.outer", desc = "ts: outer function-call" },
						["if"] = { query = "@call.inner", desc = "ts: inner function-call" },

						["am"] = { query = "@function.outer", desc = "ts: outer definition method/function" },
						["im"] = { query = "@function.inner", desc = "ts: inner definition method/function" },

						["ac"] = { query = "@class.outer", desc = "ts: outer class" },
						["ic"] = { query = "@class.inner", desc = "ts: inner class" },
					},
				},

				move = {
					enable = true,
					set_jumps = true, -- whether to set jumps in the jumplist
					goto_next_start = {
						["]f"] = { query = "@call.outer", desc = "ts: next call method/function start" },
						["]m"] = { query = "@function.outer", desc = "ts: next def method/function start" },
						["]c"] = { query = "@class.outer", desc = "ts: next class start" },
						["]i"] = { query = "@conditional.outer", desc = "ts: next conditional start" },
						["]l"] = { query = "@loop.outer", desc = "next loop start" },

						["]s"] = { query = "@scope", query_group = "locals", desc = "Next scope" },
						["]z"] = { query = "@fold", query_group = "folds", desc = "Next fold" },
					},
					goto_next_end = {
						["]F"] = { query = "@call.outer", desc = "ts: next call method/function end" },
						["]M"] = { query = "@function.outer", desc = "ts: next def method/function end" },
						["]C"] = { query = "@class.outer", desc = "ts: next class end" },
						["]I"] = { query = "@conditional.outer", desc = "ts: next conditional end" },
						["]L"] = { query = "@loop.outer", desc = "ts: next loop end" },
					},
					goto_previous_start = {
						["[f"] = { query = "@call.outer", desc = "ts: prev call method/function start" },
						["[m"] = { query = "@function.outer", desc = "ts: prev def method/function start" },
						["[c"] = { query = "@class.outer", desc = "ts: prev class start" },
						["[i"] = { query = "@conditional.outer", desc = "ts: prev conditional start" },
						["[l"] = { query = "@loop.outer", desc = "ts: prev loop start" },
					},
					goto_previous_end = {
						["[F"] = { query = "@call.outer", desc = "ts: prev call method/function end" },
						["[M"] = { query = "@function.outer", desc = "ts: prev def method/function end" },
						["[C"] = { query = "@class.outer", desc = "ts: prev class end" },
						["[I"] = { query = "@conditional.outer", desc = "ts: prev conditional end" },
						["[L"] = { query = "@loop.outer", desc = "ts: prev loop end" },
					},
				},

				swap = {
					enable = true,
					swap_next = {
						["<leader>na"] = "@parameter.inner",
						["<leader>nm"] = "@function.outer",
					},
					swap_previous = {
						["<leader>pa"] = "@parameter.inner",
						["<leader>pm"] = "@function.outer",
						["<leader>p:"] = "@property.outer",
					},
				},
			},
		})

		local ts_repeat_move = require("nvim-treesitter.textobjects.repeatable_move")

		-- vim way: ; goes to the direction you were moving.
		vim.keymap.set({ "n", "x", "o" }, ";", ts_repeat_move.repeat_last_move)
		vim.keymap.set({ "n", "x", "o" }, ",", ts_repeat_move.repeat_last_move_opposite)
	end,
}
