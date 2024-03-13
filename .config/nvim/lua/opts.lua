local ft = require("Comment.ft")

ft.set("apex", { "//%s", "/*%s*/" })

vim.filetype.add({
	extension = {
		cls = "apex",
		apex = "apex",
		trigger = "apex",
		soql = "soql",
		sosl = "sosl",
	},
})

vim.opt.nu = true
vim.opt.relativenumber = true
vim.opt.softtabstop = 2
vim.opt.shiftwidth = 2
vim.opt.expandtab = true
vim.opt.smartindent = true
vim.opt.wrap = false
vim.opt.swapfile = false
vim.opt.backup = false
vim.opt.undodir = os.getenv("HOME") .. "/.vim/undodir"
vim.opt.undofile = true
vim.opt.hlsearch = false
vim.opt.incsearch = true
vim.opt.termguicolors = true
vim.opt.scrolloff = 8
vim.opt.isfname:append("@-@")
vim.opt.colorcolumn = "80"

-- Make line numbers default
vim.wo.number = true

-- Enable mouse mode
vim.o.mouse = "a"

-- Sync clipboard between OS and Neovim.
--  Remove this option if you want your OS clipboard to remain independent.
--  See `:help 'clipboard'`
vim.o.clipboard = "unnamedplus"

-- Enable break indent
vim.o.breakindent = true

-- Save undo history
vim.o.undofile = true

-- Case-insensitive searching UNLESS \C or capital in search
vim.o.ignorecase = true
vim.o.smartcase = true

-- Keep signcolumn on by default
vim.wo.signcolumn = "yes"

-- Decrease update time
vim.o.updatetime = 250
vim.o.timeoutlen = 300

-- Set completeopt to have a better completion experience
vim.o.completeopt = "menuone,noselect"

vim.o.termguicolors = true

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
vim.opt.spelllang = "en_us"
vim.opt.spell = true
vim.cmd.highlight("DiagnosticUnderlineError guisp=#ff0000 gui=undercurl")
