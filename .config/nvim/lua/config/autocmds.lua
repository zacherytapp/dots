-- Autocommands
local autocmd = vim.api.nvim_create_autocmd
local augroup = vim.api.nvim_create_augroup

-- Highlight on yank
autocmd("TextYankPost", {
	desc = "Highlight when yanking text",
	group = augroup("highlight-yank", { clear = true }),
	callback = function()
		vim.highlight.on_yank()
	end,
})

-- Auto-open quickfix window when grepping
autocmd("QuickFixCmdPost", {
	pattern = "[^l]*",
	nested = true,
	command = "cwindow",
})

-- Markdown: disable auto-formatting/wrapping to preserve prose structure
autocmd("FileType", {
	pattern = "markdown",
	group = augroup("markdown-settings", { clear = true }),
	callback = function()
		vim.opt_local.formatoptions:remove({ "t", "c" }) -- don't auto-wrap text or comments
		vim.opt_local.textwidth = 0 -- no hard wrapping
	end,
})

-- Go: organize imports on save via gopls code action
autocmd("BufWritePre", {
	pattern = "*.go",
	group = augroup("go-organize-imports", { clear = true }),
	callback = function()
		local client = vim.lsp.get_clients({ bufnr = 0, name = "gopls" })[1]
		if not client then
			return
		end
		local params = vim.lsp.util.make_range_params(0, client.offset_encoding)
		params.context = { only = { "source.organizeImports" } }
		local result = vim.lsp.buf_request_sync(0, "textDocument/codeAction", params, 3000)
		for _, res in pairs(result or {}) do
			for _, action in pairs(res.result or {}) do
				if action.edit then
					vim.lsp.util.apply_workspace_edit(action.edit, "utf-16")
				elseif action.command then
					vim.lsp.buf.execute_command(action.command)
				end
			end
		end
	end,
})

-- Aura components: use HTML syntax but no auto-formatting
autocmd("FileType", {
	pattern = "aura",
	group = augroup("aura-settings", { clear = true }),
	callback = function()
		vim.bo.syntax = "html"
	end,
})

-- Custom commentstring for filetypes not covered by treesitter
autocmd("FileType", {
	pattern = "apex",
	group = augroup("apex-commentstring", { clear = true }),
	callback = function()
		vim.bo.commentstring = "// %s"
	end,
})

autocmd("FileType", {
	pattern = "tmpl",
	group = augroup("tmpl-commentstring", { clear = true }),
	callback = function()
		vim.bo.commentstring = "<!-- %s -->"
	end,
})
