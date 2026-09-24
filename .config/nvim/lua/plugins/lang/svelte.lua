-- Svelte / SvelteKit: svelte-language-server, the TypeScript svelte plugin in
-- vtsls (so .ts files see .svelte imports), prettier (prettier-plugin-svelte
-- from the project), eslint and tailwind from the other web files.
return {
  {
    "nvim-treesitter/nvim-treesitter",
    opts = { ensure_installed = { "svelte" } },
  },
  {
    "mason-org/mason.nvim",
    opts = { ensure_installed = { "svelte-language-server" } },
  },
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        svelte = {},
        vtsls = {
          settings = {
            vtsls = {
              tsserver = {
                globalPlugins = {
                  {
                    name = "typescript-svelte-plugin",
                    location = vim.fn.stdpath("data")
                      .. "/mason/packages/svelte-language-server/node_modules/typescript-svelte-plugin",
                    enableForWorkspaceTypeScriptVersions = true,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  {
    "stevearc/conform.nvim",
    opts = { formatters_by_ft = { svelte = { "prettierd" } } },
  },
}
