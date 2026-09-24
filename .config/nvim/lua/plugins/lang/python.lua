-- Python: basedpyright (Pylance-like types, inlay hints) + ruff (lint, fixes,
-- import sorting, formatting), pytest via neotest, debugpy via nvim-dap-python.
-- Project virtualenvs (.venv / venv) are activated by lua/config/python_venv.lua;
-- <leader>cv picks one manually.

-- basedpyright answers hover; ruff's is terse
require("util").on_attach(function(client)
  client.server_capabilities.hoverProvider = false
end, "ruff")

return {
  {
    "nvim-treesitter/nvim-treesitter",
    opts = { ensure_installed = { "python", "requirements", "ninja", "rst", "toml" } },
  },
  {
    "mason-org/mason.nvim",
    opts = { ensure_installed = { "basedpyright", "ruff", "debugpy" } },
  },
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        basedpyright = {
          settings = {
            basedpyright = {
              disableOrganizeImports = true, -- ruff owns imports
              analysis = {
                typeCheckingMode = "standard",
                autoSearchPaths = true,
                useLibraryCodeForTypes = true,
                diagnosticMode = "openFilesOnly",
                inlayHints = {
                  variableTypes = true,
                  callArgumentNames = true,
                  functionReturnTypes = true,
                  genericTypes = false,
                },
              },
            },
          },
        },
        ruff = {
          init_options = {
            settings = { logLevel = "error" },
          },
        },
      },
    },
  },
  {
    "stevearc/conform.nvim",
    opts = {
      formatters_by_ft = { python = { "ruff_organize_imports", "ruff_format" } },
    },
  },
  {
    "linux-cultist/venv-selector.nvim",
    cmd = "VenvSelect",
    opts = {
      options = {
        notify_user_on_venv_activation = true,
      },
    },
    keys = {
      { "<leader>cv", "<cmd>VenvSelect<cr>", desc = "Select virtualenv", ft = "python" },
    },
  },
  {
    "nvim-neotest/neotest",
    dependencies = { "nvim-neotest/neotest-python" },
    opts = {
      adapters = {
        ["neotest-python"] = { runner = "pytest", dap = { justMyCode = false } },
      },
    },
  },
  {
    "mfussenegger/nvim-dap",
    dependencies = {
      {
        "mfussenegger/nvim-dap-python",
        config = function()
          -- The adapter runs from Mason's debugpy venv; the debuggee python is
          -- resolved by dap-python at launch ($VIRTUAL_ENV, .venv, ...)
          local mason_debugpy = vim.fn.stdpath("data") .. "/mason/packages/debugpy/venv/bin/python"
          local python = vim.fn.executable(mason_debugpy) == 1 and mason_debugpy or vim.fn.exepath("python3")
          require("dap-python").setup(python)
        end,
      },
    },
  },
  {
    "mfussenegger/nvim-dap-python",
    lazy = true,
    keys = {
      {
        "<leader>dPt",
        function()
          require("dap-python").test_method()
        end,
        desc = "Debug method",
        ft = "python",
      },
      {
        "<leader>dPc",
        function()
          require("dap-python").test_class()
        end,
        desc = "Debug class",
        ft = "python",
      },
    },
  },
}
