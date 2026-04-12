---@type vim.lsp.Config
return {
	cmd = { "vscode-json-language-server", "--stdio" },
	filetypes = { "json", "jsonc" },
	init_options = {
		provideFormatter = true,
	},
	root_markers = { ".git" },
	settings = {
		json = {
			schemas = vim.list_extend(require("schemastore").json.schemas(), {
				{
					fileMatch = { "sfdx-project.json" },
					url = "https://raw.githubusercontent.com/forcedotcom/schemas/main/sfdx-project.schema.json",
				},
			}),
			validate = { enable = true },
		},
	},
}
