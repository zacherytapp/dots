-- Caddy (Caddyfile): treesitter highlighting/indent, `caddy fmt` formatting and
-- `caddy adapt` validation (both need the caddy binary). There is no Caddyfile
-- language server.
return {
  {
    "nvim-treesitter/nvim-treesitter",
    opts = { ensure_installed = { "caddy" } },
  },
  {
    "stevearc/conform.nvim",
    opts = {
      formatters_by_ft = { caddy = { "caddy_fmt" } },
      formatters = {
        caddy_fmt = {
          command = "caddy",
          args = { "fmt", "-" },
          stdin = true,
        },
      },
    },
  },
  {
    "mfussenegger/nvim-lint",
    opts = {
      linters_by_ft = { caddy = { "caddy_adapt" } },
      linters = {
        -- `caddy adapt` reports the first error as "..., at <file>:<line>"
        caddy_adapt = {
          cmd = "caddy",
          stdin = false,
          append_fname = false,
          args = {
            "adapt",
            "--adapter",
            "caddyfile",
            "--config",
            function()
              return vim.api.nvim_buf_get_name(0)
            end,
          },
          stream = "stderr",
          ignore_exitcode = true,
          parser = function(output)
            local diagnostics = {}
            for line in vim.gsplit(output, "\n", { trimempty = true }) do
              local msg, lnum = line:match("^Error: (.-),? at [^:]+:(%d+)")
              if not msg then
                msg = line:match("^Error: (.+)")
              end
              if msg then
                diagnostics[#diagnostics + 1] = {
                  lnum = math.max(tonumber(lnum or 1) - 1, 0),
                  col = 0,
                  message = msg,
                  severity = vim.diagnostic.severity.ERROR,
                  source = "caddy",
                }
              end
            end
            return diagnostics
          end,
        },
      },
    },
  },
}
