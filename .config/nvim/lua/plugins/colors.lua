return {
  "folke/tokyonight.nvim",
  lazy = false,
  priority = 1000,
  opts = {},
  config = function ()
    require('tokyonight').setup({
      style = 'night',
      transparent = true,
      terminal_colors = true,
      styles = {
        sidebars = 'transparent',
        floats = 'transparent'
      }
    })
    vim.cmd.colorscheme 'tokyonight'
  end
}
