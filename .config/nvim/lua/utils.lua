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
