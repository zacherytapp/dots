local config = {
	width = 0.8,
	height = 0.7,
	commmand = nil,
	border = "rounded",
	position = "center",
	hidden = false,
	style = "minimal",
}

local state = {
	buf = nil,
	win = nil,
	job_id = nil,
	term_chan = nil,
	is_open = false,
}

local function bottom_defualt_config()
	config.width = 1
	config.height = 0.2
	config.command = nil
	config.border = "rounded"
	config.position = "bottom"
end

local function right_defualt_config()
	config.width = 0.3
	config.height = 1
	config.command = nil
	config.border = "rounded"
	config.position = "right"
end

local function right_half_config()
	config.width = 0.5
	config.height = 1
	config.command = nil
	config.border = "rounded"
	config.position = "right"
end

local function create_floating_window(buf, width, height, position)
	local win_width
	local win_height

	win_width = math.floor(vim.o.columns * width)
	win_height = math.floor(vim.o.lines * height)

	local row, col
	if position == "center" then
		row = math.floor((vim.o.lines - win_height) / 2)
		col = math.floor((vim.o.columns - win_width) / 2)
	elseif position == "bottom" then
		row = vim.o.lines - win_height - 1
		col = math.floor((vim.o.columns - win_width) / 2)
	elseif position == "left" then
		row = math.floor((vim.o.lines - win_height) / 2)
		col = 0
	elseif position == "right" then
		row = math.floor((vim.o.lines - win_height) / 2)
		col = vim.o.columns - win_width
	end

	local win_opts = {
		relative = "editor",
		row = row,
		col = col,
		width = win_width,
		height = win_height,
		style = "minimal",
		border = config.border,
	}

	local win_id = vim.api.nvim_open_win(buf, true, win_opts)
	vim.api.nvim_win_set_option(win_id, "winhl", "Normal:FloatTermNormal,FloatBorder:FloatTermBorder")

	return win_id
end

local function open_terminal(opts)
	opts = opts or {}
	local width = opts.width or config.width
	local height = opts.height or config.height
	local command = opts.command or config.command
	local position = opts.position or config.position

	if state.is_open and vim.api.nvim_win_is_valid(state.win) then
		vim.api.nvim_set_current_win(state.win)
		return
	end

	if not state.buf or not vim.api.nvim_buf_is_valid(state.buf) then
		state.buf = vim.api.nvim_create_buf(false, true)
		vim.api.nvim_set_option_value("bufhidden", "hide", { buf = state.buf })
		vim.api.nvim_set_option_value("buflisted", true, { buf = state.buf })
	end

	state.win = create_floating_window(state.buf, width, height, position)
	state.is_open = true

	if not state.job_id or not vim.fn.jobwait({ state.job_id }, 0)[1] == -1 then
		local shell = vim.o.shell

		state.job_id = vim.fn.termopen(shell, {
			on_exit = function()
				state.job_id = nil
			end,
		})

		state.term_chan = vim.b.terminal_job_id

		if command then
			vim.cmd("startinsert")
			vim.api.nvim_chan_send(state.term_chan, command .. "\n")
		else
			vim.cmd("startinsert")
		end
	else
		vim.cmd("startinsert")
	end

	vim.api.nvim_buf_set_keymap(state.buf, "t", "<esc><esc>", "<c-\\><c-n>", { noremap = true, silent = true })
end

local function close_terminal()
	if state.is_open and state.win and vim.api.nvim_win_is_valid(state.win) then
		vim.api.nvim_win_close(state.win, true)
		state.is_open = false
		state.win = nil
	end
end

local function toggle_terminal(opts)
	if state.is_open and state.win and vim.api.nvim_win_is_valid(state.win) then
		close_terminal()
	else
		open_terminal(opts)
	end

	return state
end

vim.api.nvim_create_user_command("FloatyBottomToggle", function()
	bottom_defualt_config()
	state = toggle_terminal()
end, {})

vim.api.nvim_create_user_command("FloatyRightHalfToggle", function()
	right_half_config()
	state = toggle_terminal()
end, {})

vim.api.nvim_create_user_command("FloatyRightToggle", function()
	right_defualt_config()
	state = toggle_terminal()
end, {})

vim.api.nvim_create_user_command("FloatyToggle", function()
	state = toggle_terminal()
end, {})

return {}
