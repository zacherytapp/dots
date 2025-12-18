return {
	{
		"ellisonleao/gruvbox.nvim",
		priority = 1000,
		config = true,
		opts = {
			terminal_colors = true,
			undercurl = true,
			underline = true,
			bold = true,
			italic = {
				strings = false,
				emphasis = true,
				comments = true,
				operators = false,
				folds = true,
			},
			strikethrough = true,
			invert_selection = false,
			invert_signs = false,
			invert_tabline = false,
			inverse = true,
			contrast = "",
			dim_inactive = false,
			transparent_mode = true,
			palette_overrides = {},
			overrides = {
				NormalFloat = { bg = "none" },
				FloatBorder = { bg = "none", fg = "#928374" },
				NoiceCmdlinePopup = { bg = "none" },
				NoicePopup = { bg = "none" },
				WhichKeyFloat = { bg = "none" },

				-- Native LSP virtual text styling
				DiagnosticVirtualTextError = { italic = true },
				DiagnosticVirtualTextWarn = { italic = true },
				DiagnosticVirtualTextInfo = { italic = true },
				DiagnosticVirtualTextHint = { italic = true },

				-- Native LSP underlines
				DiagnosticUnderlineError = { undercurl = true, sp = "#fb4934" },
				DiagnosticUnderlineWarn = { undercurl = true, sp = "#fabd2f" },
				DiagnosticUnderlineInfo = { undercurl = true, sp = "#83a598" },
				DiagnosticUnderlineHint = { undercurl = true, sp = "#8ec07c" },

				-- Telescope highlights (transparent)
				TelescopeNormal = { bg = "none" },
				TelescopeBorder = { bg = "none", fg = "#928374" },
				TelescopePrompt = { bg = "none" },
				TelescopePromptNormal = { bg = "none" },
				TelescopePromptBorder = { bg = "none", fg = "#928374" },
				TelescopePromptPrefix = { bg = "none", fg = "#83a598" },
				TelescopePromptTitle = { bg = "none", fg = "#83a598" },
				TelescopeResults = { bg = "none" },
				TelescopePreview = { bg = "none" },
				TelescopeResultsTitle = { bg = "none", fg = "#83a598" },
				TelescopePreviewTitle = { bg = "none", fg = "#83a598" },
				TelescopeSelection = { bg = "none", fg = "#ebdbb2" },
				TelescopeSelectionCaret = { bg = "none", fg = "#83a598" },

				-- Git signs
				GitSignsAdd = { fg = "#b8bb26" },
				GitSignsChange = { fg = "#fabd2f" },
				GitSignsDelete = { fg = "#fb4934" },

				-- Treesitter context
				TreesitterContext = { bg = "none" },
				TreesitterContextLineNumber = { bg = "none" },

				-- Functions bold (matching catppuccin style)
				["@function"] = { bold = true },
				["@function.call"] = { bold = true },
				["@method"] = { bold = true },
				["@method.call"] = { bold = true },

				-- Conditionals italic (matching catppuccin style)
				["@keyword.conditional"] = { italic = true },
				Conditional = { italic = true },
			},
		},
	},
	{
		"catppuccin/nvim",
		name = "catppuccin",
		lazy = true,
		opts = {
			flavour = "macchiato", -- latte, frappe, macchiato, mocha
			transparent_background = true,
			term_colors = true,
			compile = { enabled = true, path = vim.fn.stdpath("cache") .. "/catppuccin", suffix = "_compiled" },
			styles = {
				comments = { "italic" },
				conditionals = { "italic" },
				loops = {},
				functions = { "bold" },
				keywords = {},
				strings = {},
				variables = {},
				numbers = {},
				booleans = {},
				properties = {},
				types = {},
				operators = {},
			},
			color_overrides = {
				macchiato = {
					-- True neutral dark base (no blue or brown tint)
					base = "#1f2428", -- Clean dark background
					mantle = "#161b1d", -- Darker
					crust = "#14181a", -- Darkest

					-- Pure grayscale text colors
					text = "#d4d4d4",
					subtext1 = "#bbbbbb",
					subtext0 = "#a6a6a6",
					overlay2 = "#919191",
					overlay1 = "#7c7c7c",
					overlay0 = "#666666",
					surface2 = "#484848",
					surface1 = "#333333",
					surface0 = "#292929",

					-- Vibrant accent colors without blue dominance
					red = "#f7768e", -- Bright pink-red
					green = "#9ece6a", -- Fresh green
					yellow = "#e5c07b", -- Warm yellow
					blue = "#bb9af7", -- Replaced with purple
					mauve = "#d38aea", -- Bright purple
					teal = "#2dc7c4", -- True teal
					flamingo = "#f26d99", -- Bright orange
					lavender = "#d7a4f7", -- Light purple

					-- Additional colors if needed
					peach = "#ff8800",
					maroon = "#ff6188",
					sky = "#95e6cb", -- Mint instead of sky blue
					sapphire = "#c07ab8", -- Purple-pink instead of sapphire
					rosewater = "#ffa0a0",
				},
				latte = {
					-- Clean light base colors
					base = "#f8f8f8", -- Clean light background
					mantle = "#f0f0f0", -- Slightly darker
					crust = "#e8e8e8", -- Subtle border color

					-- Refined grayscale text colors for light mode
					text = "#2c2c2c",
					subtext1 = "#4a4a4a",
					subtext0 = "#666666",
					overlay2 = "#7c7c7c",
					overlay1 = "#919191",
					overlay0 = "#a6a6a6",
					surface2 = "#c8c8c8",
					surface1 = "#d4d4d4",
					surface0 = "#e0e0e0",

					-- Vibrant but readable accent colors for light mode
					red = "#d73a49", -- GitHub-like red
					green = "#28a745", -- Clear green
					yellow = "#ffd33d", -- Bright yellow
					blue = "#7c3aed", -- Deep purple (matching dark mode preference)
					mauve = "#8b5cf6", -- Bright purple
					teal = "#20b2aa", -- True teal
					flamingo = "#f56565", -- Coral-like orange
					lavender = "#a78bfa", -- Light purple

					-- Additional colors adapted for light mode
					peach = "#ff8c00",
					maroon = "#dc2626",
					sky = "#06b6d4", -- Bright cyan
					sapphire = "#8b5cf6", -- Purple consistent with blue
					rosewater = "#f43f5e",
				},
			},
			integrations = {
				treesitter = true,
				blink_cmp = true,
				gitsigns = true,
				lsp_trouble = true,
				mason = true,
				markdown = true,
				native_lsp = {
					enabled = true,
					virtual_text = {
						errors = { "italic" },
						hints = { "italic" },
						warnings = { "italic" },
						information = { "italic" },
					},
					underlines = {
						errors = { "underline" },
						hints = { "underline" },
						warnings = { "underline" },
						information = { "underline" },
					},
				},
				neotree = true,
				noice = true,
				notify = true,
				telescope = {
					enabled = true,
				},
				treesitter_context = true,
				which_key = true,
				ts_rainbow = true,
			},
			custom_highlights = function(colors)
				return {
					NormalFloat = { bg = "none" },
					FloatBorder = { bg = "none", fg = colors.overlay0 },
					NoiceCmdlinePopup = { bg = "none" },
					NoicePopup = { bg = "none" },
					WhichKeyFloat = { bg = "none" },

					-- Add Telescope prompt specific highlights
					TelescopeNormal = { bg = "none" },
					TelescopeBorder = { bg = "none", fg = colors.overlay0 },
					TelescopePrompt = { bg = "none" },
					TelescopePromptNormal = { bg = "none" },
					TelescopePromptBorder = { bg = "none", fg = colors.overlay0 },
					TelescopePromptPrefix = { bg = "none", fg = colors.blue },
					TelescopePromptTitle = { bg = "none", fg = colors.blue },

					-- Different colors for results and preview
					TelescopeResults = { bg = "none" },
					TelescopePreview = { bg = "none" },
					TelescopeResultsTitle = { bg = "none", fg = colors.blue },
					TelescopePreviewTitle = { bg = "none", fg = colors.blue },

					-- Selection highlights
					TelescopeSelection = { bg = "none", fg = colors.text },
					TelescopeSelectionCaret = { bg = "none", fg = colors.blue },
				}
			end,
		},
	},
	{
		"folke/tokyonight.nvim",
		lazy = false,
		priority = 1000,
		opts = {
			style = "night",
			transparent = false,
			styles = {
				comments = { italic = true },
			},
		},
	},
	{
		"rose-pine/neovim",
		name = "rose-pine",
		config = function()
			require("rose-pine").setup({
				variant = "auto", -- auto, main, moon, or dawn
				dark_variant = "moon", -- main, moon, or dawn
				disable_background = true,
				styles = {
					bold = true,
					italic = true,
					transparency = false,
				},
			})
		end,
	},
	{
		"neanias/everforest-nvim",
		version = false,
		lazy = false,
		priority = 1000,
		config = function()
			require("everforest").setup({
				background = "medium",
				transparent_background_level = 2,
			})
		end,
	},
}
