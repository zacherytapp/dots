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
-- Every yank and delete goes to the system clipboard. Locally that's wl-copy
-- (or xclip). Over SSH, including herdr remote machines, there's no display,
-- so copy with OSC 52, which herdr passes through to ghostty. Paste returns
-- this nvim's last yank: an OSC 52 read would stall on ghostty's
-- clipboard-read prompt. Paste text from the host with ctrl+shift+v.
opt.clipboard = "unnamedplus"
local remote = vim.env.SSH_TTY or vim.env.SSH_CONNECTION
if remote or not (vim.env.WAYLAND_DISPLAY or vim.env.DISPLAY) then
  local osc52 = require("vim.ui.clipboard.osc52")
  local last = {} ---@type table<string, { [1]: string[], [2]: string }>
  local function copy(reg)
    local send = osc52.copy(reg)
    return function(lines, regtype)
      last[reg] = { lines, regtype }
      send(lines)
    end
  end
  local function paste(reg)
    return function()
      return last[reg] or 0
    end
  end
  vim.g.clipboard = {
    name = "OSC 52",
    copy = { ["+"] = copy("+"), ["*"] = copy("*") },
    paste = { ["+"] = paste("+"), ["*"] = paste("*") },
  }
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
opt.timeoutlen = 300 -- lower than default to quickly trigger which-key
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
opt.showtabline = 0 -- no tabline; find buffers with <leader>, (toggle with <leader>uA)
opt.cmdheight = 0
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
