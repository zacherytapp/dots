return {
  {
    "nvim-treesitter/nvim-treesitter",
    opts = { ensure_installed = { "dockerfile" } },
  },
  {
    "mason-org/mason.nvim",
    opts = { ensure_installed = { "docker-language-server", "hadolint" } },
  },
  {
    "neovim/nvim-lspconfig",
    opts = { servers = { docker_language_server = {} } },
  },
  {
    "mfussenegger/nvim-lint",
    opts = { linters_by_ft = { dockerfile = { "hadolint" } } },
  },
}
