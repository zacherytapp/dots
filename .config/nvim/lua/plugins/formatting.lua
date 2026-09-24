local util = require("util")

-- Formatters per filetype are contributed by lua/plugins/lang/*.lua.
-- Format on save honours <leader>uf (buffer) / <leader>uF (global).
return {
  {
    "stevearc/conform.nvim",
    event = { "BufWritePre" },
    cmd = { "ConformInfo" },
    ---@module "conform"
    ---@type conform.setupOpts
    opts = {
      default_format_opts = {
        timeout_ms = 5000,
        lsp_format = "fallback",
      },
      formatters_by_ft = {
        sh = { "shfmt" },
        bash = { "shfmt" },
        -- markdown intentionally excluded: prose isn't auto-formatted
        ruby = { "rubocop" },
        php = { "pint" },
        nix = { "alejandra" },
      },
      formatters = {
        shfmt = { prepend_args = { "-i", "2", "-ci" } },
      },
      format_on_save = function(buf)
        if not util.autoformat_enabled(buf) then
          return
        end
        return {}
      end,
    },
  },
}
