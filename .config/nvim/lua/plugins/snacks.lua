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
            {
              icon = "󰒲 ",
              key = "l",
              desc = "Lazy",
              action = ":Lazy",
              enabled = package.loaded.lazy ~= nil,
            },
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
    keys = {
      {
        "<leader>.",
        function()
          Snacks.scratch()
        end,
        desc = "Toggle scratch buffer",
      },
      {
        "<leader>S",
        function()
          Snacks.scratch.select()
        end,
        desc = "Select scratch buffer",
      },
      {
        "<leader>cR",
        function()
          Snacks.rename.rename_file()
        end,
        desc = "Rename file (LSP aware)",
      },
      {
        "<leader>un",
        function()
          Snacks.notifier.hide()
        end,
        desc = "Dismiss all notifications",
      },
      {
        "<leader>sN",
        function()
          Snacks.notifier.show_history()
        end,
        desc = "Show all notifications (history)",
      },
      {
        "<leader>gg",
        function()
          Snacks.lazygit({ cwd = require("util").root() })
        end,
        desc = "Lazygit (root dir)",
      },
      {
        "<leader>gG",
        function()
          Snacks.lazygit()
        end,
        desc = "Lazygit (cwd)",
      },
      {
        "<leader>gl",
        function()
          Snacks.lazygit.log({ cwd = require("util").root() })
        end,
        desc = "Lazygit log",
      },
      {
        "<leader>gL",
        function()
          Snacks.lazygit.log_file()
        end,
        desc = "Lazygit current file history",
      },
      {
        "<leader>gb",
        function()
          Snacks.git.blame_line()
        end,
        desc = "Git blame line",
      },
      {
        "<leader>gB",
        function()
          Snacks.gitbrowse()
        end,
        mode = { "n", "x" },
        desc = "Git browse (open)",
      },
      {
        "<leader>gY",
        function()
          Snacks.gitbrowse({
            open = function(url)
              vim.fn.setreg("+", url)
            end,
            notify = false,
          })
        end,
        mode = { "n", "x" },
        desc = "Git browse (copy URL)",
      },
      {
        "<c-/>",
        function()
          Snacks.terminal(nil, { cwd = require("util").root() })
        end,
        mode = { "n", "t" },
        desc = "Terminal (root dir)",
      },
      {
        "<c-_>",
        function()
          Snacks.terminal(nil, { cwd = require("util").root() })
        end,
        mode = { "n", "t" },
        desc = "which_key_ignore",
      },
      {
        "<leader>fT",
        function()
          Snacks.terminal()
        end,
        desc = "Terminal (cwd)",
      },
      {
        "<leader>ft",
        function()
          Snacks.terminal(nil, { cwd = require("util").root() })
        end,
        desc = "Terminal (root dir)",
      },
      {
        "]]",
        function()
          Snacks.words.jump(vim.v.count1)
        end,
        mode = { "n", "t" },
        desc = "Next reference",
      },
      {
        "[[",
        function()
          Snacks.words.jump(-vim.v.count1)
        end,
        mode = { "n", "t" },
        desc = "Prev reference",
      },
    },
    palette = {
      {
        desc = "Neovim news",
        cmd = function()
          Snacks.win({
            file = vim.api.nvim_get_runtime_file("doc/news.txt", false)[1],
            width = 0.6,
            height = 0.6,
            wo = { spell = false, wrap = false, signcolumn = "yes", statuscolumn = " ", conceallevel = 3 },
          })
        end,
      },
    },
    init = function()
      vim.api.nvim_create_autocmd("User", {
        pattern = "VeryLazy",
        callback = function()
          _G.dd = function(...)
            Snacks.debug.inspect(...)
          end
          _G.bt = function()
            Snacks.debug.backtrace()
          end
          vim.print = _G.dd

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
