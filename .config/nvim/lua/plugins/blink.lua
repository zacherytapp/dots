return {
	{

		"saghen/blink.cmp",
		dependencies = {
			"rafamadriz/friendly-snippets",
			{ "L3MON4D3/LuaSnip", version = "v2.*" },
		},

		version = "1.*",
		opts = {
			snippets = { preset = "luasnip" },
			signature = {
				enabled = true,
				window = {
					border = "rounded",
				},
			},

			appearance = {
				nerd_font_variant = "mono",
				use_nvim_cmp_as_default = false,
			},

			completion = {
				-- Trigger completion automatically
				trigger = {
					prefetch_on_insert = true,
					show_in_snippet = true,
					show_on_keyword = true,
					show_on_trigger_character = true,
					show_on_insert_on_trigger_character = true,
					show_on_accept_on_trigger_character = false,
					-- Re-show completions when backspacing into a keyword (e.g. delete a char, keep typing)
					show_on_backspace_in_keyword = true,
					show_on_insert = true,
					-- Unblock " and { for JSON filetypes — jsonls uses " as its
					-- primary trigger character for property name completions
					show_on_x_blocked_trigger_characters = function()
						local ft = vim.bo.filetype
						if ft == "json" or ft == "jsonc" then
							return {}
						end
						return { "'", '"', "(" }
					end,
				},
				accept = {
					auto_brackets = {
						enabled = true,
						blocked_filetypes = { "go", "gomod", "gowork", "gotmpl" },
					},
				},
				list = {
					selection = {
						preselect = true,
						auto_insert = true,
					},
				},
				menu = {
					auto_show = true,
					border = "rounded",
					draw = {
						treesitter = { "lsp" },
						columns = {
							{ "kind_icon" },
							{ "label", "label_description", gap = 1 },
							{ "kind" },
						},
						components = {
							kind_icon = {
								text = function(ctx)
									local kind_icon, _, _ = require("mini.icons").get("lsp", ctx.kind)
									return kind_icon
								end,
								highlight = function(ctx)
									local _, hl, _ = require("mini.icons").get("lsp", ctx.kind)
									return hl
								end,
							},
							kind = {
								width = { fill = true },
								highlight = function(ctx)
									local _, hl, _ = require("mini.icons").get("lsp", ctx.kind)
									return hl
								end,
							},
							label_description = {
								width = { max = 30 },
								highlight = "BlinkCmpLabelDescription",
							},
						},
					},
				},
				documentation = {
					auto_show = true,
					auto_show_delay_ms = 200,
					window = {
						border = "rounded",
					},
				},
				ghost_text = {
					enabled = vim.g.ai_cmp,
				},
			},

			sources = {
				default = { "lazydev", "lsp", "path", "snippets", "buffer" },
				per_filetype = {
					json = { "lsp", "path" },
					jsonc = { "lsp", "path" },
				},
				providers = {
					lazydev = {
						name = "LazyDev",
						module = "lazydev.integrations.blink",
						score_offset = 100,
					},
					lsp = {
						fallbacks = {},
						-- Higher timeout for slower LSPs (e.g. Apex jorje JAR)
						timeout_ms = 8000,
						-- Avoid overwhelming the fuzzy matcher with huge result sets
						max_items = 100,
						async = true,
						-- Bridge LSP detail → inline label_description and documentation
						-- Many LSPs (e.g. Apex jorje) put type info in `detail` but leave
						-- `labelDetails.description` empty, so blink's inline display is blank
						transform_items = function(_, items)
							for _, item in ipairs(items) do
								-- Surface type info inline in the completion menu
								if item.detail and type(item.detail) == "string" and item.detail ~= "" then
									item.labelDetails = item.labelDetails or {}
									if not item.labelDetails.description or item.labelDetails.description == "" then
										item.labelDetails.description = item.detail
									end
								end
								-- Ensure the documentation window has content
								if not item.documentation and item.detail and type(item.detail) == "string" then
									item.documentation = {
										kind = "markdown",
										value = "```\n" .. item.detail .. "\n```",
									}
								end
							end
							return items
						end,
					},
					buffer = {
						score_offset = -1,
					},
				},
			},

			fuzzy = { implementation = "prefer_rust_with_warning" },
			keymap = {
				preset = "default",
				["<C-y>"] = { "show", "show_documentation", "hide_documentation" },
				["<C-e>"] = { "hide", "fallback" },
				["<CR>"] = { "accept", "fallback" },
				["<Tab>"] = { "snippet_forward", "select_next", "fallback" },
				["<S-Tab>"] = { "snippet_backward", "select_prev", "fallback" },
				["<Up>"] = { "select_prev", "fallback" },
				["<Down>"] = { "select_next", "fallback" },
				["<C-p>"] = { "select_prev", "fallback" },
				["<C-n>"] = { "select_next", "fallback" },
				["<C-u>"] = { "scroll_documentation_up", "fallback" },
				["<C-d>"] = { "scroll_documentation_down", "fallback" },
			},
		},
		opts_extend = { "sources.default" },
	},
}
