local ts_utils = require("nvim-treesitter.ts_utils")

local M = {}

function M.parent_pattern_exists(root_patterns)
	return vim.fs.dirname(vim.fs.find(root_patterns, { upward = true })[1])
end

function M.is_worktree()
	return M.parent_pattern_exists({ "packed-refs" }) ~= nil
end

function M.is_submodule()
	return M.parent_pattern_exists({ ".gitmodules" }) ~= nil
end

-- Find nodes by type
local function find_parent_by_type(expr, type_name)
	while expr do
		if expr:type() == type_name then
			break
		end
		expr = expr:parent()
	end
	return expr
end

-- Find child nodes by type
local function find_child_by_type(expr, type_name)
	local id = 0
	local expr_child = expr:child(id)
	while expr_child do
		if expr_child:type() == type_name then
			break
		end
		id = id + 1
		expr_child = expr:child(id)
	end

	return expr_child
end

-- Get Current Method Name
function M.get_current_method_name()
	local current_node = ts_utils.get_node_at_cursor()
	if not current_node then
		return nil
	end

	local expr = find_parent_by_type(current_node, "method_declaration")
	if not expr then
		return nil
	end

	local child = find_child_by_type(expr, "identifier")
	if not child then
		return nil
	end
	return vim.treesitter.get_node_text(child, 0)
end

-- Get Current Class Name
function M.get_current_class_name()
	local current_node = ts_utils.get_node_at_cursor()
	if not current_node then
		return nil
	end

	local class_declaration = find_parent_by_type(current_node, "class_declaration")
	if not class_declaration then
		return nil
	end

	local child = find_child_by_type(class_declaration, "identifier")
	if not child then
		return nil
	end
	return vim.treesitter.get_node_text(child, 0)
end

-- Get Current Full Method Name with delimiter or default '.'
function M.get_current_full_method_name(delimiter)
	delimiter = delimiter or "."
	local full_class_name = M.get_current_class_name()
	local method_name = M.get_current_method_name()
	return full_class_name .. delimiter .. method_name
end

function M.setup_tmux(file_to_search, script_to_run)
	local tmux_running = os.execute("tmux ls | grep attached")
	if tmux_running ~= nil then
		local f = io.open(file_to_search, "r")
		if f ~= nil then
			io.close(f)
			os.execute(script_to_run)
		end
	end
end

function M.get_tmux_window_id(window_name)
	-- Execute tmux command to get the window ID
	local handle = io.popen('tmux list-windows -F "#{window_name}:#{window_id}"')
	if not handle then
		return nil
	end
	local result = handle:read("*a")
	handle:close()

	-- Iterate over the result to find the matching window name
	for line in result:gmatch("[^\r\n]+") do
		local name, id = line:match("^([^:]+):(.+)$")
		if name == window_name then
			return id
		end
	end

	return nil
end

local function get_tmux_pane_id(pane_title)
	local handle = io.popen('tmux list-panes -a -F "#{pane_title}:#{pane_id}"')
	if not handle then
		return nil
	end
	local result = handle:read("*a")
	handle:close()

	for line in result:gmatch("[^\r\n]+") do
		local title, id = line:match("^([^:]+):(.+)$")
		if title == pane_title then
			return id
		end
	end
	return nil
end

function M.run_command_in_pane(pane_title, command)
	local pane_id = get_tmux_pane_id(pane_title)
	if pane_id then
		os.execute("tmux send-keys -t " .. pane_id .. ' "' .. command .. '" Enter')
		print("Command sent to pane with title: " .. pane_title)
	else
		print("No pane found with title: " .. pane_title)
	end
end

return M
