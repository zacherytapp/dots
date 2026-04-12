---@type vim.lsp.Config
return {
	cmd = {
		"java",
		"-Xmx2048m",
		"-XX:+UseG1GC",
		"-XX:+UseStringDeduplication",
		"-Ddebug.internal.errors=true",
		"-Ddebug.semantic.errors=true",
		"-Ddebug.completion.statistics=false",
		"-Dlwc.typegeneration.disabled=true",
		"-jar",
		vim.fn.expand("~/.config/nvim/lspserver/apex-jorje-lsp.jar"),
	},
	filetypes = { "apex" },
	root_markers = { "sfdx-project.json", ".git" },
	on_init = function(client)
		-- Watch for Apex file changes to keep the LSP index fresh
		if client.workspace_did_change_watched_files then
			client.workspace_did_change_watched_files({
				watchers = {
					{ globPattern = "**/*.cls" },
					{ globPattern = "**/*.trigger" },
					{ globPattern = "**/*.apex" },
					{ globPattern = "**/sfdx-project.json" },
				},
			})
		end
	end,
	init_options = {
		enableEmbeddedSoqlCompletion = true,
	},
	settings = {
		apex = {
			enable_semantic_errors = true,
			enable_completion_statistics = false,
		},
	},
}
