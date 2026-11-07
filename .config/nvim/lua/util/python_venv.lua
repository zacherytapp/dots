-- Python virtual environment detection
-- Activates the project's venv (.venv, venv, .virtualenv) when a Python buffer
-- opens (called from after/ftplugin/python.lua), and points basedpyright at
-- that interpreter. Each venv must be trusted once via the :trust prompt before
-- it is activated. A venv chosen with venv-selector (<leader>cv) or inherited
-- from the shell is left alone: only a $VIRTUAL_ENV this module set itself is
-- replaced.

local root_markers = { "pyproject.toml", "setup.py", "setup.cfg", "requirements.txt", ".git" }

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

-- Venvs already prompted for this session, so an "ignore" answer isn't asked
-- again for every python buffer in the same project.
local prompted = {}

--- Whether the user trusts this venv. Activation puts venv/bin first on $PATH
--- and runs venv/bin/python via the LSP, so a cloned repo could otherwise ship
--- its own git/rg/python and have Neovim run it. Uses the :trust database;
--- revoke with `:trust ++remove <venv>`.
---@param venv string
---@return boolean
local function is_trusted(venv)
  if prompted[venv] ~= nil then
    return prompted[venv]
  end
  local ok, trusted = pcall(vim.secure.read, venv)
  prompted[venv] = ok and trusted == true
  return prompted[venv]
end

-- The venv this module activated last (nil until it activates one)
local auto_venv

--- Activate the virtual environment for a buffer
---@param buf integer
local function activate_venv(buf)
  -- $VIRTUAL_ENV set by anything else (venv-selector, the shell) wins
  if vim.env.VIRTUAL_ENV and vim.env.VIRTUAL_ENV ~= auto_venv then
    return
  end

  local bufname = vim.api.nvim_buf_get_name(buf)
  if bufname == "" then
    return
  end

  local root = vim.fs.root(bufname, root_markers)
  if not root then
    return
  end

  local venv = find_venv(root)
  if not venv or not is_trusted(venv) then
    return
  end

  -- Set environment variables. Guard against re-prepending: this runs on every
  -- python FileType event, which would otherwise grow $PATH without bound.
  local venv_bin = venv .. "/bin"
  if vim.env.VIRTUAL_ENV ~= venv or not vim.startswith(vim.env.PATH or "", venv_bin .. ":") then
    vim.env.VIRTUAL_ENV = venv
    auto_venv = venv
    local entries = vim.split(vim.env.PATH or "", ":", { plain = true })
    entries = vim.tbl_filter(function(e)
      return e ~= "" and e ~= venv_bin
    end, entries)
    table.insert(entries, 1, venv_bin)
    vim.env.PATH = table.concat(entries, ":")
  end

  -- Notify LSP clients about the Python path change
  local python_path = venv .. "/bin/python"
  for _, name in ipairs({ "basedpyright", "pyright" }) do
    for _, client in ipairs(vim.lsp.get_clients({ name = name })) do
      client.settings = vim.tbl_deep_extend("force", client.settings or {}, {
        python = {
          pythonPath = python_path,
        },
      })
      client:notify("workspace/didChangeConfiguration", { settings = client.settings })
    end
  end
end

local M = {}

--- Activate the project's venv for a python buffer
---@param buf? integer defaults to the current buffer
function M.activate(buf)
  activate_venv(buf or vim.api.nvim_get_current_buf())
end

return M
