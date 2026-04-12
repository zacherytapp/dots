---@type vim.lsp.Config
return {
	cmd = {
		vim.fn.expand("~/.local/share/nvim/mason/bin/visualforce-language-server"),
		"--stdio",
	},
	filetypes = { "visualforce", "page", "component" },
	root_markers = { "sfdx-project.json" },
	init_options = {
		embeddedLanguages = {
			css = true,
			javascript = true,
		},
		provideFormatter = true,
	},
	settings = {
		html = {
			format = {
				enable = true,
				wrapLineLength = 120,
				wrapAttributes = "auto",
				indentInnerHtml = false,
				preserveNewLines = true,
				maxPreserveNewLines = 2,
				indentHandlebars = false,
				endWithNewline = true,
				extraLiners = "head, body, /html",
				templating = false,
			},
			suggest = {
				html5 = true,
			},
			completion = {
				attributeDefaultValue = "doublequotes",
			},
			validate = {
				scripts = true,
				styles = true,
			},
			autoClosingTags = true,
			autoCreateQuotes = true,
			mirrorCursorOnMatchingTag = false,
		},
		css = {
			validate = true,
			completion = {
				triggerPropertyValueCompletion = true,
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
