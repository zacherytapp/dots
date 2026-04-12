-- Python/uv integration for Neovim
-- Automatically detects uv projects and configures the virtual environment

local M = {}

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

--- Check if this is a uv project by looking for uv.lock or [tool.uv] in pyproject.toml
---@param root string Project root path
---@return boolean
local function is_uv_project(root)
	-- Check for uv.lock file
	if vim.fn.filereadable(root .. "/uv.lock") == 1 then
		return true
	end

	-- Check for [tool.uv] section in pyproject.toml
	local pyproject_path = root .. "/pyproject.toml"
	if vim.fn.filereadable(pyproject_path) == 1 then
		local content = vim.fn.readfile(pyproject_path)
		for _, line in ipairs(content) do
			if line:match("^%[tool%.uv%]") then
				return true
			end
		end
	end

	return false
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

	-- Set environment variables
	vim.env.VIRTUAL_ENV = venv
	vim.env.PATH = venv .. "/bin:" .. vim.env.PATH

	-- Notify LSP clients about the Python path change
	local python_path = venv .. "/bin/python"
	for _, client in pairs(vim.lsp.get_clients({ name = "pyright" })) do
		client.settings = vim.tbl_deep_extend("force", client.settings or {}, {
			python = {
				pythonPath = python_path,
			},
		})
		client.notify("workspace/didChangeConfiguration", { settings = client.settings })
	end
end

--- Setup autocmd for Python virtual environment detection
local function setup_autocmd()
	local group = vim.api.nvim_create_augroup("PythonVenvDetection", { clear = true })

	vim.api.nvim_create_autocmd("FileType", {
		group = group,
		pattern = "python",
		callback = activate_venv,
		desc = "Detect and activate Python virtual environment",
	})
end

--- Get info about the current Python environment (for statusline/debugging)
---@return table info Table with venv and project info
function M.get_venv_info()
	local bufpath = vim.fn.expand("%:p:h")
	local root = find_project_root(bufpath)
	local venv = root and find_venv(root)
	local is_uv = root and is_uv_project(root)

	return {
		root = root,
		venv = venv,
		is_uv = is_uv,
		active = vim.env.VIRTUAL_ENV == venv,
	}
end

-- Plugin spec for lazy.nvim
return {
	"nvim-lua/plenary.nvim", -- Using plenary as a dependency placeholder
	lazy = true,
	ft = { "python" },
	config = function()
		setup_autocmd()
		-- Activate immediately if we're already in a Python file
		if vim.bo.filetype == "python" then
			activate_venv()
		end
	end,
}
