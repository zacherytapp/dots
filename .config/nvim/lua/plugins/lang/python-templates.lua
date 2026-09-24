-- Python templating: Django templates (htmldjango) and Jinja2 (jinja; also
-- Ansible's .j2 files). HTML under templates/ is classified by project in
-- lua/config/filetypes.lua (manage.py -> htmldjango, {% / {{ -> jinja).
local function djlint_config(dirname)
  return vim.fs.find({ ".djlintrc", "pyproject.toml", "djlint.toml" }, { upward = true, path = dirname })[1]
end

return {
  {
    "nvim-treesitter/nvim-treesitter",
    opts = { ensure_installed = { "htmldjango", "jinja", "jinja_inline" } },
  },
  {
    "mason-org/mason.nvim",
    opts = { ensure_installed = { "django-template-lsp", "jinja-lsp", "djlint" } },
  },
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        -- nvim-lspconfig also attaches djlsp to plain html; keep it to templates
        djlsp = { filetypes = { "htmldjango" } },
        jinja_lsp = { filetypes = { "jinja" } },
      },
    },
  },
  {
    "stevearc/conform.nvim",
    opts = {
      formatters_by_ft = {
        htmldjango = { "djlint" },
        jinja = { "djlint" },
      },
      formatters = {
        djlint = {
          prepend_args = function(_, ctx)
            local args = { "--profile", vim.bo[ctx.buf].filetype == "jinja" and "jinja" or "django" }
            if not djlint_config(ctx.dirname) then
              vim.list_extend(args, { "--indent", "2" })
            end
            return args
          end,
        },
      },
    },
  },
  {
    "mfussenegger/nvim-lint",
    opts = {
      linters_by_ft = {
        htmldjango = { "djlint" },
        jinja = { "djlint" },
      },
    },
  },
}
