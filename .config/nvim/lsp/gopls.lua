---@type vim.lsp.Config
return {
	cmd = { "gopls" },
	filetypes = { "go", "gomod", "gowork", "gotmpl" },
	root_markers = { "go.work", "go.mod", ".git" },
	settings = {
		gopls = {
			templateExtensions = { "tpl", "yaml", "tmpl", "tmpl.html" },
			gofumpt = true,
			usePlaceholders = true,
			analyses = {
				nilness = true,
				unusedresult = true,
				unusedparams = true,
				unusedwrite = true,
				useany = true,
				unreachable = true,
			},
			hints = {
				assignVariableTypes = true,
				compositeLiteralFields = true,
				compositeLiteralTypes = true,
				constantValues = true,
				functionTypeParameters = true,
				parameterNames = true,
				rangeVariableTypes = true,
			},
			staticcheck = true,
		},
	},
}
