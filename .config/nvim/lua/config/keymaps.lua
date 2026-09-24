--[[
Keymap convention
=================
Layout follows LazyVim (https://www.lazyvim.org/keymaps): <leader>f file/find,
<leader>s search, <leader>c code, <leader>g git (<leader>gh hunks), <leader>d
debug, <leader>t test, <leader>u ui toggles, <leader>x diagnostics/quickfix,
<leader>b buffers, <leader>w windows, <leader>q quit/session, <leader>a AI,
<leader>o overseer, <leader>n notes, <leader>m Salesforce; g goto; [ / ] prev/next.

Every user-facing global keymap is registered with commander so it shows up in
the <leader>k palette (and which-key, via its `desc`):
  * global, non-plugin keys  -> this file
  * plugin keys              -> a `commander = { ... }` block on the plugin's lazy spec
Commander does not drive lazy-loading: a plugin reached only through a
commander binding still needs a `cmd`/`event`/`ft` trigger on its spec.

Exceptions (not in commander; lazy `keys` are still listed in the palette):
  1. Filetype-scoped keys  -> lazy `keys = { ..., ft = "..." }` in plugins/lang/*.lua
  2. Completion-menu keys  -> blink.cmp / copilot / LuaSnip configs
  3. UI toggles            -> Snacks.toggle():map("<leader>u*") in plugins/snacks.lua
  4. Textobjects / motions -> treesitter-textobjects, mini.ai, flash configs
which-key group names and icons live in plugins/editor.lua.
]]

local commander = require("commander")
local util = require("util")

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

commander.add({
  { keys = { "n", "<leader>k" }, cmd = commander.show, desc = "Commander: Command palette" },

  -- Movement ------------------------------------------------------------
  {
    keys = { { "n", "x" }, "j", { expr = true, silent = true } },
    cmd = "v:count == 0 ? 'gj' : 'j'",
    desc = "Down",
    show = false,
  },
  {
    keys = { { "n", "x" }, "k", { expr = true, silent = true } },
    cmd = "v:count == 0 ? 'gk' : 'k'",
    desc = "Up",
    show = false,
  },
  { keys = { "n", "<C-h>", { remap = true } }, cmd = "<C-w>h", desc = "Go to left window" },
  { keys = { "n", "<C-j>", { remap = true } }, cmd = "<C-w>j", desc = "Go to lower window" },
  { keys = { "n", "<C-k>", { remap = true } }, cmd = "<C-w>k", desc = "Go to upper window" },
  { keys = { "n", "<C-l>", { remap = true } }, cmd = "<C-w>l", desc = "Go to right window" },
  { keys = { "n", "<C-Up>" }, cmd = "<cmd>resize +2<cr>", desc = "Increase window height" },
  { keys = { "n", "<C-Down>" }, cmd = "<cmd>resize -2<cr>", desc = "Decrease window height" },
  { keys = { "n", "<C-Left>" }, cmd = "<cmd>vertical resize -2<cr>", desc = "Decrease window width" },
  { keys = { "n", "<C-Right>" }, cmd = "<cmd>vertical resize +2<cr>", desc = "Increase window width" },
  -- Saner n/N: always forward/backward, and open folds
  {
    keys = { "n", "n", { expr = true } },
    cmd = "'Nn'[v:searchforward].'zv'",
    desc = "Next search result",
    show = false,
  },
  {
    keys = { { "x", "o" }, "n", { expr = true } },
    cmd = "'Nn'[v:searchforward]",
    desc = "Next search result",
    show = false,
  },
  {
    keys = { "n", "N", { expr = true } },
    cmd = "'nN'[v:searchforward].'zv'",
    desc = "Prev search result",
    show = false,
  },
  {
    keys = { { "x", "o" }, "N", { expr = true } },
    cmd = "'nN'[v:searchforward]",
    desc = "Prev search result",
    show = false,
  },

  -- Editing -------------------------------------------------------------
  { keys = { { "i", "x", "n", "s" }, "<C-s>" }, cmd = "<cmd>w<cr><esc>", desc = "Save file" },
  { keys = { "n", "<Esc>" }, cmd = "<cmd>nohlsearch<cr><esc>", desc = "Clear search highlight" },
  { keys = { "i", "," }, cmd = ",<c-g>u", desc = "Undo break-point", show = false },
  { keys = { "i", "." }, cmd = ".<c-g>u", desc = "Undo break-point", show = false },
  { keys = { "i", ";" }, cmd = ";<c-g>u", desc = "Undo break-point", show = false },
  { keys = { "x", "<" }, cmd = "<gv", desc = "Indent left (keep selection)", show = false },
  { keys = { "x", ">" }, cmd = ">gv", desc = "Indent right (keep selection)", show = false },
  { keys = { "n", "gco" }, cmd = "o<esc>Vcx<esc><cmd>normal gcc<cr>fxa<bs>", desc = "Add comment below" },
  { keys = { "n", "gcO" }, cmd = "O<esc>Vcx<esc><cmd>normal gcc<cr>fxa<bs>", desc = "Add comment above" },
  { keys = { "x", "<leader>p" }, cmd = '"_dP', desc = "Paste without yanking selection" },
  { keys = { { "n", "x" }, "<leader>y" }, cmd = '"+y', desc = "Yank to system clipboard" },
  { keys = { "n", "<leader>Y" }, cmd = '"+Y', desc = "Yank line to system clipboard" },
  { keys = { "n", "<leader>K" }, cmd = "<cmd>norm! K<cr>", desc = "Keywordprg" },

  -- Files / buffers -----------------------------------------------------
  { keys = { "n", "<leader>fn" }, cmd = "<cmd>enew<cr>", desc = "New file" },
  { keys = { "n", "<leader>bb" }, cmd = "<cmd>e #<cr>", desc = "Switch to other buffer" },
  { keys = { "n", "<leader>`" }, cmd = "<cmd>e #<cr>", desc = "Switch to other buffer" },
  {
    keys = { "n", "<leader>bd" },
    cmd = function()
      Snacks.bufdelete()
    end,
    desc = "Delete buffer",
  },
  {
    keys = { "n", "<leader>bo" },
    cmd = function()
      Snacks.bufdelete.other()
    end,
    desc = "Delete other buffers",
  },
  { keys = { "n", "<leader>bD" }, cmd = "<cmd>bd<cr>", desc = "Delete buffer and window" },
  { keys = { "n", "-" }, cmd = "<cmd>Oil<cr>", desc = "Oil: Open parent directory" },

  -- Windows / tabs ------------------------------------------------------
  { keys = { "n", "<leader>-", { remap = true } }, cmd = "<C-w>s", desc = "Split window below" },
  { keys = { "n", "<leader>|", { remap = true } }, cmd = "<C-w>v", desc = "Split window right" },
  { keys = { "n", "<leader>wd", { remap = true } }, cmd = "<C-w>c", desc = "Delete window" },
  { keys = { "n", "<leader><tab>l" }, cmd = "<cmd>tablast<cr>", desc = "Last tab" },
  { keys = { "n", "<leader><tab>o" }, cmd = "<cmd>tabonly<cr>", desc = "Close other tabs" },
  { keys = { "n", "<leader><tab>f" }, cmd = "<cmd>tabfirst<cr>", desc = "First tab" },
  { keys = { "n", "<leader><tab><tab>" }, cmd = "<cmd>tabnew<cr>", desc = "New tab" },
  { keys = { "n", "<leader><tab>]" }, cmd = "<cmd>tabnext<cr>", desc = "Next tab" },
  { keys = { "n", "<leader><tab>d" }, cmd = "<cmd>tabclose<cr>", desc = "Close tab" },
  { keys = { "n", "<leader><tab>[" }, cmd = "<cmd>tabprevious<cr>", desc = "Previous tab" },
  { keys = { "n", "<leader>qq" }, cmd = "<cmd>qa<cr>", desc = "Quit all" },

  -- Code / LSP ----------------------------------------------------------
  { keys = { "n", "gD" }, cmd = vim.lsp.buf.declaration, desc = "LSP: Goto declaration" },
  {
    keys = { "n", "K" },
    cmd = function()
      vim.lsp.buf.hover()
    end,
    desc = "LSP: Hover",
  },
  {
    keys = { "n", "gK" },
    cmd = function()
      vim.lsp.buf.signature_help()
    end,
    desc = "LSP: Signature help",
  },
  { keys = { { "n", "x" }, "<leader>ca" }, cmd = vim.lsp.buf.code_action, desc = "LSP: Code action" },
  {
    keys = { "n", "<leader>cA" },
    cmd = function()
      vim.lsp.buf.code_action({ apply = true, context = { only = { "source" }, diagnostics = {} } })
    end,
    desc = "LSP: Source action",
  },
  { keys = { "n", "<leader>cr" }, cmd = vim.lsp.buf.rename, desc = "LSP: Rename symbol" },
  { keys = { { "n", "x" }, "<leader>cc" }, cmd = vim.lsp.codelens.run, desc = "LSP: Run codelens" },
  {
    keys = { "n", "<leader>cC" },
    cmd = function()
      vim.lsp.codelens.enable(not vim.lsp.codelens.is_enabled({ bufnr = 0 }), { bufnr = 0 })
    end,
    desc = "LSP: Toggle codelens (buffer)",
  },
  { keys = { "n", "<leader>cl" }, cmd = "<cmd>checkhealth vim.lsp<cr>", desc = "LSP: Info" },
  { keys = { "n", "<leader>cL" }, cmd = "<cmd>LspRestart<cr>", desc = "LSP: Restart" },
  { keys = { "n", "<leader>cwa" }, cmd = vim.lsp.buf.add_workspace_folder, desc = "LSP: Add workspace folder" },
  { keys = { "n", "<leader>cwr" }, cmd = vim.lsp.buf.remove_workspace_folder, desc = "LSP: Remove workspace folder" },
  {
    keys = { "n", "<leader>cwl" },
    cmd = function()
      vim.notify(table.concat(vim.lsp.buf.list_workspace_folders(), "\n"), vim.log.levels.INFO)
    end,
    desc = "LSP: List workspace folders",
  },
  {
    keys = { { "n", "x" }, "<leader>cf" },
    cmd = function()
      require("conform").format({ lsp_format = "fallback", timeout_ms = 5000 })
    end,
    desc = "Format buffer / selection",
  },
  {
    keys = { "n", "<leader>cJ" },
    cmd = function()
      if util.has("jq") then
        vim.cmd("%!jq .")
        vim.bo.filetype = "json"
      else
        vim.notify("jq not found", vim.log.levels.WARN)
      end
    end,
    desc = "Format buffer as JSON (jq)",
  },

  -- Diagnostics / quickfix ----------------------------------------------
  {
    keys = { "n", "<leader>cd" },
    cmd = function()
      vim.diagnostic.open_float()
    end,
    desc = "Line diagnostics",
  },
  { keys = { "n", "]d" }, cmd = diagnostic_goto(true), desc = "Next diagnostic" },
  { keys = { "n", "[d" }, cmd = diagnostic_goto(false), desc = "Prev diagnostic" },
  { keys = { "n", "]e" }, cmd = diagnostic_goto(true, "ERROR"), desc = "Next error" },
  { keys = { "n", "[e" }, cmd = diagnostic_goto(false, "ERROR"), desc = "Prev error" },
  { keys = { "n", "]w" }, cmd = diagnostic_goto(true, "WARN"), desc = "Next warning" },
  { keys = { "n", "[w" }, cmd = diagnostic_goto(false, "WARN"), desc = "Prev warning" },
  {
    keys = { "n", "<leader>xl" },
    cmd = toggle_list(vim.cmd.lopen, vim.cmd.lclose, function()
      return vim.fn.getloclist(0, { winid = 0 }).winid ~= 0
    end),
    desc = "Location list",
  },
  {
    keys = { "n", "<leader>xq" },
    cmd = toggle_list(vim.cmd.copen, vim.cmd.cclose, function()
      return vim.fn.getqflist({ winid = 0 }).winid ~= 0
    end),
    desc = "Quickfix list",
  },
  { keys = { "n", "[q" }, cmd = vim.cmd.cprev, desc = "Previous quickfix" },
  { keys = { "n", "]q" }, cmd = vim.cmd.cnext, desc = "Next quickfix" },

  -- UI ------------------------------------------------------------------
  { keys = { "n", "<leader>ui" }, cmd = vim.show_pos, desc = "Inspect position" },
  {
    keys = { "n", "<leader>uI" },
    cmd = function()
      vim.treesitter.inspect_tree()
      vim.api.nvim_input("I")
    end,
    desc = "Inspect tree",
  },
  {
    keys = { "n", "<leader>ur" },
    cmd = "<cmd>nohlsearch<bar>diffupdate<bar>normal! <C-L><cr>",
    desc = "Redraw / clear hlsearch / diff update",
  },
  { keys = { "n", "<leader>l" }, cmd = "<cmd>Lazy<cr>", desc = "Lazy" },
  { keys = { "n", "<leader>cm" }, cmd = "<cmd>Mason<cr>", desc = "Mason" },
})
