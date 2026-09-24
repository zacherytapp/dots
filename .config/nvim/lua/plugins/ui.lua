local icons = require("assets").icons

return {
  {
    "akinsho/bufferline.nvim",
    event = "VeryLazy",
    cond = not vim.g.vscode,
    opts = {
      options = {
        close_command = function(n)
          Snacks.bufdelete(n)
        end,
        right_mouse_command = function(n)
          Snacks.bufdelete(n)
        end,
        diagnostics = "nvim_lsp",
        always_show_bufferline = false,
        diagnostics_indicator = function(_, _, diag)
          local ret = (diag.error and icons.error .. diag.error .. " " or "")
            .. (diag.warning and icons.warning .. diag.warning or "")
          return vim.trim(ret)
        end,
        offsets = {
          { filetype = "neo-tree", text = "Neo-tree", highlight = "Directory", text_align = "left" },
          { filetype = "snacks_layout_box" },
        },
        get_element_icon = function(opts)
          return require("mini.icons").get("filetype", opts.filetype)
        end,
      },
    },
    config = function(_, opts)
      require("bufferline").setup(opts)
      -- Fix bufferline when restoring a session
      vim.api.nvim_create_autocmd({ "BufAdd", "BufDelete" }, {
        callback = function()
          vim.schedule(function()
            pcall(nvim_bufferline)
          end)
        end,
      })
    end,
    commander = {
      { keys = { "n", "<S-h>" }, cmd = "<cmd>BufferLineCyclePrev<cr>", desc = "Prev buffer" },
      { keys = { "n", "<S-l>" }, cmd = "<cmd>BufferLineCycleNext<cr>", desc = "Next buffer" },
      { keys = { "n", "[b" }, cmd = "<cmd>BufferLineCyclePrev<cr>", desc = "Prev buffer" },
      { keys = { "n", "]b" }, cmd = "<cmd>BufferLineCycleNext<cr>", desc = "Next buffer" },
      { keys = { "n", "[B" }, cmd = "<cmd>BufferLineMovePrev<cr>", desc = "Move buffer prev" },
      { keys = { "n", "]B" }, cmd = "<cmd>BufferLineMoveNext<cr>", desc = "Move buffer next" },
      { keys = { "n", "<leader>bp" }, cmd = "<cmd>BufferLineTogglePin<cr>", desc = "Toggle pin" },
      {
        keys = { "n", "<leader>bP" },
        cmd = "<cmd>BufferLineGroupClose ungrouped<cr>",
        desc = "Delete non-pinned buffers",
      },
      { keys = { "n", "<leader>br" }, cmd = "<cmd>BufferLineCloseRight<cr>", desc = "Delete buffers to the right" },
      { keys = { "n", "<leader>bl" }, cmd = "<cmd>BufferLineCloseLeft<cr>", desc = "Delete buffers to the left" },
      { keys = { "n", "<leader>bj" }, cmd = "<cmd>BufferLinePick<cr>", desc = "Pick buffer" },
    },
  },
  {
    "folke/noice.nvim",
    event = "VeryLazy",
    cond = not vim.g.vscode,
    dependencies = { "MunifTanjim/nui.nvim" },
    opts = {
      lsp = {
        override = {
          ["vim.lsp.util.convert_input_to_markdown_lines"] = true,
          ["vim.lsp.util.stylize_markdown"] = true,
        },
        -- blink.cmp owns signature help; two popups otherwise
        signature = { enabled = false },
      },
      routes = {
        {
          filter = {
            event = "msg_show",
            any = {
              { find = "%d+L, %d+B" },
              { find = "; after #%d+" },
              { find = "; before #%d+" },
            },
          },
          view = "mini",
        },
        { filter = { find = "No information available" }, opts = { stop = true } },
      },
      presets = {
        bottom_search = true,
        command_palette = true,
        long_message_to_split = true,
        lsp_doc_border = true,
      },
    },
    config = function(_, opts)
      -- When noice is lazy-loaded, messages that already hit the screen are lost
      if vim.o.filetype == "lazy" then
        vim.cmd([[messages clear]])
      end
      require("noice").setup(opts)
    end,
    commander = {
      {
        keys = { "c", "<S-Enter>" },
        cmd = function()
          require("noice").redirect(vim.fn.getcmdline())
        end,
        desc = "Redirect cmdline",
      },
      {
        keys = { "n", "<leader>snl" },
        cmd = function()
          require("noice").cmd("last")
        end,
        desc = "Noice last message",
      },
      {
        keys = { "n", "<leader>snh" },
        cmd = function()
          require("noice").cmd("history")
        end,
        desc = "Noice history",
      },
      {
        keys = { "n", "<leader>sna" },
        cmd = function()
          require("noice").cmd("all")
        end,
        desc = "Noice all",
      },
      {
        keys = { "n", "<leader>snd" },
        cmd = function()
          require("noice").cmd("dismiss")
        end,
        desc = "Dismiss all",
      },
      {
        keys = { "n", "<leader>snt" },
        cmd = function()
          require("noice").cmd("pick")
        end,
        desc = "Noice picker",
      },
      {
        keys = { { "i", "n", "s" }, "<c-f>", { silent = true, expr = true } },
        cmd = function()
          if not require("noice.lsp").scroll(4) then
            return "<c-f>"
          end
        end,
        desc = "Scroll forward (LSP docs)",
        show = false,
      },
      {
        keys = { { "i", "n", "s" }, "<c-b>", { silent = true, expr = true } },
        cmd = function()
          if not require("noice.lsp").scroll(-4) then
            return "<c-b>"
          end
        end,
        desc = "Scroll backward (LSP docs)",
        show = false,
      },
    },
  },
  {
    "FeiyouG/commander.nvim",
    lazy = true,
    opts = {
      components = { "DESC", "KEYS", "CAT" },
      sort_by = { "DESC", "KEYS", "CAT", "CMD" },
      prompt_title = "Commander",
      integration = {
        lazy = { enable = true, set_plugin_name_as_cat = true },
        -- fzf-lua renders the palette through vim.ui.select
        telescope = { enable = false },
      },
    },
  },
}
