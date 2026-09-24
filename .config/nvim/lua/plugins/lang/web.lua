-- HTML / CSS / Tailwind / Emmet: shared by plain HTML, React/Next.js, Svelte,
-- templ, Go templates, Django/Jinja and Visualforce.
local markup_ft = { "html", "templ", "gotmpl", "htmldjango", "jinja" }

local function stylelint_config(dirname)
  return vim.fs.find({
    ".stylelintrc",
    ".stylelintrc.json",
    ".stylelintrc.js",
    ".stylelintrc.cjs",
    ".stylelintrc.yaml",
    ".stylelintrc.yml",
    "stylelint.config.js",
    "stylelint.config.cjs",
    "stylelint.config.mjs",
  }, { upward = true, path = dirname })[1]
end

return {
  {
    "nvim-treesitter/nvim-treesitter",
    opts = { ensure_installed = { "html", "css", "scss", "styled" } },
  },
  {
    "mason-org/mason.nvim",
    opts = {
      ensure_installed = {
        "html-lsp",
        "css-lsp",
        "cssmodules-language-server",
        "tailwindcss-language-server",
        "emmet-language-server",
        "stylelint",
      },
    },
  },
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        html = {
          filetypes = markup_ft,
          init_options = {
            provideFormatter = true,
            embeddedLanguages = { css = true, javascript = true },
            configurationSection = { "html", "css", "javascript" },
          },
        },
        cssls = {},
        -- CSS modules (Next.js components): goto-definition for styles.foo
        cssmodules_ls = { filetypes = { "javascriptreact", "typescriptreact" } },
        tailwindcss = {
          -- nvim-lspconfig's filetypes plus Go templates
          filetypes_include = { "gotmpl", "templ" },
          settings = {
            tailwindCSS = {
              includeLanguages = { templ = "html", gotmpl = "html" },
              lint = {
                cssConflict = "warning",
                invalidApply = "error",
                invalidConfigPath = "error",
                invalidScreen = "error",
                invalidTailwindDirective = "error",
                recommendedVariantOrder = "warning",
              },
              validate = true,
            },
          },
        },
        emmet_language_server = {
          filetypes = {
            "html",
            "css",
            "scss",
            "less",
            "javascriptreact",
            "typescriptreact",
            "svelte",
            "templ",
            "gotmpl",
            "htmldjango",
            "jinja",
            "visualforce",
          },
        },
      },
    },
  },
  {
    "stevearc/conform.nvim",
    opts = {
      formatters_by_ft = {
        html = { "prettierd" },
        css = { "stylelint", "prettierd" },
        scss = { "stylelint", "prettierd" },
        less = { "prettierd" },
      },
      formatters = {
        stylelint = {
          condition = function(_, ctx)
            return stylelint_config(ctx.dirname) ~= nil
          end,
        },
      },
    },
  },
}
