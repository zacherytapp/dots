local icons = require("assets").icons

return {
  {
    "neovim/nvim-lspconfig",
    dependencies = {
      "saghen/blink.cmp",
      "mason-org/mason.nvim",
      "b0o/schemastore.nvim",
    },
    ---@class UserLspOpts
    opts = {
      inlay_hints = { enabled = true, exclude = {} },
      codelens = { enabled = true },
      -- Per-language servers are added by lua/plugins/lang/*.lua. Each entry is a
      -- vim.lsp.Config merged over nvim-lspconfig's defaults, plus:
      --   enabled = false          skip the server
      --   filetypes_include = {..} add filetypes to the server's default list
      -- Servers whose command is missing are skipped until Mason installs them.
      ---@type table<string, vim.lsp.Config|{enabled?: boolean, filetypes_include?: string[]}>
      servers = {},
    },
    config = function(_, opts)
      vim.diagnostic.config({
        virtual_text = { prefix = "●", source = "if_many", spacing = 2 },
        signs = {
          text = {
            [vim.diagnostic.severity.ERROR] = icons.error,
            [vim.diagnostic.severity.WARN] = icons.warning,
            [vim.diagnostic.severity.HINT] = icons.hint,
            [vim.diagnostic.severity.INFO] = icons.info,
          },
        },
        underline = true,
        update_in_insert = false,
        severity_sort = true,
        float = { border = "rounded", source = true },
      })

      vim.lsp.config("*", {
        capabilities = require("blink.cmp").get_lsp_capabilities(),
      })

      local names = {}
      for name, server in pairs(opts.servers) do
        if server.enabled ~= false then
          local config = vim.deepcopy(server)
          config.enabled = nil
          if config.filetypes_include then
            local defaults = (vim.lsp.config[name] or {}).filetypes or {}
            config.filetypes = vim.list_extend(vim.deepcopy(defaults), config.filetypes_include)
            config.filetypes_include = nil
          end
          if next(config) then
            vim.lsp.config(name, config)
          end
          names[#names + 1] = name
        end
      end
      table.sort(names)

      -- Enabling a server whose binary is missing makes Neovim spawn-and-fail
      -- on every matching buffer, so only enable servers that can start.
      local function available(name)
        local cmd = (vim.lsp.config[name] or {}).cmd
        if type(cmd) == "function" then
          return true -- resolved at start time
        end
        return type(cmd) == "table" and cmd[1] ~= nil and vim.fn.executable(cmd[1]) == 1
      end

      local enabled = {}
      local function enable_available()
        local ready = {}
        for _, name in ipairs(names) do
          if not enabled[name] and available(name) then
            enabled[name] = true
            ready[#ready + 1] = name
          end
        end
        if #ready > 0 then
          vim.lsp.enable(ready)
        end
      end
      enable_available()

      -- Mason installs run asynchronously on first start: enable servers as
      -- their binaries appear instead of requiring a restart.
      local ok, registry = pcall(require, "mason-registry")
      if ok then
        registry:on("package:install:success", vim.schedule_wrap(enable_available))
      end

      vim.api.nvim_create_user_command("LspMissing", function()
        local missing = vim.tbl_filter(function(name)
          return not enabled[name]
        end, names)
        vim.notify(
          #missing == 0 and "All configured servers are enabled"
            or ("Not enabled (command not found):\n  " .. table.concat(missing, "\n  ")),
          vim.log.levels.INFO,
          { title = "LSP" }
        )
      end, { desc = "List configured LSP servers whose command is missing" })

      -- Inlay hints on by default (<leader>uh toggles), codelens (<leader>cC)
      vim.api.nvim_create_autocmd("LspAttach", {
        group = vim.api.nvim_create_augroup("user_lsp_attach", { clear = true }),
        callback = function(args)
          local client = vim.lsp.get_client_by_id(args.data.client_id)
          if not client then
            return
          end
          local buf = args.buf
          if
            opts.inlay_hints.enabled
            and client:supports_method("textDocument/inlayHint", buf)
            and vim.bo[buf].buftype == ""
            and not vim.tbl_contains(opts.inlay_hints.exclude, vim.bo[buf].filetype)
          then
            vim.lsp.inlay_hint.enable(true, { bufnr = buf })
          end
        end,
      })
      if opts.codelens.enabled then
        vim.lsp.codelens.enable(true)
      end
    end,
  },
  {
    "mason-org/mason.nvim",
    cmd = "Mason",
    build = ":MasonUpdate",
    opts_extend = { "ensure_installed" },
    opts = {
      ui = {
        border = "rounded",
        icons = { package_installed = "✓", package_pending = "➜", package_uninstalled = "✗" },
      },
      -- Tools not tied to one language; each lang/*.lua file adds its own
      ensure_installed = { "shfmt", "shellcheck", "tree-sitter-cli" },
    },
    config = function(_, opts)
      require("mason").setup(opts)
      local registry = require("mason-registry")
      registry.refresh(function()
        for _, name in ipairs(opts.ensure_installed) do
          local ok, pkg = pcall(registry.get_package, name)
          if not ok then
            vim.notify("Mason: unknown package " .. name, vim.log.levels.WARN)
          elseif not pkg:is_installed() and not pkg:is_installing() then
            pkg:install()
          end
        end
      end)
    end,
  },
  { "b0o/schemastore.nvim", lazy = true },
  {
    "L3MON4D3/LuaSnip",
    version = "v2.*",
    lazy = true,
    dependencies = { "rafamadriz/friendly-snippets" },
    config = function()
      require("luasnip").setup({ enable_autosnippets = true })
      -- friendly-snippets and any other VSCode-style packs on the rtp
      require("luasnip.loaders.from_vscode").lazy_load()
      -- this config's own VSCode-style pack (snippets/package.json)
      require("luasnip.loaders.from_vscode").lazy_load({
        paths = { vim.fn.stdpath("config") .. "/snippets" },
      })
    end,
    commander = {
      {
        keys = { { "i", "s" }, "<C-E>", { silent = true } },
        cmd = function()
          if require("luasnip").choice_active() then
            require("luasnip").change_choice(1)
          end
        end,
        desc = "LuaSnip: Next choice",
        show = false,
      },
    },
  },
  {
    "folke/trouble.nvim",
    cmd = "Trouble",
    opts = {
      modes = {
        lsp = { win = { position = "right" } },
      },
    },
    commander = {
      { keys = { "n", "<leader>xx" }, cmd = "<cmd>Trouble diagnostics toggle<cr>", desc = "Trouble: Diagnostics" },
      {
        keys = { "n", "<leader>xX" },
        cmd = "<cmd>Trouble diagnostics toggle filter.buf=0<cr>",
        desc = "Trouble: Buffer diagnostics",
      },
      {
        keys = { "n", "<leader>cS" },
        cmd = "<cmd>Trouble lsp toggle<cr>",
        desc = "Trouble: LSP references/definitions",
      },
      { keys = { "n", "<leader>xL" }, cmd = "<cmd>Trouble loclist toggle<cr>", desc = "Trouble: Location list" },
      { keys = { "n", "<leader>xQ" }, cmd = "<cmd>Trouble qflist toggle<cr>", desc = "Trouble: Quickfix list" },
      { cmd = "<cmd>Trouble symbols toggle<cr>", desc = "Trouble: Document symbols" },
    },
  },
}
