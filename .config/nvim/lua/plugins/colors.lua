return {
	{
		"rebelot/kanagawa.nvim",
		priority = 1000,
		lazy = false,
		opts = {
			theme = "dragon",
			background = { dark = "dragon", light = "lotus" },
			transparent = true,
			terminalColors = true,
			dimInactive = false,
			commentStyle = { italic = true },
			functionStyle = { bold = true },
			keywordStyle = { italic = true },
			statementStyle = { bold = false },
			typeStyle = {},
			overrides = function(colors)
				local palette = colors.palette
				return {
					-- Floats & popups (transparent)
					NormalFloat = { bg = "none" },
					FloatBorder = { bg = "none", fg = palette.dragonAsh },
					FloatTitle = { bg = "none", fg = palette.dragonBlue2 },
					WhichKeyFloat = { bg = "none" },

					-- Noice cmdline & popups (transparent)
					NoiceCmdline = { bg = "none" },
					NoiceCmdlinePopup = { bg = "none" },
					NoiceCmdlinePopupBorder = { bg = "none", fg = palette.dragonAsh },
					NoiceCmdlinePopupTitle = { bg = "none", fg = palette.dragonBlue2 },
					NoiceCmdlineIcon = { bg = "none", fg = palette.dragonBlue2 },
					NoiceCmdlineIconCmdline = { bg = "none", fg = palette.dragonBlue2 },
					NoiceCmdlineIconSearch = { bg = "none", fg = palette.carpYellow },
					NoicePopup = { bg = "none" },
					NoicePopupmenu = { bg = "none" },
					NoicePopupmenuBorder = { bg = "none", fg = palette.dragonAsh },
					NoicePopupmenuSelected = { bg = palette.dragonBlack4 },
					NoicePopupmenuMatch = { fg = palette.dragonGreen, bold = true },
					NoiceConfirm = { bg = "none" },
					NoiceConfirmBorder = { bg = "none", fg = palette.dragonAsh },
					NoiceMini = { bg = "none" },

					-- Pmenu (native popup menu - transparent)
					Pmenu = { bg = "none", fg = palette.dragonWhite },
					PmenuSel = { bg = palette.dragonBlack4 },
					PmenuSbar = { bg = "none" },
					PmenuThumb = { bg = palette.dragonAsh },

					-- Window elements (transparent)
					Folded = { bg = "none" },
					WinSeparator = { bg = "none", fg = palette.dragonBlack5 },
					WinBar = { bg = "none" },
					WinBarNC = { bg = "none" },

					-- Diagnostic virtual text (italic)
					DiagnosticVirtualTextError = { italic = true },
					DiagnosticVirtualTextWarn = { italic = true },
					DiagnosticVirtualTextInfo = { italic = true },
					DiagnosticVirtualTextHint = { italic = true },

					-- Diagnostic underlines (undercurl with dragon severity colors)
					DiagnosticUnderlineError = { undercurl = true, sp = palette.dragonRed },
					DiagnosticUnderlineWarn = { undercurl = true, sp = palette.carpYellow },
					DiagnosticUnderlineInfo = { undercurl = true, sp = palette.dragonBlue2 },
					DiagnosticUnderlineHint = { undercurl = true, sp = palette.dragonAqua },

					-- Blink completion
					BlinkCmpMenu = { bg = palette.dragonBlack2, fg = palette.dragonWhite },
					BlinkCmpMenuBorder = { bg = "none", fg = palette.dragonAsh },
					BlinkCmpMenuSelection = { bg = palette.dragonBlack4, fg = palette.dragonWhite, bold = true },
					BlinkCmpLabel = { fg = palette.dragonWhite },
					BlinkCmpLabelMatch = { fg = palette.dragonGreen, bold = true },
					BlinkCmpLabelDetail = { fg = palette.dragonAsh },
					BlinkCmpLabelDeprecated = { fg = palette.dragonAsh, strikethrough = true },
					BlinkCmpDoc = { bg = palette.dragonBlack2, fg = palette.dragonWhite },
					BlinkCmpDocBorder = { bg = "none", fg = palette.dragonAsh },
					BlinkCmpDocSeparator = { bg = "none", fg = palette.dragonAsh },
					BlinkCmpSignatureHelp = { bg = palette.dragonBlack2, fg = palette.dragonWhite },
					BlinkCmpSignatureHelpBorder = { bg = "none", fg = palette.dragonAsh },

					-- Telescope (fully transparent)
					TelescopeNormal = { bg = "none" },
					TelescopeBorder = { bg = "none", fg = palette.dragonAsh },
					TelescopePrompt = { bg = "none" },
					TelescopePromptNormal = { bg = "none" },
					TelescopePromptBorder = { bg = "none", fg = palette.dragonAsh },
					TelescopePromptPrefix = { bg = "none", fg = palette.dragonBlue2 },
					TelescopePromptTitle = { bg = "none", fg = palette.dragonBlue2 },
					TelescopeResults = { bg = "none" },
					TelescopePreview = { bg = "none" },
					TelescopeResultsTitle = { bg = "none", fg = palette.dragonBlue2 },
					TelescopePreviewTitle = { bg = "none", fg = palette.dragonBlue2 },
					TelescopeSelection = { bg = "none", fg = palette.dragonWhite },
					TelescopeSelectionCaret = { bg = "none", fg = palette.dragonBlue2 },

					-- Git signs
					GitSignsAdd = { fg = palette.dragonGreen },
					GitSignsChange = { fg = palette.carpYellow },
					GitSignsDelete = { fg = palette.dragonRed },

					-- Treesitter context (transparent)
					TreesitterContext = { bg = "none" },
					TreesitterContextLineNumber = { bg = "none" },

					-- Prevent gopls semantic tokens from overriding treesitter highlights
					["@lsp.type.variable.go"] = {},
					["@lsp.type.parameter.go"] = {},
					["@lsp.type.property.go"] = {},
					["@lsp.type.namespace.go"] = {},
					["@lsp.type.function.go"] = {},
					["@lsp.type.method.go"] = {},
					["@lsp.type.type.go"] = {},
					["@lsp.type.keyword.go"] = {},
				}
			end,
		},
	},
}
