-- TypeScript / JavaScript / React / Next.js: vtsls (VS Code's TS server,
-- honours the workspace TypeScript and tsconfig plugins such as Next's), eslint
-- (fix-all on save), prettierd, jest + vitest (neotest), js-debug (nvim-dap),
-- package.json helpers. HTML/CSS/Tailwind/Emmet live in lang/web.lua.
local ts_ft = { "javascript", "javascriptreact", "typescript", "typescriptreact" }

local lang_settings = {
  updateImportsOnFileMove = { enabled = "always" },
  suggest = { completeFunctionCalls = true, autoImports = true },
  inlayHints = {
    enumMemberValues = { enabled = true },
    functionLikeReturnTypes = { enabled = true },
    parameterNames = { enabled = "literals" },
    parameterTypes = { enabled = true },
    propertyDeclarationTypes = { enabled = true },
    variableTypes = { enabled = false },
  },
}

-- ESLint: apply all fixes before the formatter runs on save
require("util").on_attach(function(client, buf)
  vim.api.nvim_create_autocmd("BufWritePre", {
    group = vim.api.nvim_create_augroup("user_eslint_fix_" .. buf, { clear = true }),
    buffer = buf,
    callback = function()
      if not require("util").autoformat_enabled(buf) then
        return
      end
      client:request_sync("workspace/executeCommand", {
        command = "eslint.applyAllFixes",
        arguments = { { uri = vim.uri_from_bufnr(buf), version = vim.lsp.util.buf_versions[buf] } },
      }, 3000, buf)
    end,
  })
end, "eslint")

return {
  {
    "nvim-treesitter/nvim-treesitter",
    opts = { ensure_installed = { "javascript", "typescript", "tsx", "jsdoc", "graphql" } },
  },
  {
    "mason-org/mason.nvim",
    opts = { ensure_installed = { "vtsls", "eslint-lsp", "prettierd", "js-debug-adapter" } },
  },
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        vtsls = {
          settings = {
            complete_function_calls = true,
            vtsls = {
              enableMoveToFileCodeAction = true,
              autoUseWorkspaceTsdk = true,
              experimental = {
                maxInlayHintLength = 30,
                completion = { enableServerSideFuzzyMatch = true, entriesLimit = 75 },
              },
            },
            typescript = vim.tbl_deep_extend("force", lang_settings, {
              tsserver = { maxTsServerMemory = 8192 },
            }),
            javascript = lang_settings,
          },
        },
        eslint = {
          settings = {
            workingDirectories = { mode = "auto" },
            format = false,
            codeAction = {
              disableRuleComment = { enable = true, location = "separateLine" },
              showDocumentation = { enable = true },
            },
          },
        },
      },
    },
  },
  {
    "stevearc/conform.nvim",
    opts = {
      formatters_by_ft = {
        javascript = { "prettierd" },
        javascriptreact = { "prettierd" },
        typescript = { "prettierd" },
        typescriptreact = { "prettierd" },
        graphql = { "prettierd" },
      },
    },
  },
  {
    "yioneko/nvim-vtsls",
    ft = ts_ft,
    config = function()
      require("vtsls").config({})
    end,
    keys = {
      {
        "gD",
        function()
          require("vtsls").commands.goto_source_definition(0)
        end,
        desc = "Goto source definition",
        ft = ts_ft,
      },
      {
        "gR",
        function()
          require("vtsls").commands.file_references(0)
        end,
        desc = "File references",
        ft = ts_ft,
      },
      {
        "<leader>co",
        function()
          require("vtsls").commands.organize_imports(0)
        end,
        desc = "Organize imports",
        ft = ts_ft,
      },
      {
        "<leader>cM",
        function()
          require("vtsls").commands.add_missing_imports(0)
        end,
        desc = "Add missing imports",
        ft = ts_ft,
      },
      {
        "<leader>cu",
        function()
          require("vtsls").commands.remove_unused_imports(0)
        end,
        desc = "Remove unused imports",
        ft = ts_ft,
      },
      {
        "<leader>cD",
        function()
          require("vtsls").commands.fix_all(0)
        end,
        desc = "Fix all diagnostics",
        ft = ts_ft,
      },
      {
        "<leader>cV",
        function()
          require("vtsls").commands.select_ts_version(0)
        end,
        desc = "Select TS workspace version",
        ft = ts_ft,
      },
      {
        "<leader>cp",
        function()
          require("vtsls").commands.goto_project_config(0)
        end,
        desc = "Goto tsconfig.json",
        ft = ts_ft,
      },
    },
  },
  {
    "dmmulroy/tsc.nvim",
    cmd = "TSC",
    opts = {},
    keys = {
      { "<leader>ck", "<cmd>TSC<cr>", desc = "Type-check project (tsc)", ft = ts_ft },
    },
  },
  {
    "vuki656/package-info.nvim",
    event = "BufRead package.json",
    opts = {},
    keys = {
      {
        "<leader>cns",
        function()
          require("package-info").show({ force = true })
        end,
        desc = "Show versions",
        ft = "json",
      },
      {
        "<leader>cnu",
        function()
          require("package-info").update()
        end,
        desc = "Update dependency",
        ft = "json",
      },
      {
        "<leader>cnd",
        function()
          require("package-info").delete()
        end,
        desc = "Delete dependency",
        ft = "json",
      },
      {
        "<leader>cni",
        function()
          require("package-info").install()
        end,
        desc = "Install dependency",
        ft = "json",
      },
      {
        "<leader>cnv",
        function()
          require("package-info").change_version()
        end,
        desc = "Change version",
        ft = "json",
      },
    },
  },
  {
    "nvim-neotest/neotest",
    dependencies = { "marilari88/neotest-vitest", "nvim-neotest/neotest-jest" },
    opts = {
      adapters = {
        ["neotest-vitest"] = {},
        ["neotest-jest"] = { jestCommand = "npx jest" },
      },
    },
  },
  {
    "mfussenegger/nvim-dap",
    opts = function(_, opts)
      -- js-debug (pwa-node / pwa-chrome) adapters are registered by mason-nvim-dap
      for _, ft in ipairs(ts_ft) do
        opts.configurations[ft] = {
          {
            name = "Launch file (Node)",
            type = "pwa-node",
            request = "launch",
            program = "${file}",
            cwd = "${workspaceFolder}",
          },
          {
            name = "Attach to process (Node)",
            type = "pwa-node",
            request = "attach",
            processId = function()
              return require("dap.utils").pick_process()
            end,
            cwd = "${workspaceFolder}",
          },
          {
            name = "Next.js: debug server (npm run dev)",
            type = "pwa-node",
            request = "launch",
            runtimeExecutable = "npm",
            runtimeArgs = { "run", "dev" },
            cwd = "${workspaceFolder}",
            console = "integratedTerminal",
            skipFiles = { "<node_internals>/**" },
          },
          {
            name = "Launch Chrome (localhost:3000)",
            type = "pwa-chrome",
            request = "launch",
            url = "http://localhost:3000",
            webRoot = "${workspaceFolder}",
          },
        }
      end
    end,
  },
}
