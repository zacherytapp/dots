---@type vim.lsp.Config
return {
	cmd = {
		vim.fn.expand("~/.local/share/nvim/mason/bin/lwc-language-server"),
		"--stdio",
	},
	filetypes = { "javascript", "html" },
	root_markers = { "sfdx-project.json" },
	init_options = {
		embeddedLanguages = {
			javascript = true,
		},
	},
	settings = {
		lwc = {
			suggest = {
				enabled = true,
			},
			validate = {
				enabled = true,
			},
		},
		html = {
			suggest = {
				html5 = true,
			},
			autoClosingTags = true,
			validate = {
				scripts = true,
				styles = true,
			},
		},
		javascript = {
			suggest = {
				autoImports = true,
				enabled = true,
			},
		},
	},
}
