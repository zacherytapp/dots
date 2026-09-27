return {
  {
    -- Inline ghost-text completion from the local LM Studio server (raw FIM, no chat template)
    "milanglacier/minuet-ai.nvim",
    dependencies = { "nvim-lua/plenary.nvim" },
    cmd = "Minuet",
    -- Auto-trigger is enabled per buffer on FileType, so load before the first one fires
    event = { "BufReadPre", "BufNewFile" },
    opts = {
      provider = "openai_fim_compatible",
      -- One request per trigger: every completion costs a pass through a 27B model
      n_completions = 1,
      -- ~2k tokens of surrounding code; raise if latency stays low
      context_window = 8000,
      throttle = 1000,
      debounce = 300,
      -- Streaming, so a timeout still yields whatever has been generated so far
      request_timeout = 3,
      notify = "warn",
      -- Only real file buffers (not pickers, prompts, terminals, ...)
      enable_predicates = {
        function()
          return vim.bo.buftype == ""
        end,
      },
      virtualtext = {
        auto_trigger_ft = { "*" },
        auto_trigger_ignore_ft = {
          "help",
          "gitcommit",
          "gitrebase",
          "hgcommit",
          "svn",
          "cvs",
          "dotenv", -- keep .env secrets out of the prompt
        },
        keymap = {
          accept = "<C-l>",
          accept_line = "<M-l>",
          -- Cycle suggestions, or request one manually when none is shown
          next = "<M-]>",
          prev = "<M-[>",
          dismiss = "<C-u>",
        },
      },
      provider_options = {
        openai_fim_compatible = {
          name = "LM Studio",
          end_point = "http://10.15.30.166:1234/v1/completions",
          model = "qwen/qwen3.8-27b",
          -- LM Studio ignores the key, but minuet refuses to send a request without one
          api_key = function()
            return "lm-studio"
          end,
          stream = true,
          optional = {
            max_tokens = 96,
            top_p = 0.9,
          },
          -- LM Studio's /v1/completions has no `suffix` field, so build Qwen's FIM prompt by hand
          template = {
            prompt = function(context_before_cursor, context_after_cursor, _)
              return "<|fim_prefix|>"
                .. context_before_cursor
                .. "<|fim_suffix|>"
                .. context_after_cursor
                .. "<|fim_middle|>"
            end,
            suffix = false,
          },
        },
      },
    },
    commander = {
      {
        keys = { "n", "<leader>al" },
        cmd = "<cmd>Minuet virtualtext toggle<cr>",
        desc = "Local LLM: Toggle auto-completion (buffer)",
      },
    },
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
