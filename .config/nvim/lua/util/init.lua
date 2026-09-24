-- Small helpers shared by the plugin specs (LazyVim-style root detection and
-- format toggles, without depending on LazyVim itself).
local M = {}

M.root_markers = {
  ".git",
  "sfdx-project.json",
  "go.work",
  "go.mod",
  "Cargo.toml",
  "pyproject.toml",
  "package.json",
  "lua",
}

--- Project root for the current buffer: the attached LSP's workspace folder,
--- then the nearest root marker, then the cwd.
---@param buf? integer
---@return string
function M.root(buf)
  buf = (buf == nil or buf == 0) and vim.api.nvim_get_current_buf() or buf
  local path = vim.api.nvim_buf_get_name(buf)
  path = path ~= "" and vim.fs.normalize(path) or nil
  if path then
    for _, client in ipairs(vim.lsp.get_clients({ bufnr = buf })) do
      -- copilot's workspace is whatever repo it was started in
      local folders = client.name ~= "copilot" and client.workspace_folders or {}
      for _, ws in ipairs(folders) do
        local dir = vim.uri_to_fname(ws.uri)
        if vim.startswith(path, dir .. "/") then
          return dir
        end
      end
    end
    local root = vim.fs.root(path, M.root_markers)
    if root then
      return root
    end
  end
  return vim.uv.cwd() or "."
end

--- Is format-on-save enabled for this buffer? (buffer setting wins over global)
---@param buf? integer
function M.autoformat_enabled(buf)
  buf = (buf == nil or buf == 0) and vim.api.nvim_get_current_buf() or buf
  local b = vim.b[buf].autoformat
  if b ~= nil then
    return b
  end
  return vim.g.autoformat ~= false
end

--- Snacks toggle for format-on-save (buffer or global)
---@param buffer? boolean
function M.format_toggle(buffer)
  return Snacks.toggle({
    name = "Auto Format (" .. (buffer and "Buffer" or "Global") .. ")",
    get = function()
      if buffer then
        return M.autoformat_enabled()
      end
      return vim.g.autoformat ~= false
    end,
    set = function(state)
      if buffer then
        vim.b.autoformat = state
      else
        vim.g.autoformat = state
        vim.b.autoformat = nil
      end
    end,
  })
end

--- Run `fn(client, buf)` whenever an LSP client (optionally by name) attaches
---@param fn fun(client: vim.lsp.Client, buf: integer)
---@param name? string
function M.on_attach(fn, name)
  return vim.api.nvim_create_autocmd("LspAttach", {
    callback = function(args)
      local client = vim.lsp.get_client_by_id(args.data.client_id)
      if client and (not name or client.name == name) then
        fn(client, args.buf)
      end
    end,
  })
end

--- Is `cmd` runnable (on PATH or an absolute executable path)?
---@param cmd string
function M.has(cmd)
  return vim.fn.executable(cmd) == 1
end

return M
