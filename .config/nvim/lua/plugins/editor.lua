return {
  "tpope/vim-abolish",
  "tpope/vim-repeat",
  "tpope/vim-sleuth",
  {
    "folke/which-key.nvim",
    event = "VeryLazy",
    cond = not vim.g.vscode,
    opts_extend = { "spec" },
    opts = {
      preset = "helix",
      defaults = {},
      spec = {
        {
          mode = { "n", "x" },
          { "<leader><tab>", group = "tabs" },
          { "<leader>a", group = "ai", icon = { icon = "󰚩 ", color = "purple" } },
          { "<leader>c", group = "code" },
          { "<leader>cg", group = "go", icon = { icon = "\u{e627} ", color = "blue" } },
          { "<leader>cn", group = "npm", icon = { icon = "\u{e71e} ", color = "red" } },
          { "<leader>cw", group = "workspace" },
          { "<leader>cx", group = "swap" },
          { "<leader>d", group = "debug" },
          { "<leader>dP", group = "python", icon = { icon = "\u{e606} ", color = "yellow" } },
          { "<leader>f", group = "file/find" },
          { "<leader>g", group = "git" },
          { "<leader>gh", group = "hunks" },
          { "<leader>gi", group = "issues (octo)" },
          { "<leader>gp", group = "pull requests (octo)" },
          { "<leader>h", icon = { icon = "󰛢 ", color = "cyan" } },
          { "<leader>H", icon = { icon = "󰛢 ", color = "cyan" } },
          { "<leader>m", group = "salesforce", icon = { icon = "󰢎 ", color = "azure" } },
          { "<leader>mc", group = "compare" },
          { "<leader>md", group = "deploy" },
          { "<leader>mm", group = "metadata" },
          { "<leader>mn", group = "new" },
          { "<leader>mo", group = "org" },
          { "<leader>mq", group = "query / execute" },
          { "<leader>mr", group = "retrieve" },
          { "<leader>mt", group = "test" },
          { "<leader>mx", group = "destructive", icon = { icon = "\u{f1f8} ", color = "red" } },
          { "<leader>n", group = "notes", icon = { icon = "󰠮 ", color = "purple" } },
          { "<leader>o", group = "overseer", icon = { icon = "\u{f0ae} ", color = "green" } },
          { "<leader>q", group = "quit/session" },
          { "<leader>s", group = "search" },
          { "<leader>sn", group = "noice" },
          { "<leader>t", group = "test" },
          { "<leader>u", group = "ui", icon = { icon = "󰙵 ", color = "cyan" } },
          { "<leader>x", group = "diagnostics/quickfix", icon = { icon = "󱖫 ", color = "green" } },
          { "[", group = "prev" },
          { "]", group = "next" },
          { "g", group = "goto" },
          { "gs", group = "surround" },
          { "z", group = "fold" },
          {
            "<leader>b",
            group = "buffer",
            expand = function()
              return require("which-key.extras").expand.buf()
            end,
          },
          {
            "<leader>w",
            group = "windows",
            proxy = "<c-w>",
            expand = function()
              return require("which-key.extras").expand.win()
            end,
          },
          -- better descriptions
          { "gx", desc = "Open with system app" },
        },
      },
    },
    commander = {
      {
        keys = { "n", "<leader>?" },
        cmd = function()
          require("which-key").show({ global = false })
        end,
        desc = "Buffer keymaps (which-key)",
      },
      {
        keys = { "n", "<c-w><space>" },
        cmd = function()
          require("which-key").show({ keys = "<c-w>", loop = true })
        end,
        desc = "Window hydra mode (which-key)",
      },
    },
  },
  {
    "folke/flash.nvim",
    event = "VeryLazy",
    ---@type Flash.Config
    opts = {},
    commander = {
      {
        keys = { { "n", "x", "o" }, "s" },
        cmd = function()
          require("flash").jump()
        end,
        desc = "Flash",
      },
      {
        keys = { { "n", "o", "x" }, "S" },
        cmd = function()
          require("flash").treesitter()
        end,
        desc = "Flash treesitter",
      },
      {
        keys = { "o", "r" },
        cmd = function()
          require("flash").remote()
        end,
        desc = "Remote flash",
      },
      {
        keys = { { "o", "x" }, "R" },
        cmd = function()
          require("flash").treesitter_search()
        end,
        desc = "Treesitter search",
      },
      {
        keys = { "c", "<c-s>" },
        cmd = function()
          require("flash").toggle()
        end,
        desc = "Toggle flash search",
      },
    },
  },
  {
    "folke/persistence.nvim",
    event = "BufReadPre",
    opts = {},
    commander = {
      {
        keys = { "n", "<leader>qs" },
        cmd = function()
          require("persistence").load()
        end,
        desc = "Restore session",
      },
      {
        keys = { "n", "<leader>qS" },
        cmd = function()
          require("persistence").select()
        end,
        desc = "Select session",
      },
      {
        keys = { "n", "<leader>ql" },
        cmd = function()
          require("persistence").load({ last = true })
        end,
        desc = "Restore last session",
      },
      {
        keys = { "n", "<leader>qd" },
        cmd = function()
          require("persistence").stop()
        end,
        desc = "Don't save current session",
      },
    },
  },
  {
    "MagicDuck/grug-far.nvim",
    cond = not vim.g.vscode,
    cmd = { "GrugFar", "GrugFarWithin" },
    opts = { headerMaxWidth = 80 },
    commander = {
      {
        keys = { { "n", "x" }, "<leader>sr" },
        cmd = function()
          local grug = require("grug-far")
          local ext = vim.bo.buftype == "" and vim.fn.expand("%:e")
          grug.open({
            transient = true,
            prefills = { filesFilter = ext and ext ~= "" and "*." .. ext or nil },
          })
        end,
        desc = "Search and replace",
      },
      {
        keys = { "n", "<leader>sF" },
        cmd = function()
          require("grug-far").open({ prefills = { paths = vim.fn.expand("%") } })
        end,
        desc = "Search and replace in file",
      },
    },
  },
  {
    "stevearc/overseer.nvim",
    cmd = { "OverseerOpen", "OverseerClose", "OverseerToggle", "OverseerRun", "OverseerShell", "OverseerTaskAction" },
    opts = {},
    commander = {
      { keys = { "n", "<leader>ow" }, cmd = "<cmd>OverseerToggle<cr>", desc = "Task list" },
      { keys = { "n", "<leader>oo" }, cmd = "<cmd>OverseerRun<cr>", desc = "Run task" },
      { keys = { "n", "<leader>os" }, cmd = "<cmd>OverseerShell<cr>", desc = "Run shell command" },
      { keys = { "n", "<leader>ot" }, cmd = "<cmd>OverseerTaskAction<cr>", desc = "Task action" },
    },
  },
  {
    "nat-418/boole.nvim",
    event = "VeryLazy",
    opts = {
      mappings = { increment = "<C-a>", decrement = "<C-x>" },
      allow_caps_additions = { { "enable", "disable" } },
    },
  },
  {
    "andymass/vim-matchup",
    cond = not vim.g.vscode,
    init = function()
      vim.g.matchup_matchparen_offscreen = { method = "popup" }
    end,
  },
  {
    "itchyny/vim-qfedit",
    cond = not vim.g.vscode,
    event = "VeryLazy",
  },
  {
    "folke/todo-comments.nvim",
    event = { "BufReadPost", "BufNewFile" },
    cmd = { "TodoTrouble", "TodoFzfLua" },
    opts = {},
    commander = {
      {
        keys = { "n", "]t" },
        cmd = function()
          require("todo-comments").jump_next()
        end,
        desc = "Next todo comment",
      },
      {
        keys = { "n", "[t" },
        cmd = function()
          require("todo-comments").jump_prev()
        end,
        desc = "Previous todo comment",
      },
      { keys = { "n", "<leader>xt" }, cmd = "<cmd>Trouble todo toggle<cr>", desc = "Todo (Trouble)" },
      {
        keys = { "n", "<leader>xT" },
        cmd = "<cmd>Trouble todo toggle filter = {tag = {TODO,FIX,FIXME}}<cr>",
        desc = "Todo/Fix/Fixme (Trouble)",
      },
      { keys = { "n", "<leader>st" }, cmd = "<cmd>TodoFzfLua<cr>", desc = "Todo" },
      { keys = { "n", "<leader>sT" }, cmd = "<cmd>TodoFzfLua keywords=TODO,FIX,FIXME<cr>", desc = "Todo/Fix/Fixme" },
    },
  },
  {
    "mbbill/undotree",
    cmd = "UndotreeToggle",
    commander = {
      { keys = { "n", "<leader>su" }, cmd = "<cmd>UndotreeToggle<cr>", desc = "Undo tree" },
    },
  },
  {
    "hedyhli/outline.nvim",
    cmd = { "Outline", "OutlineOpen" },
    opts = {
      providers = { priority = { "lsp", "treesitter", "markdown", "norg", "man" } },
      symbol_folding = { autofold_depth = false },
    },
    commander = {
      { keys = { "n", "<leader>cs" }, cmd = "<cmd>Outline<cr>", desc = "Symbols outline" },
    },
  },
  {
    "windwp/nvim-autopairs",
    event = "InsertEnter",
    opts = {
      disable_in_macro = true,
      check_ts = true,
      ts_config = {
        lua = { "string" },
        javascript = { "template_string" },
        java = false,
        yaml = { "string" },
      },
    },
  },
  {
    "catgoose/nvim-colorizer.lua",
    event = { "BufReadPost", "BufNewFile" },
    opts = {
      filetypes = { "css", "scss", "less", "html", "svelte", "javascriptreact", "typescriptreact", "lua" },
      user_default_options = { names = false, tailwind = true },
    },
  },
}
