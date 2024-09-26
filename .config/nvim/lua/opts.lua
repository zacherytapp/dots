vim.filetype.add({
	extension = {
		cls = "apex",
		apex = "apex",
		trigger = "apex",
		soql = "soql",
		sosl = "sosl",
		page = "html",
		cmp = "html",
		auradoc = "html",
		templ = "templ",
	},
})

vim.api.nvim_create_autocmd("VimEnter", {
	callback = function()
		local utils = require("utils")
		utils.setup_tmux("sfdx-project.json", "~/.local/bin/sf-tmux-project")
		utils.setup_tmux("go.mod", "~/.local/bin/go-tmux-project")
	end,
})

vim.g.netrw_browse_split = 0
vim.g.netrw_banner = 0
vim.g.netrw_winsize = 25

vim.opt.isfname:append("@-@")

vim.o.guicursor = ""
vim.o.nu = true
vim.o.relativenumber = true
vim.o.smarttab = true
vim.o.expandtab = true
vim.o.smartindent = true
vim.o.tabstop = 2
vim.o.softtabstop = 2
vim.o.shiftwidth = 2
vim.o.wrap = false
vim.o.swapfile = false
vim.o.backup = false
vim.o.undodir = os.getenv("HOME") .. "/.vim/undodir"
vim.o.undofile = true
vim.o.hlsearch = false
vim.o.incsearch = true
vim.o.termguicolors = true
vim.o.scrolloff = 8
vim.o.colorcolumn = "80"
vim.o.clipboard = "unnamedplus"
vim.o.breakindent = true
vim.o.undofile = true
vim.o.ignorecase = true
vim.o.smartcase = true
vim.o.updatetime = 250
vim.o.timeoutlen = 300
vim.o.completeopt = "menuone,noselect"
vim.o.spelllang = "en_us"
vim.o.spell = true

vim.wo.number = true
vim.wo.signcolumn = "yes"

-- [[ Highlight on yank ]]
-- See `:help vim.highlight.on_yank()`
local highlight_group = vim.api.nvim_create_augroup("YankHighlight", { clear = true })
vim.api.nvim_create_autocmd("TextYankPost", {
	callback = function()
		vim.highlight.on_yank()
	end,
	group = highlight_group,
	pattern = "*",
})

vim.api.nvim_create_autocmd({ "BufWritePre" }, { pattern = { "*.templ" }, callback = vim.lsp.buf.format })

vim.api.nvim_create_autocmd({ "BufEnter", "BufWinEnter" }, {
	pattern = { "*.cls", "*.trigger", "*.apex" },
	callback = function()
		vim.bo.filetype = "apex"
	end,
})

-- helper function
local function update_hl(group, tbl)
	local old_hl = vim.api.nvim_get_hl(0, { name = group })
	local new_hl = vim.tbl_extend("force", old_hl, tbl)
	vim.api.nvim_set_hl(0, group, new_hl)
end

update_hl("TSParameter", { italic = true })
update_hl("String", { italic = true })
update_hl("StartifyPath", { italic = true })
update_hl("StartifySlash", { italic = true })
update_hl("CmpItemKind", { italic = true })
update_hl("TSKeyword", { italic = true })
update_hl("Comment", { italic = true })
update_hl("Identifier", { italic = true })
update_hl("Conditional", { italic = true })
update_hl("TSMethod", { italic = true })
update_hl("TSEmphasis", { italic = true })
update_hl("TSComment", { italic = true })
update_hl("TSConditional", { italic = true })
update_hl("TSFunction", { italic = true })
update_hl("TSFuncBuiltin", { italic = true })
update_hl("TSParameter", { italic = true })
update_hl("TSKeywordReturn", { italic = true })
update_hl("TSKeywordFunction", { italic = true })
update_hl("TSLabel", { italic = true })
update_hl("TSString", { italic = true })
update_hl("TSRepeat", { italic = true })
update_hl("TSVariable", { italic = true })
update_hl("TSVariableBuiltin", { italic = true })

vim.cmd.highlight("DiagnosticUnderlineError guisp=#ff0000 gui=undercurl")
