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

-- Language adapters/configurations come from lua/plugins/lang/*.lua, either as
-- their own plugins (nvim-dap-go, nvim-dap-python, rustaceanvim) or through
-- `opts.configurations = { <filetype> = { ... } }` on this spec.
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
          -- These adapters are owned by dedicated plugins (see lang/*.lua)
          delve = function() end,
          python = function() end,
        },
      })

      for ft, configs in pairs(opts.configurations) do
        dap.configurations[ft] = vim.list_extend(dap.configurations[ft] or {}, configs)
      end

      -- .vscode/launch.json support (VS Code debug configurations)
      local vscode = require("dap.ext.vscode")
      local json = require("plenary.json")
      vscode.json_decode = function(str)
        return vim.json.decode(json.json_strip_comments(str))
      end
    end,
    commander = {
      {
        keys = { "n", "<leader>dB" },
        cmd = function()
          require("dap").set_breakpoint(vim.fn.input("Breakpoint condition: "))
        end,
        desc = "Breakpoint condition",
      },
      {
        keys = { "n", "<leader>db" },
        cmd = function()
          require("dap").toggle_breakpoint()
        end,
        desc = "Toggle breakpoint",
      },
      {
        keys = { "n", "<leader>dL" },
        cmd = function()
          require("dap").set_breakpoint(nil, nil, vim.fn.input("Log message: "))
        end,
        desc = "Log point",
      },
      {
        keys = { "n", "<leader>dx" },
        cmd = function()
          require("dap").clear_breakpoints()
        end,
        desc = "Clear breakpoints",
      },
      {
        keys = { "n", "<leader>dc" },
        cmd = function()
          require("dap").continue()
        end,
        desc = "Run / continue",
      },
      {
        keys = { "n", "<leader>da" },
        cmd = function()
          require("dap").continue({ before = get_args })
        end,
        desc = "Run with args",
      },
      {
        keys = { "n", "<leader>dC" },
        cmd = function()
          require("dap").run_to_cursor()
        end,
        desc = "Run to cursor",
      },
      {
        keys = { "n", "<leader>dg" },
        cmd = function()
          require("dap").goto_()
        end,
        desc = "Go to line (no execute)",
      },
      {
        keys = { "n", "<leader>di" },
        cmd = function()
          require("dap").step_into()
        end,
        desc = "Step into",
      },
      {
        keys = { "n", "<leader>dj" },
        cmd = function()
          require("dap").down()
        end,
        desc = "Down stack frame",
      },
      {
        keys = { "n", "<leader>dk" },
        cmd = function()
          require("dap").up()
        end,
        desc = "Up stack frame",
      },
      {
        keys = { "n", "<leader>dl" },
        cmd = function()
          require("dap").run_last()
        end,
        desc = "Run last",
      },
      {
        keys = { "n", "<leader>do" },
        cmd = function()
          require("dap").step_out()
        end,
        desc = "Step out",
      },
      {
        keys = { "n", "<leader>dO" },
        cmd = function()
          require("dap").step_over()
        end,
        desc = "Step over",
      },
      {
        keys = { "n", "<leader>dp" },
        cmd = function()
          require("dap").pause()
        end,
        desc = "Pause",
      },
      {
        keys = { "n", "<leader>dr" },
        cmd = function()
          require("dap").repl.toggle()
        end,
        desc = "Toggle REPL",
      },
      {
        keys = { "n", "<leader>dR" },
        cmd = function()
          require("dap").restart()
        end,
        desc = "Restart session",
      },
      {
        keys = { "n", "<leader>ds" },
        cmd = function()
          require("dap").session()
        end,
        desc = "Session",
      },
      {
        keys = { "n", "<leader>dt" },
        cmd = function()
          require("dap").terminate()
        end,
        desc = "Terminate",
      },
      {
        keys = { "n", "<leader>dw" },
        cmd = function()
          require("dap.ui.widgets").hover()
        end,
        desc = "Widgets",
      },
      {
        keys = { "n", "<leader>du" },
        cmd = function()
          require("dapui").toggle({})
        end,
        desc = "Dap UI",
      },
      {
        keys = { { "n", "x" }, "<leader>de" },
        cmd = function()
          require("dapui").eval()
        end,
        desc = "Eval",
      },
    },
  },
  {
    "jay-babu/mason-nvim-dap.nvim",
    lazy = true,
    dependencies = { "mason-org/mason.nvim" },
  },
}
