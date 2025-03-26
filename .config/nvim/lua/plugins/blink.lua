return {
	{
		"saghen/blink.nvim",
		build = "cargo build --release",
		keys = {
			{
				";",
				function()
					require("blink.chartoggle").toggle_char_eol(";")
				end,
				mode = { "n", "v" },
				desc = "Toggle ; at eol",
			},
			{
				",",
				function()
					require("blink.chartoggle").toggle_char_eol(",")
				end,
				mode = { "n", "v" },
				desc = "Toggle , at eol",
			},

			{ "<C-e>", "<cmd>BlinkTree reveal<cr>", desc = "Reveal current file in tree" },
			{ "<leader>E", "<cmd>BlinkTree toggle<cr>", desc = "Reveal current file in tree" },
			{ "<leader>e", "<cmd>BlinkTree toggle-focus<cr>", desc = "Toggle file tree focus" },
		},

		lazy = false,
		opts = {
			chartoggle = { enabled = true },
			indent = { enabled = true },
			tree = { enabled = true },
			cmp = { enabled = true },
		},
	},
	{

		"saghen/blink.cmp",
		dependencies = { "rafamadriz/friendly-snippets" },

		version = "1.*",
		opts = {
			signature = {
				enabled = true,
			},

			appearance = {
				nerd_font_variant = "mono",
				use_nvim_cmp_as_default = false,
			},

			completion = {
				accept = {
					auto_brackets = {
						enabled = true,
					},
				},
				menu = {
					draw = {
						treesitter = { "lsp" },
					},
				},
				documentation = {
					auto_show = true,
					auto_show_delay_ms = 200,
				},
				ghost_text = {
					enabled = vim.g.ai_cmp,
				},
			},

			sources = {
				default = { "lsp", "path", "snippets", "buffer" },
			},

			fuzzy = { implementation = "prefer_rust_with_warning" },
			keymap = {
				preset = "enter",
				["<C-y>"] = { "select_and_accept" },
				["<Tab>"] = { "select_next", "fallback" },
				["<S-Tab>"] = { "select_prev", "fallback" },
			},
		},
		opts_extend = { "sources.default" },
	},
}
