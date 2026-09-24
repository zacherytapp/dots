-- Docker: Docker's own language server (the one behind VS Code's Docker DX
-- extension) for Dockerfiles, Compose and Bake files, plus hadolint. Compose
-- files also get yamlls + the compose schema from lang/yaml.lua.
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
