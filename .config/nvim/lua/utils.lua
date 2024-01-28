local function update_modified_timestamp()
	local bufnr = vim.api.nvim_get_current_buf()
	local lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)
	for i, line in ipairs(lines) do
		if line:find("@modified: ") then
			local new_line = line:gsub("@modified: .+", "@modified: " .. os.date("%Y-%m-%d %H:%M:%S"))
			vim.api.nvim_buf_set_lines(bufnr, i - 1, i, false, { new_line })
			return
		elseif line:find("@modified on: ") then
			local new_line = line:gsub("@modified on: .+", "@modified on: " .. os.date("%Y-%m-%d %H:%M:%S"))
			vim.api.nvim_buf_set_lines(bufnr, i - 1, i, false, { new_line })
			return
		elseif line:find("@last modified on: ") then
			local new_line = line:gsub("@last modified on: .+", "@last modified on: " .. os.date("%Y-%m-%d %H:%M:%S"))
			vim.api.nvim_buf_set_lines(bufnr, i - 1, i, false, { new_line })
			return
		elseif line:find("@modified by: ") then
			local new_line = line:gsub("@modified by: .+", "@modified by: Zakk Tapp, Craftsman Technology Group")
			vim.api.nvim_buf_set_lines(bufnr, i - 1, i, false, { new_line })
			return
		elseif line:find("@modified by: ") then
			local new_line = line:gsub("@last modified by: .+", "@modified by: Zakk Tapp, Craftsman Technology Group")
			vim.api.nvim_buf_set_lines(bufnr, i - 1, i, false, { new_line })
			return
		end
	end
end

vim.api.nvim_create_autocmd("BufWritePre", {
	pattern = { "*.cls", "*.trigger" },
	callback = update_modified_timestamp,
})
