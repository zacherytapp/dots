return {
	{
		"xiyaowong/transparent.nvim",
		config = function()
			require("transparent").setup({
				groups = {
					"Normal",
					"NormalNC",
					"Comment",
					"Constant",
					"Special",
					"Identifier",
					"Statement",
					"PreProc",
					"Type",
					"Underlined",
					"Todo",
					"String",
					"Function",
					"Conditional",
					"Repeat",
					"Operator",
					"Structure",
					"LineNr",
					"NonText",
					"SignColumn",
					"CursorLine",
					"CursorLineNr",
					"StatusLine",
					"StatusLineNC",
					"EndOfBuffer",
				},
				extra_groups = {
					-- Floats
					"NormalFloat",
					"FloatBorder",
					"FloatTitle",
					-- Noice
					"NoiceCmdline",
					"NoiceCmdlinePopup",
					"NoiceCmdlinePopupBorder",
					"NoiceCmdlinePopupTitle",
					"NoiceCmdlineIcon",
					"NoicePopup",
					"NoicePopupmenu",
					"NoicePopupmenuBorder",
					"NoiceConfirm",
					"NoiceConfirmBorder",
					"NoiceMini",
					-- Telescope
					"TelescopeNormal",
					"TelescopeBorder",
					"TelescopePromptNormal",
					"TelescopePromptBorder",
					"TelescopeResults",
					"TelescopePreview",
					-- Which-key
					"WhichKeyFloat",
					-- Treesitter context
					"TreesitterContext",
					"TreesitterContextLineNumber",
					-- Pmenu
					"Pmenu",
					"PmenuSbar",
					-- Window elements
					"Folded",
					"WinSeparator",
					"WinBar",
					"WinBarNC",
				},
				exclude_groups = {},
				on_clear = function() end,
			})
		end,
	},
}
