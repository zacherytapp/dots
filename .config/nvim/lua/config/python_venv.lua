-- Python virtual environment detection
-- Activates the project's venv (.venv, venv, .virtualenv) when a Python buffer
-- opens, and points basedpyright at that interpreter.

--- Find the project root by looking for common Python project markers
---@param start_path string Starting directory for the search
---@return string|nil root Project root path or nil if not found
local function find_project_root(start_path)
  local markers = { "pyproject.toml", "setup.py", "setup.cfg", "requirements.txt", ".git" }
  local current = start_path

  while current ~= "/" do
    for _, marker in ipairs(markers) do
      if vim.fn.filereadable(current .. "/" .. marker) == 1 or vim.fn.isdirectory(current .. "/" .. marker) == 1 then
        return current
      end
    end
    current = vim.fn.fnamemodify(current, ":h")
  end
  return nil
end

--- Find the virtual environment path for a project
---@param root string Project root path
---@return string|nil venv_path Path to the virtual environment or nil if not found
local function find_venv(root)
  -- Common venv locations in order of preference
  local venv_paths = {
    root .. "/.venv",
    root .. "/venv",
    root .. "/.virtualenv",
  }

  for _, venv_path in ipairs(venv_paths) do
    local python_path = venv_path .. "/bin/python"
    if vim.fn.executable(python_path) == 1 then
      return venv_path
    end
  end

  return nil
end

--- Activate the virtual environment for the current buffer
local function activate_venv()
  local bufpath = vim.fn.expand("%:p:h")
  if bufpath == "" then
    return
  end

  local root = find_project_root(bufpath)
  if not root then
    return
  end

  local venv = find_venv(root)
  if not venv then
    return
  end

  -- Set environment variables. Guard against re-prepending: this runs on every
  -- python FileType event, which would otherwise grow $PATH without bound.
  local venv_bin = venv .. "/bin"
  if vim.env.VIRTUAL_ENV ~= venv or not vim.startswith(vim.env.PATH or "", venv_bin .. ":") then
    vim.env.VIRTUAL_ENV = venv
    local entries = vim.split(vim.env.PATH or "", ":", { plain = true })
    entries = vim.tbl_filter(function(e)
      return e ~= "" and e ~= venv_bin
    end, entries)
    table.insert(entries, 1, venv_bin)
    vim.env.PATH = table.concat(entries, ":")
  end

  -- Notify LSP clients about the Python path change
  local python_path = venv .. "/bin/python"
  for _, client in ipairs(vim.lsp.get_clients()) do
    if client.name == "basedpyright" or client.name == "pyright" then
      client.settings = vim.tbl_deep_extend("force", client.settings or {}, {
        python = {
          pythonPath = python_path,
        },
      })
      client:notify("workspace/didChangeConfiguration", { settings = client.settings })
    end
  end
end

vim.api.nvim_create_autocmd("FileType", {
  group = vim.api.nvim_create_augroup("PythonVenvDetection", { clear = true }),
  pattern = "python",
  callback = activate_venv,
  desc = "Detect and activate Python virtual environment",
})
