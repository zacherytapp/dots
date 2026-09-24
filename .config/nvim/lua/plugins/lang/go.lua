-- Go: gopls, gofumpt + goimports, golangci-lint, gopher helpers, neotest-golang,
-- delve (nvim-dap-go), coverage. Go templates (gotmpl) are served by gopls.
return {
  {
    "nvim-treesitter/nvim-treesitter",
    opts = {
      ensure_installed = { "go", "gomod", "gosum", "gowork", "gotmpl" },
      -- Vim's GoIndent handles := / struct literals / case blocks better
      runtime_indent = { go = true, gomod = true, gowork = true },
    },
  },
  {
    "mason-org/mason.nvim",
    opts = {
      ensure_installed = {
        "gopls",
        "goimports",
        "gofumpt",
        "golangci-lint",
        "gomodifytags",
        "impl",
        "gotests",
        "gotestsum",
        "delve",
      },
    },
  },
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        gopls = {
          filetypes = { "go", "gomod", "gowork", "gotmpl" },
          settings = {
            gopls = {
              templateExtensions = { "tmpl", "gotmpl", "gohtml" },
              gofumpt = true,
              usePlaceholders = true,
              completeUnimported = true,
              completeFunctionCalls = true,
              semanticTokens = true,
              vulncheck = "Imports",
              codelenses = {
                generate = true,
                gc_details = false,
                regenerate_cgo = true,
                run_govulncheck = true,
                test = true,
                tidy = true,
                upgrade_dependency = true,
                vendor = true,
              },
              analyses = {
                nilness = true,
                unusedresult = true,
                unusedparams = true,
                unusedwrite = true,
                useany = true,
                unreachable = true,
                shadow = true,
                composites = true,
              },
              hints = {
                assignVariableTypes = true,
                compositeLiteralFields = true,
                compositeLiteralTypes = true,
                constantValues = true,
                functionTypeParameters = true,
                parameterNames = true,
                rangeVariableTypes = true,
              },
              staticcheck = true,
              directoryFilters = { "-.git", "-.vscode", "-.idea", "-node_modules" },
            },
          },
        },
      },
    },
  },
  {
    "stevearc/conform.nvim",
    opts = { formatters_by_ft = { go = { "goimports", "gofumpt" } } },
  },
  {
    "mfussenegger/nvim-lint",
    opts = { linters_by_ft = { go = { "golangcilint" } } },
  },
  {
    "olexsmir/gopher.nvim",
    ft = "go",
    opts = {},
    keys = {
      { "<leader>cgt", "<cmd>GoTagAdd json<cr>", desc = "Add json struct tags", ft = "go" },
      { "<leader>cgT", "<cmd>GoTagRm json<cr>", desc = "Remove json struct tags", ft = "go" },
      { "<leader>cge", "<cmd>GoIfErr<cr>", desc = "Generate if err", ft = "go" },
      {
        "<leader>cgi",
        function()
          local interface = vim.fn.input("Interface: ")
          if interface ~= "" then
            vim.cmd("GoImpl " .. interface)
          end
        end,
        desc = "Implement interface",
        ft = "go",
      },
      { "<leader>cgg", "<cmd>GoTestAdd<cr>", desc = "Generate test for function", ft = "go" },
      { "<leader>cgG", "<cmd>GoTestsAll<cr>", desc = "Generate all tests", ft = "go" },
      { "<leader>cgm", "<cmd>GoMod tidy<cr>", desc = "go mod tidy", ft = { "go", "gomod" } },
    },
  },
  {
    "andythigpen/nvim-coverage",
    dependencies = { "nvim-lua/plenary.nvim" },
    ft = "go",
    opts = {
      auto_reload = true,
      lang = { go = { coverage_file = vim.fn.getcwd() .. "/coverage.out" } },
    },
    keys = {
      { "<leader>tc", "<cmd>CoverageToggle<cr>", desc = "Toggle coverage", ft = "go" },
      {
        "<leader>tC",
        function()
          require("coverage").load(true)
        end,
        desc = "Load coverage",
        ft = "go",
      },
    },
  },
  {
    "nvim-neotest/neotest",
    dependencies = { "fredrikaverpil/neotest-golang" },
    opts = {
      adapters = {
        ["neotest-golang"] = {
          runner = "gotestsum",
          gotestsum_args = { "--format=standard-verbose" },
          dap_go_enabled = true,
        },
      },
    },
  },
  {
    "mfussenegger/nvim-dap",
    dependencies = {
      { "leoluz/nvim-dap-go", opts = {} },
    },
  },
}
