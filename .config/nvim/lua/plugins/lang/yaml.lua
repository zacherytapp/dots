-- YAML: yamlls with SchemaStore (GitHub workflows, compose, k8s, ...),
-- prettierd, actionlint for GitHub Actions, yamllint when a project configures it.
local function yamllint_config(dirname)
  return vim.fs.find({ ".yamllint", ".yamllint.yaml", ".yamllint.yml" }, { upward = true, path = dirname })[1]
end

return {
  {
    "nvim-treesitter/nvim-treesitter",
    opts = {
      ensure_installed = { "yaml" },
      -- compound filetypes set by lua/config/filetypes.lua
      register = {
        ["yaml.docker-compose"] = "yaml",
        ["yaml.ansible"] = "yaml",
        ["yaml.helm-values"] = "yaml",
        ["yaml.gitlab"] = "yaml",
      },
    },
  },
  {
    "mason-org/mason.nvim",
    opts = { ensure_installed = { "yaml-language-server", "actionlint", "yamllint" } },
  },
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        yamlls = {
          -- schemastore.nvim is loaded when the server starts
          before_init = function(_, config)
            config.settings.yaml.schemas =
              vim.tbl_deep_extend("force", config.settings.yaml.schemas or {}, require("schemastore").yaml.schemas())
          end,
          settings = {
            redhat = { telemetry = { enabled = false } },
            yaml = {
              keyOrdering = false,
              format = { enable = true },
              validate = true,
              -- use schemastore.nvim's catalog instead of the built-in one
              schemaStore = { enable = false, url = "" },
              schemas = {},
            },
          },
        },
      },
    },
  },
  {
    "stevearc/conform.nvim",
    opts = { formatters_by_ft = { yaml = { "prettierd" } } },
  },
  {
    "mfussenegger/nvim-lint",
    opts = {
      linters_by_ft = { yaml = { "actionlint", "yamllint" } },
      linters = {
        actionlint = {
          condition = function(ctx)
            return ctx.filename:match("/%.github/workflows/[^/]+%.ya?ml$") ~= nil
              or ctx.filename:match("/%.github/actions/.+/action%.ya?ml$") ~= nil
          end,
        },
        yamllint = {
          condition = function(ctx)
            return yamllint_config(ctx.dirname) ~= nil
          end,
        },
      },
    },
  },
}
