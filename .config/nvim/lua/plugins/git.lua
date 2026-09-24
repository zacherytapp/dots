return {
  {
    "tpope/vim-fugitive",
    cmd = { "Git", "G", "Gread", "Gwrite", "Gdiffsplit", "Gvdiffsplit", "GBrowse" },
    dependencies = { "tpope/vim-rhubarb" },
    commander = {
      { keys = { "n", "<leader>gv" }, cmd = "<cmd>Git<cr>", desc = "Fugitive status" },
      { cmd = "<cmd>Gread<cr>", desc = "Git: Read file from index (Gread)" },
      { cmd = "<cmd>Gwrite<cr>", desc = "Git: Stage file (Gwrite)" },
    },
  },
  {
    "akinsho/git-conflict.nvim",
    version = "*",
    event = { "BufReadPost", "BufNewFile" },
    -- co / ct / cb / c0 choose ours / theirs / both / none; ]x / [x next / prev conflict
    config = true,
  },
  {
    "lewis6991/gitsigns.nvim",
    event = { "BufReadPre", "BufNewFile" },
    opts = {
      signs = {
        add = { text = "▎" },
        change = { text = "▎" },
        delete = { text = "\u{f0da}" },
        topdelete = { text = "\u{f0da}" },
        changedelete = { text = "▎" },
        untracked = { text = "▎" },
      },
      signs_staged = {
        add = { text = "▎" },
        change = { text = "▎" },
        delete = { text = "\u{f0da}" },
        topdelete = { text = "\u{f0da}" },
        changedelete = { text = "▎" },
      },
    },
    commander = {
      {
        keys = { "n", "]h" },
        cmd = function()
          if vim.wo.diff then
            vim.cmd.normal({ "]c", bang = true })
          else
            require("gitsigns").nav_hunk("next")
          end
        end,
        desc = "Next hunk",
      },
      {
        keys = { "n", "[h" },
        cmd = function()
          if vim.wo.diff then
            vim.cmd.normal({ "[c", bang = true })
          else
            require("gitsigns").nav_hunk("prev")
          end
        end,
        desc = "Prev hunk",
      },
      {
        keys = { "n", "]H" },
        cmd = function()
          require("gitsigns").nav_hunk("last")
        end,
        desc = "Last hunk",
      },
      {
        keys = { "n", "[H" },
        cmd = function()
          require("gitsigns").nav_hunk("first")
        end,
        desc = "First hunk",
      },
      { keys = { { "n", "x" }, "<leader>ghs" }, cmd = ":Gitsigns stage_hunk<cr>", desc = "Stage hunk" },
      { keys = { { "n", "x" }, "<leader>ghr" }, cmd = ":Gitsigns reset_hunk<cr>", desc = "Reset hunk" },
      {
        keys = { "n", "<leader>ghS" },
        cmd = function()
          require("gitsigns").stage_buffer()
        end,
        desc = "Stage buffer",
      },
      {
        keys = { "n", "<leader>ghu" },
        cmd = function()
          require("gitsigns").undo_stage_hunk()
        end,
        desc = "Undo stage hunk",
      },
      {
        keys = { "n", "<leader>ghR" },
        cmd = function()
          require("gitsigns").reset_buffer()
        end,
        desc = "Reset buffer",
      },
      {
        keys = { "n", "<leader>ghp" },
        cmd = function()
          require("gitsigns").preview_hunk_inline()
        end,
        desc = "Preview hunk inline",
      },
      {
        keys = { "n", "<leader>ghb" },
        cmd = function()
          require("gitsigns").blame_line({ full = true })
        end,
        desc = "Blame line",
      },
      {
        keys = { "n", "<leader>ghB" },
        cmd = function()
          require("gitsigns").blame()
        end,
        desc = "Blame buffer",
      },
      {
        keys = { "n", "<leader>ghd" },
        cmd = function()
          require("gitsigns").diffthis()
        end,
        desc = "Diff this",
      },
      {
        keys = { "n", "<leader>ghD" },
        cmd = function()
          require("gitsigns").diffthis("~")
        end,
        desc = "Diff this ~",
      },
      { keys = { { "o", "x" }, "ih" }, cmd = ":<C-U>Gitsigns select_hunk<cr>", desc = "Select hunk" },
    },
  },
  {
    "sindrets/diffview.nvim",
    dependencies = { "nvim-lua/plenary.nvim" },
    cmd = { "DiffviewOpen", "DiffviewFileHistory", "DiffviewClose" },
    opts = {
      enhanced_diff_hl = true,
      view = {
        default = { layout = "diff2_horizontal" },
        merge_tool = { layout = "diff3_mixed" },
      },
      file_panel = {
        listing_style = "tree",
        win_config = { position = "left", width = 35 },
      },
    },
    commander = {
      { keys = { "n", "<leader>gd" }, cmd = "<cmd>DiffviewOpen<cr>", desc = "Diffview (all changes)" },
      { keys = { "n", "<leader>gD" }, cmd = "<cmd>DiffviewClose<cr>", desc = "Diffview close" },
      { keys = { "n", "<leader>gf" }, cmd = "<cmd>DiffviewFileHistory %<cr>", desc = "File history (Diffview)" },
      { keys = { "n", "<leader>gF" }, cmd = "<cmd>DiffviewFileHistory<cr>", desc = "Repo history (Diffview)" },
    },
  },
  {
    "pwntester/octo.nvim",
    dependencies = { "nvim-lua/plenary.nvim", "ibhagwan/fzf-lua" },
    cmd = "Octo",
    opts = { picker = "fzf-lua" },
    commander = {
      { keys = { "n", "<leader>gpl" }, cmd = "<cmd>Octo pr list<cr>", desc = "List pull requests" },
      { keys = { "n", "<leader>gpc" }, cmd = "<cmd>Octo pr create<cr>", desc = "Create pull request" },
      { keys = { "n", "<leader>gpr" }, cmd = "<cmd>Octo review start<cr>", desc = "Start PR review" },
      { keys = { "n", "<leader>gpR" }, cmd = "<cmd>Octo review submit<cr>", desc = "Submit PR review" },
      { keys = { "n", "<leader>gil" }, cmd = "<cmd>Octo issue list<cr>", desc = "List issues" },
      { keys = { "n", "<leader>gic" }, cmd = "<cmd>Octo issue create<cr>", desc = "Create issue" },
    },
  },
}
