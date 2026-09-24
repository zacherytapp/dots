return {
  "obsidian-nvim/obsidian.nvim",
  version = "*",
  lazy = true,
  event = {
    "BufReadPre " .. vim.fn.expand("~") .. "/Documents/brain/**.md",
    "BufNewFile " .. vim.fn.expand("~") .. "/Documents/brain/**.md",
  },
  dependencies = {
    "nvim-lua/plenary.nvim",
  },
  opts = {
    legacy_commands = false,
    workspaces = {
      { name = "personal", path = vim.fn.expand("~/Documents/brain") },
    },
    daily_notes = {
      folder = "daily",
      date_format = "%Y-%m-%d",
      default_tags = { "daily" },
    },
    completion = {
      nvim_cmp = false,
      min_chars = 2,
    },
    picker = { name = "fzf-lua" },
    ui = { enable = false }, -- Let render-markdown.nvim handle rendering
    attachments = {
      folder = "attachments",
    },
  },
  cmd = "Obsidian",
  commander = {
    {
      keys = { "n", "<leader>nf" },
      cmd = function()
        require("fzf-lua").files({ cwd = "~/Documents/brain" })
      end,
      desc = "Notes: Find note file",
    },
    { keys = { "n", "<leader>no" }, cmd = "<cmd>Obsidian quick_switch<cr>", desc = "Notes: Open note" },
    { keys = { "n", "<leader>nn" }, cmd = "<cmd>Obsidian new<cr>", desc = "Notes: New note" },
    { keys = { "n", "<leader>nd" }, cmd = "<cmd>Obsidian today<cr>", desc = "Notes: Daily note" },
    { keys = { "n", "<leader>ns" }, cmd = "<cmd>Obsidian search<cr>", desc = "Notes: Search" },
    { keys = { "n", "<leader>nb" }, cmd = "<cmd>Obsidian backlinks<cr>", desc = "Notes: Backlinks" },
    { keys = { "n", "<leader>nl" }, cmd = "<cmd>Obsidian links<cr>", desc = "Notes: Links" },
    { keys = { "n", "<leader>nt" }, cmd = "<cmd>Obsidian tags<cr>", desc = "Notes: Tags" },
    { keys = { "n", "<leader>nr" }, cmd = "<cmd>Obsidian rename<cr>", desc = "Notes: Rename" },
    { keys = { "n", "<leader>np" }, cmd = "<cmd>Obsidian pasteimg<cr>", desc = "Notes: Paste image" },
  },
}
