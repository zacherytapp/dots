return {
	cmd = {
		"java",
		"-cp",
		vim.fn.expand("/home/zakk/.config/nvim/lspserver/apex-jorje-lsp.jar"),
		"-Ddebug.internal.errors=true",
		"-Ddebug.semantic.errors=true",
		"-Ddebug.completion.statistics=true",
		"-Dlwc.typegeneration.disabled=true",
		"apex.jorje.lsp.ApexLanguageServerLauncher",
	},
	filetypes = { "apex", "apexcode", "trigger", "java" },
	root_markers = { "sfdx-project.json" },
}
