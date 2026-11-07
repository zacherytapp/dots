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
    -- completion comes from obsidian's built-in obsidian-ls server (via blink's lsp source)
    picker = { name = "fzf-lua" },
    ui = { enable = false }, -- Let render-markdown.nvim handle rendering
    attachments = {
      folder = "attachments",
    },
  },
  cmd = "Obsidian",
  keys = {
    {
      "<leader>nf",
      function()
        require("fzf-lua").files({ cwd = "~/Documents/brain" })
      end,
      desc = "Notes: Find note file",
    },
    { "<leader>no", "<cmd>Obsidian quick_switch<cr>", desc = "Notes: Open note" },
    { "<leader>nn", "<cmd>Obsidian new<cr>", desc = "Notes: New note" },
    { "<leader>nd", "<cmd>Obsidian today<cr>", desc = "Notes: Daily note" },
    { "<leader>ns", "<cmd>Obsidian search<cr>", desc = "Notes: Search" },
    { "<leader>nb", "<cmd>Obsidian backlinks<cr>", desc = "Notes: Backlinks" },
    { "<leader>nl", "<cmd>Obsidian links<cr>", desc = "Notes: Links" },
    { "<leader>nt", "<cmd>Obsidian tags<cr>", desc = "Notes: Tags" },
    { "<leader>nr", "<cmd>Obsidian rename<cr>", desc = "Notes: Rename" },
    { "<leader>np", "<cmd>Obsidian pasteimg<cr>", desc = "Notes: Paste image" },
  },
}
