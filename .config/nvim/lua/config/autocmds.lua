-- Autocmds are automatically loaded on the VeryLazy event
-- Default autocmds that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/autocmds.lua
-- Add any additional autocmds here
local function update_modified_timestamp()
  -- Get the current buffer
  local bufnr = vim.api.nvim_get_current_buf()
  -- Search for the pattern '@modified: ' in the buffer
  local lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)
  for i, line in ipairs(lines) do
    if line:find("@modified: ") then
      local new_line = line:gsub("@modified: .+", "@modified: " .. os.date("%Y-%m-%d %H:%M:%S"))
      vim.api.nvim_buf_set_lines(bufnr, i - 1, i, false, { new_line })
      return -- Exit after the first replacement
    elseif line:find("@modified on: ") then
      local new_line = line:gsub("@modified on: .+", "@modified on: " .. os.date("%Y-%m-%d %H:%M:%S"))
      vim.api.nvim_buf_set_lines(bufnr, i - 1, i, false, { new_line })
      return -- Exit after the first replacement
    elseif line:find("@last modified on: ") then
      local new_line = line:gsub("@last modified on: .+", "@last modified on: " .. os.date("%Y-%m-%d %H:%M:%S"))
      vim.api.nvim_buf_set_lines(bufnr, i - 1, i, false, { new_line })
      return -- Exit after the first replacement
    elseif line:find("@modified by: ") then
      local new_line = line:gsub("@modified by: .+", "@modified by: Zakk Tapp, Craftsman Technology Group")
      vim.api.nvim_buf_set_lines(bufnr, i - 1, i, false, { new_line })
      return -- Exit after the first replacement
    elseif line:find("@modified by: ") then
      local new_line = line:gsub("@last modified by: .+", "@modified by: Zakk Tapp, Craftsman Technology Group")
      vim.api.nvim_buf_set_lines(bufnr, i - 1, i, false, { new_line })
      return -- Exit after the first replacement
    end
  end
end

-- Autocommand that updates the timestamp before saving
vim.api.nvim_create_autocmd("BufWritePre", {
  pattern = { "*.cls", "*.trigger" }, -- This will apply to all files, you can restrict it with specific file patterns
  callback = update_modified_timestamp,
})
