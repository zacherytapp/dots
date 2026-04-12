local icons = require("assets").icons

local sf_org = function()
	local function get_org()
		return require("sf").get_target_org()
	end
	if pcall(get_org) then
		local org = get_org()
		local coverage = require("sf").covered_percent()
		if coverage ~= "" then
			return org .. " (" .. coverage .. ")"
		else
			return org
		end
	else
		return ""
	end
end

local recording = function()
	local reg = vim.fn.reg_recording()
	if reg ~= "" then
		return "Recording @" .. reg
	else
		return ""
	end
end

return {
	{
		"nvim-lualine/lualine.nvim",
		cond = not vim.g.vscode,
		event = "VeryLazy",
		opts = function(plugin)
			if plugin.override then
				require("lazyvim.util").deprecate("lualine.override", "lualine.opts")
			end

			return {
				options = {
					theme = "auto",
					icons_enabled = true,
					section_separators = { right = "", left = "" },
					-- section_separators = { left = "", right = "" },
					-- component_separators = { left = "", right = "" },
					globalstatus = true,
					component_separators = { left = "", right = "" },
					disabled_filetypes = { statusline = { "dashboard", "lazy", "alpha" } },
				},
				lualine_a = {
					{ "mode" },
					{ recording, color = { fg = "#E46876" } },
				},
				lualine_b = {
					"branch",
					{ "diff", symbols = { added = " ", modified = " ", removed = "󰮉 " } },
					"diagnostics",
				},
				lualine_c = {
					{ "filename", path = 1 },
					{ sf_org, icon = { "󰢎 ", color = { fg = "#009ddc" } } },
					"searchcount",
				},
				lualine_x = {
					"fileformat",
					"filetype",
				},
				lualine_y = {
					"progress",
				},
				lualine_z = {
					"location",
					"%l/%L:%c",
				},
			}
		end,
		config = function(_, opts)
			local lualine = require("lualine")
			lualine.setup(opts)
			vim.api.nvim_create_autocmd("RecordingEnter", {
				callback = function()
					lualine.refresh({ place = { "lualine_a" } })
				end,
			})
		end,
	},
}
