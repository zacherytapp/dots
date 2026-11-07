local M = {}

M.icons = {
  -- diagnostic icons
  error = " ",
  warning = " ",
  info = " ",
  hint = "󰌶 ",
  lsp = " ",
  -- git icons
  conflict = "",
  unstaged = "● ",
  staged = "✓ ",
  renamed = "➜ ",
  untracked = " ",
  ignored = "◌ ",
  modified = "● ",
  deleted = " ",
  added = " ",
  -- file icons
  arrow_closed = " ",
  arrow_open = " ",
  default = " ",
  open = " ",
  empty = " ",
}

-- Gruvbox Material (dark, medium, "material" foreground): the same palette as
-- .config/hypr/config/colors.lua and the Noctalia GruvboxMaterial palette
M.colors = {
  bg1 = "#32302f",
  bg3 = "#45403d",
  bg5 = "#5a524c",
  fg0 = "#d4be98",
  grey0 = "#7c6f64",
  grey1 = "#928374",
  red = "#ea6962",
  orange = "#e78a4e",
  yellow = "#d8a657",
  green = "#a9b665",
  aqua = "#89b482",
  blue = "#7daea3",
  purple = "#d3869b",
  salesforce = "#009ddc",
}

return M
