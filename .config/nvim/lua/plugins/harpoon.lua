local keys = {
  {
    "<leader>h",
    function()
      local harpoon = require("harpoon")
      harpoon.ui:toggle_quick_menu(harpoon:list())
    end,
    desc = "Harpoon quick menu",
  },
  {
    "<leader>H",
    function()
      require("harpoon"):list():add()
    end,
    desc = "Harpoon file",
  },
}
for i = 1, 9 do
  keys[#keys + 1] = {
    "<leader>" .. i,
    function()
      require("harpoon"):list():select(i)
    end,
    desc = "Harpoon: Go to " .. i,
  }
end

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
    keys = keys,
  },
}
