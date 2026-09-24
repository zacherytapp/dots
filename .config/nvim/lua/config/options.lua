local opt = vim.opt

-- abbreviations / common spelling fixes
for typo, fix in pairs({
  funciton = "function",
  teh = "the",
  tempalte = "template",
  fitler = "filter",
  cosnt = "const",
  attribtue = "attribute",
  attribuet = "attribute",
}) do
  vim.cmd.abbreviate(typo, fix)
end

-- General
-----------------------------------------------------------------
if not vim.env.SSH_TTY then
  -- don't set the clipboard when in SSH (OSC 52 handles it there)
  opt.clipboard = "unnamedplus"
end

opt.confirm = true -- confirm changes before exiting a buffer
opt.autowrite = true
opt.writebackup = false
opt.swapfile = false
opt.undofile = true
opt.undolevels = 10000
opt.history = 1000
opt.mouse = "a"
opt.sessionoptions = { "buffers", "curdir", "tabpages", "winsize", "help", "globals", "skiprtp", "folds" }
opt.jumpoptions = "view"
opt.updatetime = 200
opt.timeoutlen = vim.g.vscode and 1000 or 300 -- lower than default to quickly trigger which-key
opt.visualbell = true
opt.virtualedit = "block"
opt.inccommand = "nosplit" -- preview incremental substitute
opt.formatexpr = "v:lua.require'conform'.formatexpr()"
opt.formatoptions = "jcroqlnt"
opt.spelllang = { "en" }
opt.spellfile = vim.fn.stdpath("config") .. "/spell/en.utf-8.add" -- zg/zw words live in the dots repo

-- Searching
opt.ignorecase = true
opt.smartcase = true
if vim.fn.executable("rg") == 1 then
  -- ripgrep, respecting .gitignore (the default grepprg passes -uu)
  opt.grepprg = "rg --vimgrep --no-heading"
  opt.grepformat = "%f:%l:%c:%m"
end

-- Completion / command line
opt.completeopt = "menu,menuone,noselect"
opt.wildmode = "longest:full,full"
opt.pumblend = 0
opt.pumheight = 10

-- Appearance
-----------------------------------------------------------------
opt.termguicolors = true
opt.number = true
opt.relativenumber = true
opt.guicursor = ""
opt.cursorline = true
opt.cursorlineopt = "number" -- highlight only the line number
opt.signcolumn = "yes"
opt.winborder = "rounded"
opt.conceallevel = 2
opt.laststatus = 3 -- global statusline
opt.cmdheight = vim.g.vscode and 1 or 0
opt.showmode = false -- lualine shows the mode
opt.ruler = false
opt.title = true
opt.showmatch = true
opt.shortmess:append({ W = true, I = true, c = true, C = true })
opt.scrolloff = 7
opt.sidescrolloff = 8
opt.smoothscroll = true
opt.splitbelow = true
opt.splitright = true
opt.splitkeep = "screen"
opt.winminwidth = 5
opt.textwidth = 120
opt.linebreak = true -- soft wrap at word boundaries
opt.showbreak = "↪"
opt.wrap = false
opt.shell = vim.env.SHELL or opt.shell:get()
opt.diffopt:append({ "vertical", "iwhite", "algorithm:patience", "hiddenoff" })

opt.list = true
opt.listchars = {
  tab = "  ",
  trail = "⋅",
  extends = "❯",
  precedes = "❮",
  nbsp = "␣",
}
opt.fillchars = {
  foldopen = "\u{f47c}",
  foldclose = "\u{f460}",
  fold = " ",
  foldsep = " ",
  diff = "╱",
  eob = " ",
}

-- Indentation: 2 spaces by default. Per-language overrides live in
-- after/ftplugin/*.lua; vim-sleuth and .editorconfig adapt to existing files.
opt.expandtab = true
opt.tabstop = 2
opt.softtabstop = 2
opt.shiftwidth = 2
opt.shiftround = true
opt.smartindent = true

-- Folding (treesitter; open by default)
opt.foldmethod = "expr"
opt.foldexpr = "v:lua.vim.treesitter.foldexpr()"
opt.foldlevel = 99
opt.foldlevelstart = 99
opt.foldnestmax = 10
opt.foldenable = false
opt.foldcolumn = "0"
function _G.custom_foldtext()
  local start = vim.fn.getline(vim.v.foldstart):gsub("\t", string.rep(" ", vim.o.tabstop))
  local end_str = vim.trim(vim.fn.getline(vim.v.foldend))
  local line_count = vim.v.foldend - vim.v.foldstart + 1
  return start .. " ... " .. end_str .. " (" .. line_count .. " lines)"
end
opt.foldtext = "v:lua.custom_foldtext()"

-- Markdown code blocks keep their own indentation
vim.g.markdown_recommended_style = 0
