-- Lua: lua_ls + lazydev (Neovim API), stylua
return {
  {
    "nvim-treesitter/nvim-treesitter",
    opts = { ensure_installed = { "lua", "luadoc", "luap" } },
  },
  {
    "mason-org/mason.nvim",
    opts = { ensure_installed = { "lua-language-server", "stylua" } },
  },
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        lua_ls = {
          settings = {
            Lua = {
              workspace = { checkThirdParty = false },
              codeLens = { enable = true },
              completion = { callSnippet = "Replace" },
              doc = { privateName = { "^_" } },
              hint = {
                enable = true,
                setType = false,
                paramType = true,
                paramName = "Disable",
                semicolon = "Disable",
                arrayIndex = "Disable",
              },
            },
          },
        },
      },
    },
  },
  {
    "stevearc/conform.nvim",
    opts = {
      formatters_by_ft = { lua = { "stylua" } },
      formatters = {
        stylua = {
          -- Projects without a stylua.toml get 2-space indentation instead of
          -- stylua's default tabs
          prepend_args = function(_, ctx)
            local config = vim.fs.find({ "stylua.toml", ".stylua.toml" }, { upward = true, path = ctx.dirname })
            if #config > 0 then
              return {}
            end
            return { "--indent-type", "Spaces", "--indent-width", "2", "--column-width", "120" }
          end,
        },
      },
    },
  },
  {
    "folke/lazydev.nvim",
    ft = "lua",
    cmd = "LazyDev",
    opts = {
      library = {
        { path = "${3rd}/luv/library", words = { "vim%.uv" } },
        { path = "snacks.nvim", words = { "Snacks" } },
        { path = "lazy.nvim", words = { "lazy" } },
      },
    },
  },
}
