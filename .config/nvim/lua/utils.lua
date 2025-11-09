local M = {}

local telescope = require("telescope.builtin")
local extension = require("telescope").extensions

local height = 0.85
local width = 0.85
local preview_width = 0.6
local ignore_patterns = {
	"%.pdf",
	"%.py",
	"%.ipynb",
	"%.gif",
	"%.GIF",
	"%.log",
	"%.aux",
	"%.out",
	"%.png",
	"%.fdb_latexmk",
	"%.fls",
	"%.tex~",
	"%.texl1#",
	"%.dvi",
	"%.jpg",
	"%.jpeg",
	"%_region_",
	"%.mat",
}

function M.find_files()
	telescope.find_files({
		prompt_title = "Files",
		results_title = "",
		preview_title = "",
		path_display = { "truncate" },
		layout_config = {
			width = width,
			height = height,
			preview_width = preview_width,
		},
	})
end

function M.search_buffers()
	telescope.buffers({
		preview_title = "",
		prompt_title = "Buffers",
		results_title = "",
		path_display = { "truncate" },
		sort_mru = true,
		sort_lastused = true,
		layout_config = {
			prompt_position = "bottom",
			width = width,
			height = height,
			preview_width = preview_width,
		},
	})
end

function M.search_builtins()
	telescope.builtin({
		previewer = false,
		layout_config = {
			width = width,
			height = height,
			preview_width = preview_width,
		},
	})
end

function M.live_grep()
	telescope.live_grep({
		results_title = "",
		preview_title = "",
		prompt_title = "Live grep",
		layout_config = {
			width = width,
			height = height,
			preview_width = preview_width,
		},
	})
end

function M.grep_string()
	telescope.grep_string({
		prompt_title = "Grep string",
		preview_title = "",
		results_title = "",
		layout_config = {
			width = width,
			height = height,
			preview_width = preview_width,
		},
	})
end

function M.buffer_fuzzy_search()
	telescope.current_buffer_fuzzy_find({
		prompt_title = "Buffer search",
		preview_title = "",
		results_title = "",
		layout_config = {
			width = width,
			height = height,
			preview_width = preview_width,
		},
	})
end

function M.search_history()
	telescope.command_history({
		results_title = "",
		prompt_title = "",
		prompt_prefix = ":",
		layout_config = {
			width = width,
			height = height,
			preview_width = preview_width,
		},
	})
end

function M.current_buffer_diagnostics()
	telescope.diagnostics({
		bufnr = 0,
		results_title = "",
		prompt_title = "Buffer diagnostics",
		preview_title = "",
		layout_config = {
			width = width,
			height = height,
			preview_width = preview_width,
		},
	})
end

function M.all_diagnostics()
	telescope.diagnostics({
		results_title = "",
		prompt_title = "Diagnostics",
		preview_title = "",
		layout_config = {
			width = width,
			height = height,
			preview_width = preview_width,
		},
	})
end

function M.search_help()
	telescope.help_tags({
		results_title = "",
		prompt_title = "Neovim help",
		preview_title = "",
		layout_config = {
			width = width,
			height = height,
			preview_width = preview_width,
		},
	})
end

function M.oldfiles()
	telescope.oldfiles({
		prompt_title = "Recent files",
		preview_title = "",
		results_title = "",
		path_display = { "truncate" },
		layout_config = {
			width = width,
			height = height,
			preview_width = preview_width,
		},
	})
end

-- Search other directories
function M.search_projects_dir()
	telescope.find_files({
		cwd = "~/projects/",
		results_title = "",
		preview_title = "",
		prompt_title = "Projects",
		path_display = { "truncate" },
		layout_config = {
			width = width,
			height = height,
			preview_width = preview_width,
		},
	})
end

function M.search_reference()
	telescope.find_files({
		cwd = "~/projects/ref",
		results_title = "",
		preview_title = "",
		prompt_title = "Projects",
		path_display = { "truncate" },
		layout_config = {
			width = width,
			height = height,
			preview_width = preview_width,
		},
	})
end

function M.search_notes()
	telescope.find_files({
		cwd = "~/Documents/work/",
		results_title = "",
		preview_title = "",
		prompt_title = "Notes",
		path_display = { "tail" },
		file_ignore_patterns = ignore_patterns,
		layout_config = {
			width = width,
			height = height,
			preview_width = preview_width,
		},
	})
end

-- Utilities
function M.keymaps()
	telescope.keymaps({
		layout_config = {
			width = width,
			height = height,
			preview_width = preview_width,
		},
	})
end

function M.notifications()
	extension.notify.notify({
		prompt_title = "Notifications",
		results_title = "",
		preview_title = "",
		layout_config = {
			width = width,
			height = height,
			preview_width = preview_width,
		},
	})
end

return M
