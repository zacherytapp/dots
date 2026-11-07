local call = require("util").call

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
    keys = {
      { "<leader>ta", call("neotest", "run.attach"), desc = "Attach to test" },
      {
        "<leader>tt",
        function()
          require("neotest").run.run(vim.fn.expand("%"))
        end,
        desc = "Run file",
      },
      {
        "<leader>tT",
        function()
          require("neotest").run.run(vim.uv.cwd())
        end,
        desc = "Run all test files",
      },
      { "<leader>tr", call("neotest", "run.run"), desc = "Run nearest" },
      { "<leader>tl", call("neotest", "run.run_last"), desc = "Run last" },
      { "<leader>ts", call("neotest", "summary.toggle"), desc = "Toggle summary" },
      { "<leader>to", call("neotest", "output.open", { enter = true, auto_close = true }), desc = "Show output" },
      { "<leader>tO", call("neotest", "output_panel.toggle"), desc = "Toggle output panel" },
      { "<leader>tS", call("neotest", "run.stop"), desc = "Stop" },
      {
        "<leader>tw",
        function()
          require("neotest").watch.toggle(vim.fn.expand("%"))
        end,
        desc = "Toggle watch",
      },
      { "<leader>td", call("neotest", "run.run", { strategy = "dap" }), desc = "Debug nearest" },
    },
  },
}
