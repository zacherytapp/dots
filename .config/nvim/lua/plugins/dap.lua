local call = require("util").call

---@param config {args?:string[]|fun():string[]?}
local function get_args(config)
  local args = type(config.args) == "function" and (config.args() or {}) or config.args or {}
  local args_str = type(args) == "table" and table.concat(args, " ") or args --[[@as string]]
  config = vim.deepcopy(config)
  ---@cast args string[]
  config.args = function()
    local new_args = vim.fn.expand(vim.fn.input("Run with args: ", args_str))
    return require("dap.utils").splitstr(new_args)
  end
  return config
end

return {
  {
    "mfussenegger/nvim-dap",
    lazy = true,
    dependencies = {
      "rcarriga/nvim-dap-ui",
      "nvim-neotest/nvim-nio",
      "theHamsta/nvim-dap-virtual-text",
      "jay-babu/mason-nvim-dap.nvim",
    },
    opts = {
      ---@type table<string, dap.Configuration[]>
      configurations = {},
    },
    config = function(_, opts)
      local dap = require("dap")
      local dapui = require("dapui")

      dapui.setup({
        icons = { expanded = "▾", collapsed = "▸", current_frame = "▸" },
        layouts = {
          {
            elements = {
              { id = "scopes", size = 0.35 },
              { id = "breakpoints", size = 0.15 },
              { id = "stacks", size = 0.25 },
              { id = "watches", size = 0.25 },
            },
            position = "left",
            size = 40,
          },
          {
            elements = { { id = "repl", size = 0.5 }, { id = "console", size = 0.5 } },
            position = "bottom",
            size = 10,
          },
        },
      })
      dap.listeners.after.event_initialized["dapui_config"] = function()
        dapui.open({})
      end
      dap.listeners.before.event_terminated["dapui_config"] = function()
        dapui.close({})
      end
      dap.listeners.before.event_exited["dapui_config"] = function()
        dapui.close({})
      end

      require("nvim-dap-virtual-text").setup({
        highlight_changed_variables = true,
        show_stop_reason = true,
      })

      vim.api.nvim_set_hl(0, "DapStoppedLine", { default = true, link = "Visual" })
      for name, sign in pairs({
        DapBreakpoint = { "\u{f111}", "DiagnosticError" },
        DapBreakpointCondition = { "\u{f059}", "DiagnosticWarn" },
        DapLogPoint = { "\u{f05a}", "DiagnosticInfo" },
        DapStopped = { "\u{f0055}", "DiagnosticOk", "DapStoppedLine" },
        DapBreakpointRejected = { "\u{f06a}", "DiagnosticError" },
      }) do
        vim.fn.sign_define(name, { text = sign[1], texthl = sign[2], linehl = sign[3], numhl = sign[3] })
      end

      require("mason-nvim-dap").setup({
        automatic_installation = true,
        ensure_installed = {},
        handlers = {
          -- nvim-dap-go and nvim-dap-python set these adapters up
          delve = function() end,
          python = function() end,
        },
      })

      for ft, configs in pairs(opts.configurations) do
        dap.configurations[ft] = vim.list_extend(dap.configurations[ft] or {}, configs)
      end

      local vscode = require("dap.ext.vscode")
      local json = require("plenary.json")
      vscode.json_decode = function(str)
        return vim.json.decode(json.json_strip_comments(str))
      end
    end,
    keys = {
      {
        "<leader>dB",
        function()
          require("dap").set_breakpoint(vim.fn.input("Breakpoint condition: "))
        end,
        desc = "Breakpoint condition",
      },
      { "<leader>db", call("dap", "toggle_breakpoint"), desc = "Toggle breakpoint" },
      {
        "<leader>dL",
        function()
          require("dap").set_breakpoint(nil, nil, vim.fn.input("Log message: "))
        end,
        desc = "Log point",
      },
      { "<leader>dx", call("dap", "clear_breakpoints"), desc = "Clear breakpoints" },
      { "<leader>dc", call("dap", "continue"), desc = "Run / continue" },
      { "<leader>da", call("dap", "continue", { before = get_args }), desc = "Run with args" },
      { "<leader>dC", call("dap", "run_to_cursor"), desc = "Run to cursor" },
      { "<leader>dg", call("dap", "goto_"), desc = "Go to line (no execute)" },
      { "<leader>di", call("dap", "step_into"), desc = "Step into" },
      { "<leader>dj", call("dap", "down"), desc = "Down stack frame" },
      { "<leader>dk", call("dap", "up"), desc = "Up stack frame" },
      { "<leader>dl", call("dap", "run_last"), desc = "Run last" },
      { "<leader>do", call("dap", "step_out"), desc = "Step out" },
      { "<leader>dO", call("dap", "step_over"), desc = "Step over" },
      { "<leader>dp", call("dap", "pause"), desc = "Pause" },
      { "<leader>dr", call("dap", "repl.toggle"), desc = "Toggle REPL" },
      { "<leader>dR", call("dap", "restart"), desc = "Restart session" },
      { "<leader>ds", call("dap", "session"), desc = "Session" },
      { "<leader>dt", call("dap", "terminate"), desc = "Terminate" },
      { "<leader>dw", call("dap.ui.widgets", "hover"), desc = "Widgets" },
      { "<leader>du", call("dapui", "toggle", {}), desc = "Dap UI" },
      { "<leader>de", call("dapui", "eval"), mode = { "n", "x" }, desc = "Eval" },
    },
  },
  {
    "jay-babu/mason-nvim-dap.nvim",
    lazy = true,
    dependencies = { "mason-org/mason.nvim" },
  },
}
