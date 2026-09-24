return {
  {
    "ThePrimeagen/harpoon",
    branch = "harpoon2",
    dependencies = { "nvim-lua/plenary.nvim" },
    lazy = true,
    opts = {
      settings = {
        save_on_toggle = true,
        sync_on_ui_close = true,
      },
    },
    commander = {
      {
        keys = { "n", "<leader>h" },
        cmd = function()
          local harpoon = require("harpoon")
          harpoon.ui:toggle_quick_menu(harpoon:list())
        end,
        desc = "Harpoon quick menu",
      },
      {
        keys = { "n", "<leader>H" },
        cmd = function()
          local harpoon = require("harpoon")
          harpoon:list():add()
        end,
        desc = "Harpoon file",
      },
      {
        keys = { "n", "<leader>1" },
        cmd = function()
          local harpoon = require("harpoon")
          harpoon:list():select(1)
        end,
        desc = "Harpoon: Go to 1",
      },
      {
        keys = { "n", "<leader>2" },
        cmd = function()
          local harpoon = require("harpoon")
          harpoon:list():select(2)
        end,
        desc = "Harpoon: Go to 2",
      },
      {
        keys = { "n", "<leader>3" },
        cmd = function()
          local harpoon = require("harpoon")
          harpoon:list():select(3)
        end,
        desc = "Harpoon: Go to 3",
      },
      {
        keys = { "n", "<leader>4" },
        cmd = function()
          local harpoon = require("harpoon")
          harpoon:list():select(4)
        end,
        desc = "Harpoon: Go to 4",
      },
      {
        keys = { "n", "<leader>5" },
        cmd = function()
          local harpoon = require("harpoon")
          harpoon:list():select(5)
        end,
        desc = "Harpoon: Go to 5",
      },
      {
        keys = { "n", "<leader>6" },
        cmd = function()
          local harpoon = require("harpoon")
          harpoon:list():select(6)
        end,
        desc = "Harpoon: Go to 6",
      },
      {
        keys = { "n", "<leader>7" },
        cmd = function()
          local harpoon = require("harpoon")
          harpoon:list():select(7)
        end,
        desc = "Harpoon: Go to 7",
      },
      {
        keys = { "n", "<leader>8" },
        cmd = function()
          local harpoon = require("harpoon")
          harpoon:list():select(8)
        end,
        desc = "Harpoon: Go to 8",
      },
      {
        keys = { "n", "<leader>9" },
        cmd = function()
          local harpoon = require("harpoon")
          harpoon:list():select(9)
        end,
        desc = "Harpoon: Go to 9",
      },
    },
  },
}
