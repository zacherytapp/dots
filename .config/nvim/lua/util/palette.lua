-- Command palette (<leader>k): a fuzzy-searchable list of every described
-- normal- and visual-mode keymap (global + current buffer, including lazy.nvim
-- `keys` that haven't loaded their plugin yet) plus palette-only commands.
-- Visual-only keymaps run on the last visual selection (gv).
--
-- Palette-only commands live on the plugin's lazy spec, next to its `keys`:
--   palette = { { desc = "Trouble: Document symbols", cmd = "<cmd>Trouble symbols toggle<cr>" } }
-- `cmd` is a function, a key sequence ("<cmd>...<cr>", ":..."), or an Ex command.
-- Plugin-less commands can be registered with require("util.palette").add({...}).
--
-- Everything is collected when the palette opens, so it costs nothing at startup.
local M = {}

---@class PaletteItem
---@field desc string
---@field cmd? string|fun()
---@field keys? string display form of the lhs
---@field lhsraw? string
---@field cat? string
---@field buf? integer
---@field mode? string "n" or "x"

---@type PaletteItem[]
local extra = {}

--- Keymaps with a desc that still shouldn't be listed (motions, scroll helpers)
M.hidden = {
  ["j"] = true,
  ["k"] = true,
  ["n"] = true,
  ["N"] = true,
  ["<C-F>"] = true,
  ["<C-B>"] = true,
}

---@param items PaletteItem[]
function M.add(items)
  vim.list_extend(extra, items)
end

--- "<Space>sg" -> "<leader>sg"
local function display(lhs)
  local leader = vim.g.mapleader or "\\"
  for _, prefix in ipairs({ leader, leader == " " and "<Space>" or nil }) do
    if vim.startswith(lhs, prefix) then
      lhs = "<leader>" .. lhs:sub(#prefix + 1)
      break
    end
  end
  return (lhs:gsub(" ", "<Space>"))
end

--- "<mode><lhs raw keycodes>" -> lazy plugin name, from every spec's `keys`
local function key_owners()
  local Plugin = require("lazy.core.plugin")
  local Keys = require("lazy.core.handler.keys")
  local owners = {}
  for name, plugin in pairs(require("lazy.core.config").plugins) do
    for _, k in pairs(Keys.resolve(Plugin.values(plugin, "keys", true))) do
      owners[k.mode .. vim.keycode(k.lhs)] = name
    end
  end
  return owners
end

---@return PaletteItem[]
function M.items()
  local items, seen = {}, {}
  local owners = key_owners()
  local buf = vim.api.nvim_get_current_buf()

  -- normal mode first (a visual map with the same lhs is then skipped), and
  -- buffer-local before global: they shadow globals with the same lhs
  for _, mode in ipairs({ "n", "x" }) do
    local maps = vim.list_extend(vim.api.nvim_buf_get_keymap(buf, mode), vim.api.nvim_get_keymap(mode))
    for _, m in ipairs(maps) do
      local desc = m.desc
      if
        desc
        and desc ~= ""
        and desc ~= "which_key_ignore"
        -- Neovim's own default maps describe themselves as ":help ..." / ":cnext"
        and not vim.startswith(desc, ":")
        and not m.lhs:find("^<Plug>")
        and not m.lhs:find("^<SNR>")
        and not M.hidden[m.lhs]
        -- skip shadowed maps, and visual twins of a normal map doing the same thing
        and not seen[mode .. m.lhsraw]
        and not (mode == "x" and seen["n" .. m.lhsraw] == desc)
      then
        seen[mode .. m.lhsraw] = desc
        items[#items + 1] = {
          desc = desc,
          keys = display(m.lhs) .. (mode == "x" and " (visual)" or ""),
          lhsraw = m.lhsraw,
          mode = mode,
          cat = owners[mode .. m.lhsraw] or (m.buffer ~= 0 and "buffer" or ""),
          buf = m.buffer ~= 0 and buf or nil,
        }
      end
    end
  end

  local Plugin = require("lazy.core.plugin")
  for name, plugin in pairs(require("lazy.core.config").plugins) do
    for _, item in ipairs(Plugin.values(plugin, "palette", true)) do
      items[#items + 1] = vim.tbl_extend("keep", { cat = name }, item)
    end
  end
  for _, item in ipairs(extra) do
    items[#items + 1] = item
  end

  table.sort(items, function(a, b)
    return a.desc:lower() < b.desc:lower()
  end)
  return items
end

---@param item PaletteItem
function M.run(item)
  if item.lhsraw then
    -- replay the mapping itself, so expr/remap/lazy-loading stubs behave as if typed
    local prefix = item.mode == "x" and "gv" or ""
    return vim.api.nvim_feedkeys(prefix .. item.lhsraw, "m", false)
  end
  local cmd = item.cmd
  if type(cmd) == "function" then
    return cmd()
  elseif type(cmd) == "string" then
    if cmd:find("^<") or cmd:find("^:") then
      return vim.api.nvim_feedkeys(vim.keycode(cmd), "n", false)
    end
    return vim.cmd(cmd)
  end
end

function M.show()
  local items = M.items()
  local w_desc, w_keys = 0, 0
  for _, item in ipairs(items) do
    w_desc = math.max(w_desc, vim.fn.strdisplaywidth(item.desc))
    w_keys = math.max(w_keys, vim.fn.strdisplaywidth(item.keys or ""))
  end
  w_desc = math.min(w_desc, 60)
  local function pad(s, w)
    return s .. string.rep(" ", math.max(w - vim.fn.strdisplaywidth(s), 0))
  end
  vim.ui.select(items, {
    prompt = "Commands",
    format_item = function(item)
      return ("%s  %s  %s"):format(pad(item.desc, w_desc), pad(item.keys or "", w_keys), item.cat or "")
    end,
  }, function(item)
    if item then
      -- let the picker close and focus return to the original window first
      vim.schedule(function()
        M.run(item)
      end)
    end
  end)
end

return M
