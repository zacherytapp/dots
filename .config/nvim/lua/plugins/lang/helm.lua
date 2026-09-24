-- Helm charts (Go templates in YAML): helm_ls. Chart templates are detected in
-- lua/config/filetypes.lua (templates/ next to Chart.yaml).
return {
  {
    "nvim-treesitter/nvim-treesitter",
    opts = { ensure_installed = { "helm" } },
  },
  {
    "mason-org/mason.nvim",
    opts = { ensure_installed = { "helm-ls" } },
  },
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        helm_ls = {
          settings = {
            ["helm-ls"] = {
              yamlls = { path = "yaml-language-server" },
            },
          },
        },
      },
    },
  },
}
