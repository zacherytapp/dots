local call = require("util").call

return {
  {
    "tpope/vim-fugitive",
    cmd = { "Git", "G", "Gread", "Gwrite", "Gdiffsplit", "Gvdiffsplit" },
    keys = { { "<leader>gv", "<cmd>Git<cr>", desc = "Fugitive status" } },
    palette = {
      { desc = "Git: Read file from index (Gread)", cmd = "<cmd>Gread<cr>" },
      { desc = "Git: Stage file (Gwrite)", cmd = "<cmd>Gwrite<cr>" },
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
    keys = {
      {
        "]h",
        function()
          if vim.wo.diff then
            vim.cmd.normal({ "]c", bang = true })
          else
            require("gitsigns").nav_hunk("next")
          end
        end,
        desc = "Next hunk",
      },
      {
        "[h",
        function()
          if vim.wo.diff then
            vim.cmd.normal({ "[c", bang = true })
          else
            require("gitsigns").nav_hunk("prev")
          end
        end,
        desc = "Prev hunk",
      },
      { "]H", call("gitsigns", "nav_hunk", "last"), desc = "Last hunk" },
      { "[H", call("gitsigns", "nav_hunk", "first"), desc = "First hunk" },
      { "<leader>ghs", ":Gitsigns stage_hunk<cr>", mode = { "n", "x" }, desc = "Stage hunk" },
      { "<leader>ghr", ":Gitsigns reset_hunk<cr>", mode = { "n", "x" }, desc = "Reset hunk" },
      { "<leader>ghS", call("gitsigns", "stage_buffer"), desc = "Stage buffer" },
      { "<leader>ghu", call("gitsigns", "undo_stage_hunk"), desc = "Undo stage hunk" },
      { "<leader>ghR", call("gitsigns", "reset_buffer"), desc = "Reset buffer" },
      { "<leader>ghp", call("gitsigns", "preview_hunk_inline"), desc = "Preview hunk inline" },
      { "<leader>ghB", call("gitsigns", "blame"), desc = "Blame buffer" },
      { "<leader>ghd", call("gitsigns", "diffthis"), desc = "Diff this" },
      { "<leader>ghD", call("gitsigns", "diffthis", "~"), desc = "Diff this ~" },
      { "ih", ":<C-U>Gitsigns select_hunk<cr>", mode = { "o", "x" }, desc = "Select hunk" },
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
    keys = {
      { "<leader>gd", "<cmd>DiffviewOpen<cr>", desc = "Diffview (all changes)" },
      { "<leader>gD", "<cmd>DiffviewClose<cr>", desc = "Diffview close" },
      { "<leader>gf", "<cmd>DiffviewFileHistory %<cr>", desc = "File history (Diffview)" },
      { "<leader>gF", "<cmd>DiffviewFileHistory<cr>", desc = "Repo history (Diffview)" },
    },
  },
  {
    "pwntester/octo.nvim",
    dependencies = { "nvim-lua/plenary.nvim", "ibhagwan/fzf-lua" },
    cmd = "Octo",
    opts = { picker = "fzf-lua" },
    keys = {
      { "<leader>gpl", "<cmd>Octo pr list<cr>", desc = "List pull requests" },
      { "<leader>gpc", "<cmd>Octo pr create<cr>", desc = "Create pull request" },
      { "<leader>gpr", "<cmd>Octo review start<cr>", desc = "Start PR review" },
      { "<leader>gpR", "<cmd>Octo review submit<cr>", desc = "Submit PR review" },
      { "<leader>gil", "<cmd>Octo issue list<cr>", desc = "List issues" },
      { "<leader>gic", "<cmd>Octo issue create<cr>", desc = "Create issue" },
    },
  },
}
