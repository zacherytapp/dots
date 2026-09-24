-- JSON / JSONC / JSON5: jsonls with SchemaStore (+ sfdx-project.json schema),
-- prettierd. Completion for JSON shows only LSP + path (see plugins/blink.lua).
return {
  {
    "nvim-treesitter/nvim-treesitter",
    opts = {
      ensure_installed = { "json", "json5" },
      register = { jsonc = "json" },
    },
  },
  {
    "mason-org/mason.nvim",
    opts = { ensure_installed = { "json-lsp" } },
  },
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        jsonls = {
          before_init = function(_, config)
            config.settings.json.schemas = vim.list_extend(require("schemastore").json.schemas(), {
              {
                fileMatch = { "sfdx-project.json" },
                url = "https://raw.githubusercontent.com/forcedotcom/schemas/main/sfdx-project.schema.json",
              },
            })
          end,
          init_options = { provideFormatter = true },
          settings = {
            json = {
              format = { enable = true },
              validate = { enable = true },
            },
          },
        },
      },
    },
  },
  {
    "stevearc/conform.nvim",
    opts = {
      formatters_by_ft = {
        json = { "prettierd" },
        jsonc = { "prettierd" },
        json5 = { "prettierd" },
      },
    },
  },
}
