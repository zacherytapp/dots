local call = require("util").call

return {
  "tpope/vim-abolish",
  "tpope/vim-repeat",
  "tpope/vim-sleuth",
  {
    "folke/which-key.nvim",
    event = "VeryLazy",
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
          { "gx", desc = "Open with system app" },
        },
      },
    },
    keys = {
      { "<leader>?", call("which-key", "show", { global = false }), desc = "Buffer keymaps (which-key)" },
      {
        "<c-w><space>",
        call("which-key", "show", { keys = "<c-w>", loop = true }),
        desc = "Window hydra mode (which-key)",
      },
    },
  },
  {
    "folke/flash.nvim",
    event = "VeryLazy",
    ---@type Flash.Config
    opts = {},
    keys = {
      { "s", call("flash", "jump"), mode = { "n", "x", "o" }, desc = "Flash" },
      { "S", call("flash", "treesitter"), mode = { "n", "x", "o" }, desc = "Flash treesitter" },
      { "r", call("flash", "remote"), mode = "o", desc = "Remote flash" },
      { "R", call("flash", "treesitter_search"), mode = { "o", "x" }, desc = "Treesitter search" },
      { "<c-s>", call("flash", "toggle"), mode = "c", desc = "Toggle flash search" },
    },
  },
  {
    "folke/persistence.nvim",
    event = "BufReadPre",
    opts = {},
    keys = {
      { "<leader>qs", call("persistence", "load"), desc = "Restore session" },
      { "<leader>qS", call("persistence", "select"), desc = "Select session" },
      { "<leader>ql", call("persistence", "load", { last = true }), desc = "Restore last session" },
      { "<leader>qd", call("persistence", "stop"), desc = "Don't save current session" },
    },
  },
  {
    "MagicDuck/grug-far.nvim",
    cmd = { "GrugFar", "GrugFarWithin" },
    opts = { headerMaxWidth = 80 },
    keys = {
      {
        "<leader>sr",
        function()
          local grug = require("grug-far")
          local ext = vim.bo.buftype == "" and vim.fn.expand("%:e")
          grug.open({
            transient = true,
            prefills = { filesFilter = ext and ext ~= "" and "*." .. ext or nil },
          })
        end,
        mode = { "n", "x" },
        desc = "Search and replace",
      },
      {
        "<leader>sF",
        function()
          require("grug-far").open({ prefills = { paths = vim.fn.expand("%") } })
        end,
        desc = "Search and replace in file",
      },
    },
  },
  {
    "stevearc/overseer.nvim",
    cmd = {
      "OverseerOpen",
      "OverseerClose",
      "OverseerToggle",
      "OverseerRun",
      "OverseerShell",
      "OverseerTaskAction",
    },
    opts = {},
    keys = {
      { "<leader>ow", "<cmd>OverseerToggle<cr>", desc = "Task list" },
      { "<leader>oo", "<cmd>OverseerRun<cr>", desc = "Run task" },
      { "<leader>os", "<cmd>OverseerShell<cr>", desc = "Run shell command" },
      { "<leader>ot", "<cmd>OverseerTaskAction<cr>", desc = "Task action" },
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
    init = function()
      vim.g.matchup_matchparen_offscreen = { method = "popup" }
    end,
  },
  {
    "itchyny/vim-qfedit",
    event = "VeryLazy",
  },
  {
    "folke/todo-comments.nvim",
    event = { "BufReadPost", "BufNewFile" },
    cmd = { "TodoTrouble", "TodoFzfLua" },
    opts = {},
    keys = {
      { "]t", call("todo-comments", "jump_next"), desc = "Next todo comment" },
      { "[t", call("todo-comments", "jump_prev"), desc = "Previous todo comment" },
      { "<leader>xt", "<cmd>Trouble todo toggle<cr>", desc = "Todo (Trouble)" },
      {
        "<leader>xT",
        "<cmd>Trouble todo toggle filter = {tag = {TODO,FIX,FIXME}}<cr>",
        desc = "Todo/Fix/Fixme (Trouble)",
      },
      { "<leader>st", "<cmd>TodoFzfLua<cr>", desc = "Todo" },
      { "<leader>sT", "<cmd>TodoFzfLua keywords=TODO,FIX,FIXME<cr>", desc = "Todo/Fix/Fixme" },
    },
  },
  {
    "mbbill/undotree",
    cmd = "UndotreeToggle",
    keys = { { "<leader>su", "<cmd>UndotreeToggle<cr>", desc = "Undo tree" } },
  },
  {
    "hedyhli/outline.nvim",
    cmd = { "Outline", "OutlineOpen" },
    opts = {
      providers = { priority = { "lsp", "treesitter", "markdown", "norg", "man" } },
      symbol_folding = { autofold_depth = false },
    },
    keys = { { "<leader>cs", "<cmd>Outline<cr>", desc = "Symbols outline" } },
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
