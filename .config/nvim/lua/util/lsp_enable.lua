-- Shared bookkeeping for servers turned on with vim.lsp.enable(), so
-- :LspMissing (plugins/lsp.lua) also sees servers enabled later, e.g. by
-- :SalesforceLspInstall.

local M = {}

---@type table<string, true>
M.enabled = {}

--- Enable servers that aren't enabled yet and record them
---@param names string[]
function M.enable(names)
  local ready = {}
  for _, name in ipairs(names) do
    if not M.enabled[name] then
      M.enabled[name] = true
      ready[#ready + 1] = name
    end
  end
  if #ready > 0 then
    vim.lsp.enable(ready)
  end
end

return M
