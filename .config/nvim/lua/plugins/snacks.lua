local function fzf(picker, opts)
  return ("<cmd>lua require('fzf-lua').%s(%s)<cr>"):format(picker, opts or "")
end

return {
  {
    "folke/snacks.nvim",
    priority = 1000,
    lazy = false,
    ---@type snacks.Config
    opts = {
      bigfile = { enabled = true },
      quickfile = { enabled = true },
      input = { enabled = true },
      notifier = { enabled = true, timeout = 3000 },
      indent = { enabled = true },
      scope = { enabled = true },
      words = { enabled = true },
      scroll = { enabled = false },
      -- opencode.nvim uses Snacks.picker internally; fzf-lua owns vim.ui.select
      picker = { ui_select = false },
      statuscolumn = {
        enabled = true,
        left = { "mark", "sign" },
        right = { "fold", "git" },
        folds = { open = false, git_hl = false },
      },
      styles = {
        notification = { wo = { wrap = true } },
      },
      dashboard = {
        preset = {
          keys = {
            { icon = "\u{f002} ", key = "f", desc = "Find File", action = fzf("files") },
            { icon = "\u{f15b} ", key = "n", desc = "New File", action = ":ene | startinsert" },
            { icon = "\u{f15c} ", key = "g", desc = "Find Text", action = fzf("live_grep") },
            { icon = "\u{f1da} ", key = "r", desc = "Recent Files", action = fzf("oldfiles") },
            {
              icon = "\u{f013} ",
              key = "c",
              desc = "Config",
              action = fzf("files", "{ cwd = vim.fn.stdpath('config') }"),
            },
            { icon = "\u{f099b} ", key = "s", desc = "Restore Session", section = "session" },
            { icon = "󰒲 ", key = "l", desc = "Lazy", action = ":Lazy", enabled = package.loaded.lazy ~= nil },
            { icon = "\u{f1b3} ", key = "m", desc = "Mason", action = ":Mason" },
            { icon = "\u{f08b} ", key = "q", desc = "Quit", action = ":qa" },
          },
        },
        sections = {
          { section = "header" },
          { section = "keys", gap = 1, padding = 1 },
          { section = "startup" },
        },
      },
    },
    commander = {
      {
        keys = { "n", "<leader>." },
        cmd = function()
          Snacks.scratch()
        end,
        desc = "Toggle scratch buffer",
      },
      {
        keys = { "n", "<leader>S" },
        cmd = function()
          Snacks.scratch.select()
        end,
        desc = "Select scratch buffer",
      },
      {
        keys = { "n", "<leader>cR" },
        cmd = function()
          Snacks.rename.rename_file()
        end,
        desc = "Rename file (LSP aware)",
      },
      {
        keys = { "n", "<leader>un" },
        cmd = function()
          Snacks.notifier.hide()
        end,
        desc = "Dismiss all notifications",
      },
      {
        keys = { "n", "<leader>sN" },
        cmd = function()
          Snacks.notifier.show_history()
        end,
        desc = "Notification history",
      },
      -- git
      {
        keys = { "n", "<leader>gg" },
        cmd = function()
          Snacks.lazygit({ cwd = require("util").root() })
        end,
        desc = "Lazygit (root dir)",
      },
      {
        keys = { "n", "<leader>gG" },
        cmd = function()
          Snacks.lazygit()
        end,
        desc = "Lazygit (cwd)",
      },
      {
        keys = { "n", "<leader>gl" },
        cmd = function()
          Snacks.lazygit.log({ cwd = require("util").root() })
        end,
        desc = "Lazygit log",
      },
      {
        keys = { "n", "<leader>gL" },
        cmd = function()
          Snacks.lazygit.log_file()
        end,
        desc = "Lazygit current file history",
      },
      {
        keys = { "n", "<leader>gb" },
        cmd = function()
          Snacks.git.blame_line()
        end,
        desc = "Git blame line",
      },
      {
        keys = { { "n", "x" }, "<leader>gB" },
        cmd = function()
          Snacks.gitbrowse()
        end,
        desc = "Git browse (open)",
      },
      {
        keys = { { "n", "x" }, "<leader>gY" },
        cmd = function()
          Snacks.gitbrowse({
            open = function(url)
              vim.fn.setreg("+", url)
            end,
            notify = false,
          })
        end,
        desc = "Git browse (copy URL)",
      },
      -- terminal
      {
        keys = { { "n", "t" }, "<c-/>" },
        cmd = function()
          Snacks.terminal(nil, { cwd = require("util").root() })
        end,
        desc = "Terminal (root dir)",
      },
      {
        keys = { { "n", "t" }, "<c-_>" },
        cmd = function()
          Snacks.terminal(nil, { cwd = require("util").root() })
        end,
        desc = "which_key_ignore",
        show = false,
      },
      {
        keys = { "n", "<leader>fT" },
        cmd = function()
          Snacks.terminal()
        end,
        desc = "Terminal (cwd)",
      },
      {
        keys = { "n", "<leader>ft" },
        cmd = function()
          Snacks.terminal(nil, { cwd = require("util").root() })
        end,
        desc = "Terminal (root dir)",
      },
      -- references under cursor (LSP document highlight)
      {
        keys = { { "n", "t" }, "]]" },
        cmd = function()
          Snacks.words.jump(vim.v.count1)
        end,
        desc = "Next reference",
      },
      {
        keys = { { "n", "t" }, "[[" },
        cmd = function()
          Snacks.words.jump(-vim.v.count1)
        end,
        desc = "Prev reference",
      },
      {
        cmd = function()
          Snacks.win({
            file = vim.api.nvim_get_runtime_file("doc/news.txt", false)[1],
            width = 0.6,
            height = 0.6,
            wo = { spell = false, wrap = false, signcolumn = "yes", statuscolumn = " ", conceallevel = 3 },
          })
        end,
        desc = "Neovim news",
      },
    },
    init = function()
      vim.api.nvim_create_autocmd("User", {
        pattern = "VeryLazy",
        callback = function()
          -- Debug helpers
          _G.dd = function(...)
            Snacks.debug.inspect(...)
          end
          _G.bt = function()
            Snacks.debug.backtrace()
          end
          vim.print = _G.dd

          -- UI toggles (<leader>u*)
          local util = require("util")
          util.format_toggle():map("<leader>uF")
          util.format_toggle(true):map("<leader>uf")
          Snacks.toggle.option("spell", { name = "Spelling" }):map("<leader>us")
          Snacks.toggle.option("wrap", { name = "Wrap" }):map("<leader>uw")
          Snacks.toggle.option("relativenumber", { name = "Relative Number" }):map("<leader>uL")
          Snacks.toggle.diagnostics():map("<leader>ud")
          Snacks.toggle.line_number():map("<leader>ul")
          Snacks.toggle
            .option(
              "conceallevel",
              { off = 0, on = vim.o.conceallevel > 0 and vim.o.conceallevel or 2, name = "Conceal Level" }
            )
            :map("<leader>uc")
          Snacks.toggle
            .option("showtabline", { off = 0, on = vim.o.showtabline > 0 and vim.o.showtabline or 2, name = "Tabline" })
            :map("<leader>uA")
          Snacks.toggle.treesitter():map("<leader>uT")
          Snacks.toggle.option("background", { off = "light", on = "dark", name = "Dark Background" }):map("<leader>ub")
          Snacks.toggle.dim():map("<leader>uD")
          Snacks.toggle.indent():map("<leader>ug")
          Snacks.toggle.scroll():map("<leader>uS")
          Snacks.toggle.inlay_hints():map("<leader>uh")
          Snacks.toggle.zen():map("<leader>uz")
          Snacks.toggle.zoom():map("<leader>uZ"):map("<leader>wm")
          Snacks.toggle({
            name = "Treesitter Context",
            get = function()
              return require("treesitter-context").enabled()
            end,
            set = function(state)
              require("treesitter-context")[state and "enable" or "disable"]()
            end,
          }):map("<leader>ut")
          Snacks.toggle({
            name = "Git Signs",
            get = function()
              return require("gitsigns.config").config.signcolumn
            end,
            set = function(state)
              require("gitsigns").toggle_signs(state)
            end,
          }):map("<leader>uG")
        end,
      })
    end,
  },
}
