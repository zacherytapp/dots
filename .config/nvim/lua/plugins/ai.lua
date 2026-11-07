-- AI: Copilot (inline ghost text), minuet-ai (LLM completions in the blink menu
-- from the LM Studio box, health-gated by lua/util/ai.lua) and opencode.nvim.
-- Secrets and the Obsidian vault are kept away from all of them via
-- require("util.ai").allowed().
local call = require("util").call

return {
  {
    "zbirenbaum/copilot.lua",
    cmd = "Copilot",
    event = "InsertEnter",
    opts = {
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
        layout = { position = "bottom", ratio = 0.4 },
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
        ["."] = true,
      },
      -- .env / tfvars / keys / ~/.ssh etc. and the notes vault (lua/util/ai.lua)
      should_attach = function(bufnr)
        return require("util.ai").allowed(bufnr)
      end,
    },
  },

  {
    "milanglacier/minuet-ai.nvim",
    event = "InsertEnter",
    cmd = "Minuet",
    dependencies = { "nvim-lua/plenary.nvim" },
    opts = function()
      local ai = require("util.ai")
      return {
        -- FIM (fill-in-the-middle) via the OpenAI-style /v1/completions endpoint
        provider = "openai_fim_compatible",
        n_completions = 1,
        context_window = 4000,
        request_timeout = 3,
        throttle = 1000,
        debounce = 400,
        -- failures are expected when the box is off; util.ai reports state instead
        notify = false,
        -- fail fast when the host is unreachable (tailnet relay connects can take ~1.5s)
        curl_extra_args = { "--connect-timeout", "2" },
        -- called on every auto-trigger: both checks are cached lookups
        enable_predicates = {
          function()
            return ai.up() and ai.allowed(0)
          end,
        },
        blink = { enable_auto_complete = true },
        provider_options = {
          openai_fim_compatible = {
            name = "LM Studio",
            end_point = ai.backend.url .. "/v1/completions",
            model = ai.backend.model,
            api_key = "TERM", -- LM Studio needs no key; minuet wants a non-empty env var
            stream = true,
            optional = { max_tokens = 64, top_p = 0.9 },
          },
        },
      }
    end,
    config = function(_, opts)
      local ai = require("util.ai")
      require("minuet").setup(opts)
      ai.watch(opts.provider)
      ai.probe()
      vim.api.nvim_create_user_command("MinuetProbe", function()
        ai.probe(true)
      end, { desc = "Check the minuet backend now" })
    end,
    keys = {
      {
        "<leader>uM",
        function()
          local ai = require("util.ai")
          ai.set_enabled(ai.state == "off")
          if ai.state == "off" then
            vim.notify("Minuet disabled", vim.log.levels.INFO, { title = "minuet" })
          end
        end,
        desc = "Toggle Minuet (AI completion)",
      },
    },
    palette = {
      { desc = "Minuet: Check backend (model loaded / reachable)", cmd = "MinuetProbe" },
      { desc = "Minuet: Change model", cmd = "Minuet change_model" },
    },
  },
  {
    "saghen/blink.cmp",
    opts = {
      sources = {
        default = { "minuet" },
        providers = {
          minuet = {
            name = "minuet",
            module = "minuet.blink",
            async = true,
            timeout_ms = 3000, -- = minuet request_timeout
            score_offset = 50,
            -- skip the source entirely (manual triggers too) unless the backend is up
            enabled = function()
              return require("util.ai").up()
            end,
          },
        },
      },
    },
  },

  {
    "NickvanDyke/opencode.nvim",
    -- Snacks input/picker provide ask()/select()/toggle()
    dependencies = { "folke/snacks.nvim" },
    init = function()
      vim.g.opencode_opts = {}
    end,
    keys = {
      {
        "<leader>aa",
        function()
          require("opencode").ask("@this: ", { submit = true })
        end,
        mode = { "n", "x" },
        desc = "OpenCode: Ask about this",
      },
      { "<leader>a+", call("opencode", "prompt", "@this"), mode = { "n", "x" }, desc = "OpenCode: Add this" },
      { "<leader>as", call("opencode", "select"), mode = { "n", "x" }, desc = "OpenCode: Select prompt" },
      { "<leader>at", call("opencode", "toggle"), desc = "OpenCode: Toggle embedded" },
      { "<leader>ac", call("opencode", "command"), desc = "OpenCode: Select command" },
      { "<leader>an", call("opencode", "command", "session_new"), desc = "OpenCode: New session" },
      { "<leader>ai", call("opencode", "command", "session_interrupt"), desc = "OpenCode: Interrupt session" },
      { "<leader>aA", call("opencode", "command", "agent_cycle"), desc = "OpenCode: Cycle selected agent" },
      {
        "<S-C-u>",
        call("opencode", "command", "messages_half_page_up"),
        desc = "OpenCode: Messages half page up",
      },
      {
        "<S-C-d>",
        call("opencode", "command", "messages_half_page_down"),
        desc = "OpenCode: Messages half page down",
      },
    },
  },
}
