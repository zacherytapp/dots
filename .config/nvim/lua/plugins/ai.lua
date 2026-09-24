return {
  {
    "zbirenbaum/copilot.lua",
    cmd = "Copilot",
    event = { "BufReadPre", "InsertEnter" },
    config = function()
      require("copilot").setup({
        panel = {
          enabled = true,
          auto_refresh = false,
          keymap = {
            jump_prev = "[[",
            jump_next = "]]",
            accept = "<CR>",
            refresh = "gr",
            open = "<C-p>",
          },
          layout = {
            position = "bottom",
            ratio = 0.4,
          },
        },
        suggestion = {
          enabled = true,
          auto_trigger = true,
          debounce = 50,
          keymap = {
            accept = "<C-l>",
            accept_word = false,
            accept_line = false,
            dismiss = "<C-u>",
          },
        },
        filetypes = {
          yaml = true,
          markdown = true,
          help = false,
          gitcommit = false,
          gitrebase = false,
          hgcommit = false,
          svn = false,
          cvs = false,
          dotenv = false, -- never send .env secrets to Copilot
          ["."] = true,
        },
        copilot_node_command = "node",
        server_opts_overrides = {},
      })
    end,
  },
  {
    "NickvanDyke/opencode.nvim",
    dependencies = {
      -- Recommended for `ask()` and `select()`.
      -- Required for `toggle()`.
      { "folke/snacks.nvim", opts = { input = {}, picker = {} } },
    },
    config = function()
      vim.g.opencode_opts = {}
    end,
    commander = {
      {
        keys = { { "n", "x" }, "<leader>aa" },
        cmd = function()
          require("opencode").ask("@this: ", { submit = true })
        end,
        desc = "OpenCode: Ask about this",
      },
      {
        keys = { { "n", "x" }, "<leader>a+" },
        cmd = function()
          require("opencode").prompt("@this")
        end,
        desc = "OpenCode: Add this",
      },
      {
        keys = { { "n", "x" }, "<leader>as" },
        cmd = function()
          require("opencode").select()
        end,
        desc = "OpenCode: Select prompt",
      },
      {
        keys = { "n", "<leader>at" },
        cmd = function()
          require("opencode").toggle()
        end,
        desc = "OpenCode: Toggle embedded",
      },
      {
        keys = { "n", "<leader>ac" },
        cmd = function()
          require("opencode").command()
        end,
        desc = "OpenCode: Select command",
      },
      {
        keys = { "n", "<leader>an" },
        cmd = function()
          require("opencode").command("session_new")
        end,
        desc = "OpenCode: New session",
      },
      {
        keys = { "n", "<leader>ai" },
        cmd = function()
          require("opencode").command("session_interrupt")
        end,
        desc = "OpenCode: Interrupt session",
      },
      {
        keys = { "n", "<leader>aA" },
        cmd = function()
          require("opencode").command("agent_cycle")
        end,
        desc = "OpenCode: Cycle selected agent",
      },
      {
        keys = { "n", "<S-C-u>" },
        cmd = function()
          require("opencode").command("messages_half_page_up")
        end,
        desc = "OpenCode: Messages half page up",
      },
      {
        keys = { "n", "<S-C-d>" },
        cmd = function()
          require("opencode").command("messages_half_page_down")
        end,
        desc = "OpenCode: Messages half page down",
      },
    },
  },
}
