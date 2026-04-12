---@type vim.lsp.Config
-- Note: htmldjango is handled by djlsp when available, but jinja_lsp serves as fallback
return {
	filetypes = { "jinja", "jinja2", "jinja.html" },
}
