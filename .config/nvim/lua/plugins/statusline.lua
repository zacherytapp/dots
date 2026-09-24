local icons = require("assets").icons

local function sf_org()
  local ok, sf = pcall(require, "sf")
  if not ok then
    return ""
  end
  local ok_org, org = pcall(sf.get_target_org)
  if not ok_org or type(org) ~= "string" or org == "" then
    return ""
  end
  local ok_cov, coverage = pcall(sf.covered_percent)
  if ok_cov and type(coverage) == "string" and coverage ~= "" then
    return org .. " (" .. coverage .. ")"
  end
  return org
end

local function recording()
  local reg = vim.fn.reg_recording()
  return reg ~= "" and ("Recording @" .. reg) or ""
end

--- Project root name when it differs from the cwd
local function root_dir()
  local root = require("util").root()
  local cwd = vim.uv.cwd() or ""
  if root == cwd then
    return ""
  end
  return "󱉭 " .. vim.fs.basename(root)
end

local function lsp_clients()
  local names = {}
  for _, client in ipairs(vim.lsp.get_clients({ bufnr = 0 })) do
    names[#names + 1] = client.name
  end
  return #names > 0 and (icons.lsp .. table.concat(names, " ")) or ""
end

return {
  {
    "nvim-lualine/lualine.nvim",
    cond = not vim.g.vscode,
    event = "VeryLazy",
    init = function()
      vim.g.lualine_laststatus = vim.o.laststatus
      if vim.fn.argc(-1) > 0 then
        vim.o.statusline = " " -- blank statusline until lualine loads
      else
        vim.o.laststatus = 0 -- hide on the dashboard
      end
    end,
    opts = function()
      vim.o.laststatus = vim.g.lualine_laststatus
      local trouble = require("trouble")
      local symbols = trouble.statusline({
        mode = "symbols",
        groups = {},
        title = false,
        filter = { range = true },
        format = "{kind_icon}{symbol.name:Normal}",
        hl_group = "lualine_c_normal",
      })

      return {
        options = {
          theme = "auto",
          globalstatus = true,
          section_separators = { left = "\u{e0b0}", right = "\u{e0b2}" },
          component_separators = { left = "\u{e0b1}", right = "\u{e0b3}" },
          disabled_filetypes = { statusline = { "snacks_dashboard", "lazy" } },
        },
        sections = {
          lualine_a = {
            "mode",
            { recording, color = { fg = "#ea6962" } },
          },
          lualine_b = { "branch" },
          lualine_c = {
            { root_dir, color = { fg = "#928374" } },
            {
              "diagnostics",
              symbols = { error = icons.error, warn = icons.warning, info = icons.info, hint = icons.hint },
            },
            { "filetype", icon_only = true, separator = "", padding = { left = 1, right = 0 } },
            { "filename", path = 1, symbols = { modified = " ●", readonly = " \u{f023}", unnamed = "" } },
            { sf_org, icon = { "󰢎", color = { fg = "#009ddc" } } },
            { symbols.get, cond = symbols.has },
          },
          lualine_x = {
            {
              function()
                return require("noice").api.status.command.get()
              end,
              cond = function()
                return package.loaded["noice"] and require("noice").api.status.command.has()
              end,
              color = { fg = "#d3869b" },
            },
            {
              function()
                return require("noice").api.status.mode.get()
              end,
              cond = function()
                return package.loaded["noice"] and require("noice").api.status.mode.has()
              end,
              color = { fg = "#e78a4e" },
            },
            {
              function()
                return "\u{f188} " .. require("dap").status()
              end,
              cond = function()
                return package.loaded["dap"] and require("dap").status() ~= ""
              end,
              color = { fg = "#ea6962" },
            },
            {
              require("lazy.status").updates,
              cond = require("lazy.status").has_updates,
              color = { fg = "#e78a4e" },
            },
            { lsp_clients, color = { fg = "#7daea3" } },
            {
              "diff",
              symbols = { added = icons.added, modified = icons.modified, removed = icons.deleted },
              source = function()
                local gitsigns = vim.b.gitsigns_status_dict
                if gitsigns then
                  return { added = gitsigns.added, modified = gitsigns.changed, removed = gitsigns.removed }
                end
              end,
            },
          },
          lualine_y = {
            { "progress", separator = " ", padding = { left = 1, right = 0 } },
            { "location", padding = { left = 0, right = 1 } },
          },
          lualine_z = {
            function()
              return "\u{f017} " .. os.date("%R")
            end,
          },
        },
        extensions = {
          "neo-tree",
          "lazy",
          "fzf",
          "trouble",
          "oil",
          "quickfix",
          "man",
          "mason",
          "nvim-dap-ui",
          "overseer",
        },
      }
    end,
    config = function(_, opts)
      local lualine = require("lualine")
      lualine.setup(opts)
      vim.api.nvim_create_autocmd({ "RecordingEnter", "RecordingLeave" }, {
        group = vim.api.nvim_create_augroup("user_lualine_recording", { clear = true }),
        callback = function()
          vim.schedule(function()
            lualine.refresh({ place = { "statusline" } })
          end)
        end,
      })
    end,
  },
}
