-- Rust: rustaceanvim drives rust-analyzer (from rustup) with clippy checks,
-- runnables/debuggables (codelldb), neotest; crates.nvim for Cargo.toml;
-- taplo for TOML. rust_analyzer must NOT be enabled through lspconfig.
return {
  {
    "nvim-treesitter/nvim-treesitter",
    opts = { ensure_installed = { "rust", "ron", "toml" } },
  },
  {
    "mason-org/mason.nvim",
    opts = { ensure_installed = { "codelldb", "taplo" } },
  },
  {
    "neovim/nvim-lspconfig",
    opts = { servers = { taplo = {} } },
  },
  {
    "stevearc/conform.nvim",
    opts = { formatters_by_ft = { toml = { "taplo" } } },
  },
  {
    "mrcjkb/rustaceanvim",
    version = "^9",
    ft = { "rust" },
    opts = {
      server = {
        on_attach = function(_, bufnr)
          local map = function(lhs, rhs, desc)
            vim.keymap.set("n", lhs, rhs, { buffer = bufnr, desc = desc })
          end
          map("<leader>cR", function()
            vim.cmd.RustLsp("codeAction")
          end, "Rust: Code action (grouped)")
          map("<leader>ce", function()
            vim.cmd.RustLsp("expandMacro")
          end, "Rust: Expand macro")
          map("<leader>cE", function()
            vim.cmd.RustLsp("explainError")
          end, "Rust: Explain error")
          map("<leader>dr", function()
            vim.cmd.RustLsp("debuggables")
          end, "Rust: Debuggables")
          map("<leader>cX", function()
            vim.cmd.RustLsp("runnables")
          end, "Rust: Runnables")
        end,
        default_settings = {
          ["rust-analyzer"] = {
            cargo = {
              allFeatures = true,
              loadOutDirsFromCheck = true,
              buildScripts = { enable = true },
            },
            check = { command = "clippy" },
            procMacro = { enable = true },
            inlayHints = {
              closingBraceHints = { minLines = 20 },
              lifetimeElisionHints = { enable = "skip_trivial" },
            },
            files = {
              excludeDirs = {
                ".direnv",
                ".git",
                ".github",
                ".gitlab",
                "bin",
                "node_modules",
                "target",
                "venv",
                ".venv",
              },
            },
          },
        },
      },
    },
    config = function(_, opts)
      vim.g.rustaceanvim = vim.tbl_deep_extend("keep", vim.g.rustaceanvim or {}, opts or {})
      -- ~/.cargo/bin/rust-analyzer is a rustup proxy that exists even when the
      -- component isn't installed, so check that it actually runs
      local function warn()
        vim.notify("rust-analyzer unavailable: run `rustup component add rust-analyzer`", vim.log.levels.WARN, {
          title = "rustaceanvim",
        })
      end
      local ok = pcall(vim.system, { "rust-analyzer", "--version" }, { text = true }, function(out)
        if out.code ~= 0 then
          vim.schedule(warn)
        end
      end)
      if not ok then
        warn()
      end
    end,
  },
  {
    "saecki/crates.nvim",
    event = { "BufRead Cargo.toml" },
    opts = {
      completion = { crates = { enabled = true } },
      lsp = { enabled = true, actions = true, completion = true, hover = true },
    },
  },
  {
    "nvim-neotest/neotest",
    opts = { adapters = { ["rustaceanvim.neotest"] = {} } },
  },
}
