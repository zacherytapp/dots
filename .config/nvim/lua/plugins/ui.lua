local call = require("util").call

-- No tabline: buffers are switched with the fzf-lua picker (<leader>, / <leader>fb)
-- and cycled with <S-h>/<S-l> (lua/config/keymaps.lua); showtabline = 0 in options.lua.
return {
  {
    "folke/noice.nvim",
    event = "VeryLazy",
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
    keys = {
      {
        "<S-Enter>",
        function()
          require("noice").redirect(vim.fn.getcmdline())
        end,
        mode = "c",
        desc = "Redirect cmdline",
      },
      { "<leader>snl", call("noice", "cmd", "last"), desc = "Noice last message" },
      { "<leader>snh", call("noice", "cmd", "history"), desc = "Noice history" },
      { "<leader>sna", call("noice", "cmd", "all"), desc = "Noice all" },
      { "<leader>snt", call("noice", "cmd", "pick"), desc = "Noice picker" },
      {
        "<c-f>",
        function()
          if not require("noice.lsp").scroll(4) then
            return "<c-f>"
          end
        end,
        mode = { "i", "n", "s" },
        expr = true,
        silent = true,
        desc = "Scroll forward (LSP docs)",
      },
      {
        "<c-b>",
        function()
          if not require("noice.lsp").scroll(-4) then
            return "<c-b>"
          end
        end,
        mode = { "i", "n", "s" },
        expr = true,
        silent = true,
        desc = "Scroll backward (LSP docs)",
      },
    },
  },
}
