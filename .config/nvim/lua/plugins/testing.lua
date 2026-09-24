-- Adapters are contributed by lua/plugins/lang/*.lua as
--   opts.adapters = { ["neotest-foo"] = { ...adapter config } }
-- (Apex tests run through sf.nvim on <leader>mt*.)
return {
  {
    "nvim-neotest/neotest",
    cmd = "Neotest",
    dependencies = {
      "nvim-neotest/nvim-nio",
      "nvim-lua/plenary.nvim",
      "nvim-treesitter/nvim-treesitter",
    },
    opts = {
      adapters = {},
      status = { virtual_text = true },
      output = { open_on_run = true },
      quickfix = {
        open = function()
          require("trouble").open({ mode = "quickfix", focus = false })
        end,
      },
    },
    config = function(_, opts)
      local neotest_ns = vim.api.nvim_create_namespace("neotest")
      vim.diagnostic.config({
        virtual_text = {
          format = function(diagnostic)
            -- Replace newline and tab characters with space for more compact diagnostics
            return diagnostic.message:gsub("\n", " "):gsub("\t", " "):gsub("%s+", " "):gsub("^%s+", "")
          end,
        },
      }, neotest_ns)

      local adapters = {}
      for name, config in pairs(opts.adapters or {}) do
        if type(name) == "number" then
          adapters[#adapters + 1] = type(config) == "string" and require(config) or config
        elseif config ~= false then
          local adapter = require(name)
          if type(config) == "table" and not vim.tbl_isempty(config) then
            local meta = getmetatable(adapter)
            if adapter.setup then
              adapter.setup(config)
            elseif adapter.adapter then
              adapter.adapter(config)
              adapter = adapter.adapter
            elseif meta and meta.__call then
              adapter = adapter(config)
            else
              error("Adapter " .. name .. " does not support setup")
            end
          end
          adapters[#adapters + 1] = adapter
        end
      end
      opts.adapters = adapters
      require("neotest").setup(opts)
    end,
    commander = {
      {
        keys = { "n", "<leader>ta" },
        cmd = function()
          require("neotest").run.attach()
        end,
        desc = "Attach to test",
      },
      {
        keys = { "n", "<leader>tt" },
        cmd = function()
          require("neotest").run.run(vim.fn.expand("%"))
        end,
        desc = "Run file",
      },
      {
        keys = { "n", "<leader>tT" },
        cmd = function()
          require("neotest").run.run(vim.uv.cwd())
        end,
        desc = "Run all test files",
      },
      {
        keys = { "n", "<leader>tr" },
        cmd = function()
          require("neotest").run.run()
        end,
        desc = "Run nearest",
      },
      {
        keys = { "n", "<leader>tl" },
        cmd = function()
          require("neotest").run.run_last()
        end,
        desc = "Run last",
      },
      {
        keys = { "n", "<leader>ts" },
        cmd = function()
          require("neotest").summary.toggle()
        end,
        desc = "Toggle summary",
      },
      {
        keys = { "n", "<leader>to" },
        cmd = function()
          require("neotest").output.open({ enter = true, auto_close = true })
        end,
        desc = "Show output",
      },
      {
        keys = { "n", "<leader>tO" },
        cmd = function()
          require("neotest").output_panel.toggle()
        end,
        desc = "Toggle output panel",
      },
      {
        keys = { "n", "<leader>tS" },
        cmd = function()
          require("neotest").run.stop()
        end,
        desc = "Stop",
      },
      {
        keys = { "n", "<leader>tw" },
        cmd = function()
          require("neotest").watch.toggle(vim.fn.expand("%"))
        end,
        desc = "Toggle watch",
      },
      {
        keys = { "n", "<leader>td" },
        cmd = function()
          require("neotest").run.run({ strategy = "dap" })
        end,
        desc = "Debug nearest",
      },
    },
  },
}
