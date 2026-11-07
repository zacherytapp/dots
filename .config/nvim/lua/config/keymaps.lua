--[[
Keymap convention
=================
Layout follows LazyVim (https://www.lazyvim.org/keymaps): <leader>f file/find,
<leader>s search, <leader>c code, <leader>g git (<leader>gh hunks), <leader>d
debug, <leader>t test, <leader>u ui toggles, <leader>x diagnostics/quickfix,
<leader>b buffers, <leader>w windows, <leader>q quit/session, <leader>a AI,
<leader>o overseer, <leader>n notes, <leader>m Salesforce; g goto; [ / ] prev/next.

Where keymaps live:
  * global, non-plugin keys  -> this file
  * plugin keys              -> lazy `keys = { ... }` on the plugin's spec (they
                                also lazy-load the plugin), `ft = ...` for
                                filetype-scoped keys in plugins/lang/*.lua
  * UI toggles               -> Snacks.toggle():map("<leader>u*") in plugins/snacks.lua
  * completion / textobjects -> blink.cmp, copilot, LuaSnip, mini.ai, treesitter-textobjects
Every keymap with a `desc` is searchable in the <leader>k command palette
(lua/util/palette.lua); commands without a key go in a spec's `palette = {}`.
which-key group names and icons live in plugins/editor.lua.
]]

local util = require("util")

---@param mode string|string[]
---@param lhs string
---@param rhs string|function
---@param desc string
---@param opts? vim.keymap.set.Opts
local function map(mode, lhs, rhs, desc, opts)
  vim.keymap.set(mode, lhs, rhs, vim.tbl_extend("force", { desc = desc }, opts or {}))
end

local function diagnostic_goto(next, severity)
  return function()
    vim.diagnostic.jump({
      count = (next and 1 or -1) * vim.v.count1,
      severity = severity and vim.diagnostic.severity[severity] or nil,
      float = true,
    })
  end
end

local function toggle_list(open, close, is_open)
  return function()
    local ok, err = pcall(is_open() and close or open)
    if not ok and err then
      vim.notify(err, vim.log.levels.ERROR)
    end
  end
end

map("n", "<leader>k", function()
  require("util.palette").show()
end, "Command palette")

-- Movement ------------------------------------------------------------
map({ "n", "x" }, "j", "v:count == 0 ? 'gj' : 'j'", "Down", { expr = true, silent = true })
map({ "n", "x" }, "k", "v:count == 0 ? 'gk' : 'k'", "Up", { expr = true, silent = true })
map("n", "<C-h>", "<C-w>h", "Go to left window", { remap = true })
map("n", "<C-j>", "<C-w>j", "Go to lower window", { remap = true })
map("n", "<C-k>", "<C-w>k", "Go to upper window", { remap = true })
map("n", "<C-l>", "<C-w>l", "Go to right window", { remap = true })
map("n", "<C-Up>", "<cmd>resize +2<cr>", "Increase window height")
map("n", "<C-Down>", "<cmd>resize -2<cr>", "Decrease window height")
map("n", "<C-Left>", "<cmd>vertical resize -2<cr>", "Decrease window width")
map("n", "<C-Right>", "<cmd>vertical resize +2<cr>", "Increase window width")
-- Saner n/N: always forward/backward, and open folds
map("n", "n", "'Nn'[v:searchforward].'zv'", "Next search result", { expr = true })
map({ "x", "o" }, "n", "'Nn'[v:searchforward]", "Next search result", { expr = true })
map("n", "N", "'nN'[v:searchforward].'zv'", "Prev search result", { expr = true })
map({ "x", "o" }, "N", "'nN'[v:searchforward]", "Prev search result", { expr = true })

-- Editing -------------------------------------------------------------
map({ "i", "x", "n", "s" }, "<C-s>", "<cmd>w<cr><esc>", "Save file")
map("n", "<Esc>", "<cmd>nohlsearch<cr><esc>", "Clear search highlight")
map("i", ",", ",<c-g>u", "Undo break-point")
map("i", ".", ".<c-g>u", "Undo break-point")
map("i", ";", ";<c-g>u", "Undo break-point")
map("x", "<", "<gv", "Indent left (keep selection)")
map("x", ">", ">gv", "Indent right (keep selection)")
map("n", "gco", "o<esc>Vcx<esc><cmd>normal gcc<cr>fxa<bs>", "Add comment below")
map("n", "gcO", "O<esc>Vcx<esc><cmd>normal gcc<cr>fxa<bs>", "Add comment above")
map("x", "<leader>p", '"_dP', "Paste without yanking selection")
map({ "n", "x" }, "<leader>y", '"+y', "Yank to system clipboard")
map("n", "<leader>Y", '"+Y', "Yank line to system clipboard")
-- With mouse=a a drag selects inside nvim, so ghostty and herdr never see it
-- and their copy_on_select can't fire. Copy on release instead, keeping the
-- selection. Shift+drag still makes a ghostty selection.
map("x", "<LeftRelease>", '<LeftRelease>"+ygv', "Copy mouse selection to clipboard")
map("n", "<leader>K", "<cmd>norm! K<cr>", "Keywordprg")

-- Files / buffers -----------------------------------------------------
map("n", "<leader>fn", "<cmd>enew<cr>", "New file")
map("n", "<S-h>", "<cmd>bprevious<cr>", "Prev buffer")
map("n", "<S-l>", "<cmd>bnext<cr>", "Next buffer")
map("n", "[b", "<cmd>bprevious<cr>", "Prev buffer")
map("n", "]b", "<cmd>bnext<cr>", "Next buffer")
map("n", "<leader>bb", "<cmd>e #<cr>", "Switch to other buffer")
map("n", "<leader>bd", function()
  Snacks.bufdelete()
end, "Delete buffer")
map("n", "<leader>bo", function()
  Snacks.bufdelete.other()
end, "Delete other buffers")
map("n", "<leader>bD", "<cmd>bd<cr>", "Delete buffer and window")
map("n", "-", "<cmd>Oil<cr>", "Oil: Open parent directory")

-- Windows / tabs ------------------------------------------------------
map("n", "<leader>-", "<C-w>s", "Split window below", { remap = true })
map("n", "<leader>|", "<C-w>v", "Split window right", { remap = true })
map("n", "<leader>wd", "<C-w>c", "Delete window", { remap = true })
map("n", "<leader><tab>l", "<cmd>tablast<cr>", "Last tab")
map("n", "<leader><tab>o", "<cmd>tabonly<cr>", "Close other tabs")
map("n", "<leader><tab>f", "<cmd>tabfirst<cr>", "First tab")
map("n", "<leader><tab><tab>", "<cmd>tabnew<cr>", "New tab")
map("n", "<leader><tab>]", "<cmd>tabnext<cr>", "Next tab")
map("n", "<leader><tab>d", "<cmd>tabclose<cr>", "Close tab")
map("n", "<leader><tab>[", "<cmd>tabprevious<cr>", "Previous tab")
map("n", "<leader>qq", "<cmd>qa<cr>", "Quit all")

-- Code / LSP ----------------------------------------------------------
map("n", "gD", vim.lsp.buf.declaration, "LSP: Goto declaration")
map("n", "K", function()
  vim.lsp.buf.hover()
end, "LSP: Hover")
map("n", "gK", function()
  vim.lsp.buf.signature_help()
end, "LSP: Signature help")
map({ "n", "x" }, "<leader>ca", vim.lsp.buf.code_action, "LSP: Code action")
map("n", "<leader>cA", function()
  vim.lsp.buf.code_action({ apply = true, context = { only = { "source" }, diagnostics = {} } })
end, "LSP: Source action")
map("n", "<leader>cr", vim.lsp.buf.rename, "LSP: Rename symbol")
map({ "n", "x" }, "<leader>cc", vim.lsp.codelens.run, "LSP: Run codelens")
map("n", "<leader>cC", function()
  vim.lsp.codelens.enable(not vim.lsp.codelens.is_enabled({ bufnr = 0 }), { bufnr = 0 })
end, "LSP: Toggle codelens (buffer)")
map("n", "<leader>cl", "<cmd>checkhealth vim.lsp<cr>", "LSP: Info")
map("n", "<leader>cL", "<cmd>LspRestart<cr>", "LSP: Restart")
map("n", "<leader>cwa", vim.lsp.buf.add_workspace_folder, "LSP: Add workspace folder")
map("n", "<leader>cwr", vim.lsp.buf.remove_workspace_folder, "LSP: Remove workspace folder")
map("n", "<leader>cwl", function()
  vim.notify(table.concat(vim.lsp.buf.list_workspace_folders(), "\n"), vim.log.levels.INFO)
end, "LSP: List workspace folders")
map({ "n", "x" }, "<leader>cf", function()
  require("conform").format() -- default_format_opts in plugins/formatting.lua
end, "Format buffer / selection")
map("n", "<leader>cJ", function()
  if util.has("jq") then
    vim.cmd("%!jq .")
    vim.bo.filetype = "json"
  else
    vim.notify("jq not found", vim.log.levels.WARN)
  end
end, "Format buffer as JSON (jq)")

-- Diagnostics / quickfix ----------------------------------------------
map("n", "<leader>cd", function()
  vim.diagnostic.open_float()
end, "Line diagnostics")
map("n", "]d", diagnostic_goto(true), "Next diagnostic")
map("n", "[d", diagnostic_goto(false), "Prev diagnostic")
map("n", "]e", diagnostic_goto(true, "ERROR"), "Next error")
map("n", "[e", diagnostic_goto(false, "ERROR"), "Prev error")
map("n", "]w", diagnostic_goto(true, "WARN"), "Next warning")
map("n", "[w", diagnostic_goto(false, "WARN"), "Prev warning")
map(
  "n",
  "<leader>xl",
  toggle_list(vim.cmd.lopen, vim.cmd.lclose, function()
    return vim.fn.getloclist(0, { winid = 0 }).winid ~= 0
  end),
  "Location list"
)
map(
  "n",
  "<leader>xq",
  toggle_list(vim.cmd.copen, vim.cmd.cclose, function()
    return vim.fn.getqflist({ winid = 0 }).winid ~= 0
  end),
  "Quickfix list"
)
map("n", "[q", vim.cmd.cprev, "Previous quickfix")
map("n", "]q", vim.cmd.cnext, "Next quickfix")

-- UI ------------------------------------------------------------------
map("n", "<leader>ui", vim.show_pos, "Inspect position")
map("n", "<leader>uI", function()
  vim.treesitter.inspect_tree()
  vim.api.nvim_input("I")
end, "Inspect tree")
map("n", "<leader>ur", "<cmd>nohlsearch<bar>diffupdate<bar>normal! <C-L><cr>", "Redraw / clear hlsearch / diff update")
map("n", "<leader>l", "<cmd>Lazy<cr>", "Lazy")
map("n", "<leader>cm", "<cmd>Mason<cr>", "Mason")
