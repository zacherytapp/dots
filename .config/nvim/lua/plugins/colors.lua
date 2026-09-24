-- Gruvbox Material (dark, medium contrast, "material" foreground): the same
-- palette as .config/hypr/config/colors.lua and the Noctalia GruvboxMaterial
-- palette, so the editor matches the rest of the desktop.
local p = {
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
}

local overrides = {
  -- Floats & popups (transparent)
  NormalFloat = { bg = "none" },
  FloatBorder = { bg = "none", fg = p.grey1 },
  FloatTitle = { bg = "none", fg = p.blue },
  WhichKeyFloat = { bg = "none" },

  -- Noice cmdline & popups (transparent)
  NoiceCmdline = { bg = "none" },
  NoiceCmdlinePopup = { bg = "none" },
  NoiceCmdlinePopupBorder = { bg = "none", fg = p.grey1 },
  NoiceCmdlinePopupTitle = { bg = "none", fg = p.blue },
  NoiceCmdlineIcon = { bg = "none", fg = p.blue },
  NoiceCmdlineIconCmdline = { bg = "none", fg = p.blue },
  NoiceCmdlineIconSearch = { bg = "none", fg = p.yellow },
  NoicePopup = { bg = "none" },
  NoicePopupmenu = { bg = "none" },
  NoicePopupmenuBorder = { bg = "none", fg = p.grey1 },
  NoicePopupmenuSelected = { bg = p.bg3 },
  NoicePopupmenuMatch = { fg = p.green, bold = true },
  NoiceConfirm = { bg = "none" },
  NoiceConfirmBorder = { bg = "none", fg = p.grey1 },
  NoiceMini = { bg = "none" },

  -- Pmenu (native popup menu - transparent)
  Pmenu = { bg = "none", fg = p.fg0 },
  PmenuSel = { bg = p.bg3 },
  PmenuSbar = { bg = "none" },
  PmenuThumb = { bg = p.grey0 },

  -- Window elements (transparent)
  Folded = { bg = "none" },
  WinSeparator = { bg = "none", fg = p.bg5 },
  WinBar = { bg = "none" },
  WinBarNC = { bg = "none" },

  -- Inlay hints: dim, no background
  LspInlayHint = { bg = "none", fg = p.grey0, italic = true },

  -- Diagnostic virtual text (italic)
  DiagnosticVirtualTextError = { fg = p.red, italic = true },
  DiagnosticVirtualTextWarn = { fg = p.yellow, italic = true },
  DiagnosticVirtualTextInfo = { fg = p.blue, italic = true },
  DiagnosticVirtualTextHint = { fg = p.aqua, italic = true },

  -- Diagnostic underlines (undercurl in the severity colors)
  DiagnosticUnderlineError = { undercurl = true, sp = p.red },
  DiagnosticUnderlineWarn = { undercurl = true, sp = p.yellow },
  DiagnosticUnderlineInfo = { undercurl = true, sp = p.blue },
  DiagnosticUnderlineHint = { undercurl = true, sp = p.aqua },

  -- Blink completion
  BlinkCmpMenu = { bg = p.bg1, fg = p.fg0 },
  BlinkCmpMenuBorder = { bg = "none", fg = p.grey1 },
  BlinkCmpMenuSelection = { bg = p.bg3, fg = p.fg0, bold = true },
  BlinkCmpLabel = { fg = p.fg0 },
  BlinkCmpLabelMatch = { fg = p.green, bold = true },
  BlinkCmpLabelDetail = { fg = p.grey1 },
  BlinkCmpLabelDeprecated = { fg = p.grey1, strikethrough = true },
  BlinkCmpDoc = { bg = p.bg1, fg = p.fg0 },
  BlinkCmpDocBorder = { bg = "none", fg = p.grey1 },
  BlinkCmpDocSeparator = { bg = "none", fg = p.grey1 },
  BlinkCmpSignatureHelp = { bg = p.bg1, fg = p.fg0 },
  BlinkCmpSignatureHelpBorder = { bg = "none", fg = p.grey1 },

  -- fzf-lua (fully transparent)
  FzfLuaNormal = { bg = "none" },
  FzfLuaBorder = { bg = "none", fg = p.grey1 },
  FzfLuaTitle = { bg = "none", fg = p.blue, bold = true },
  FzfLuaPreviewNormal = { bg = "none" },
  FzfLuaPreviewBorder = { bg = "none", fg = p.grey1 },
  FzfLuaPreviewTitle = { bg = "none", fg = p.blue },
  FzfLuaCursorLine = { bg = p.bg3 },
  FzfLuaHeaderText = { fg = p.orange },

  -- which-key / snacks / lazy / mason floats (transparent)
  WhichKeyNormal = { bg = "none" },
  WhichKeyBorder = { bg = "none", fg = p.grey1 },
  SnacksNormal = { bg = "none" },
  SnacksWinBar = { bg = "none" },
  SnacksNotifierBorderInfo = { bg = "none", fg = p.blue },
  SnacksDashboardHeader = { fg = p.green },
  SnacksIndent = { fg = p.bg3 },
  SnacksIndentScope = { fg = p.grey0 },
  LazyNormal = { bg = "none" },
  MasonNormal = { bg = "none" },

  -- Git signs
  GitSignsAdd = { fg = p.green },
  GitSignsChange = { fg = p.yellow },
  GitSignsDelete = { fg = p.red },

  -- Treesitter context (transparent)
  TreesitterContext = { bg = "none" },
  TreesitterContextLineNumber = { bg = "none" },

  -- Prevent gopls semantic tokens from overriding treesitter highlights
  ["@lsp.type.variable.go"] = {},
  ["@lsp.type.parameter.go"] = {},
  ["@lsp.type.property.go"] = {},
  ["@lsp.type.namespace.go"] = {},
  ["@lsp.type.function.go"] = {},
  ["@lsp.type.method.go"] = {},
  ["@lsp.type.type.go"] = {},
  ["@lsp.type.keyword.go"] = {},
}

return {
  {
    "sainnhe/gruvbox-material",
    priority = 1000,
    lazy = false,
    init = function()
      vim.g.gruvbox_material_background = "medium"
      vim.g.gruvbox_material_foreground = "material"
      vim.g.gruvbox_material_transparent_background = 1
      vim.g.gruvbox_material_enable_italic = 1
      vim.g.gruvbox_material_enable_bold = 1
      vim.g.gruvbox_material_diagnostic_virtual_text = "colored"
      vim.g.gruvbox_material_better_performance = 1

      -- Re-applied on every :colorscheme so the overrides survive a reload
      vim.api.nvim_create_autocmd("ColorScheme", {
        group = vim.api.nvim_create_augroup("gruvbox_material_overrides", { clear = true }),
        pattern = "gruvbox-material",
        callback = function()
          for group, spec in pairs(overrides) do
            vim.api.nvim_set_hl(0, group, spec)
          end
        end,
      })
    end,
  },
}
