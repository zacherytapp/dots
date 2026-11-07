return {
  {
    "nvim-treesitter/nvim-treesitter",
    opts = { ensure_installed = { "templ" } },
  },
  {
    "mason-org/mason.nvim",
    opts = { ensure_installed = { "templ" } },
  },
  {
    "neovim/nvim-lspconfig",
    opts = { servers = { templ = {} } },
  },
  {
    "stevearc/conform.nvim",
    opts = { formatters_by_ft = { templ = { "templ" } } },
  },
}
