local icons = require("assets").icons

-- Neo-tree actions exposed in the palette: { key, description }. Each focuses
-- (revealing the current file) the tree, then feeds the key to it.
local neotree_actions = {
  { "a", "Create file" },
  { "A", "Create directory" },
  { "d", "Delete file/dir" },
  { "r", "Rename file/dir" },
  { "m", "Move file/dir" },
  { "c", "Copy file/dir" },
  { "y", "Copy to clipboard" },
  { "x", "Cut to clipboard" },
  { "p", "Paste from clipboard" },
  { "H", "Toggle hidden files" },
  { "/", "Fuzzy finder" },
  { "<BS>", "Navigate up" },
  { "P", "Preview file" },
  { "S", "Open in split" },
  { "s", "Open in vsplit" },
  { "t", "Open in new tab" },
  { "w", "Open with window picker" },
  { "o", "Open directory in Oil" },
}

local function neotree_palette()
  return vim.tbl_map(function(action)
    local key, desc = action[1], action[2]
    return {
      desc = ("NeoTree: %s (%s)"):format(desc, key),
      cmd = function()
        vim.cmd("Neotree reveal action=focus")
        vim.defer_fn(function()
          vim.api.nvim_feedkeys(vim.keycode(key), "n", false)
        end, 100)
      end,
    }
  end, neotree_actions)
end

return {
  {
    "stevearc/oil.nvim",
    lazy = false,
    opts = {
      columns = {
        "icon",
        "size",
        "mtime",
      },
      view_options = {
        show_hidden = true,
      },
      delete_to_trash = true,
      constrain_cursor = "name",
      watch_for_changes = true,
      float = {
        max_width = 80,
        max_height = 30,
      },
    },
    keys = { { "<leader>fo", "<cmd>Oil --float .<cr>", desc = "Oil: Open cwd (float)" } },
  },
  {
    -- File explorer plugin
    "nvim-neo-tree/neo-tree.nvim",
    branch = "v3.x",
    lazy = true,
    cmd = { "Neotree" },
    dependencies = {
      "nvim-lua/plenary.nvim",
      "MunifTanjim/nui.nvim",
      {
        "s1n7ax/nvim-window-picker",
        config = function()
          require("window-picker").setup({
            autoselect_one = true,
            include_current = false,
            filter_rules = {
              bo = {
                filetype = { "neo-tree", "neo-tree-popup", "notify" },
                buftype = { "terminal", "quickfix" },
              },
            },
            border = { style = "rounded", highlight = "Normal" },
            other_win_hl_color = require("assets").colors.red,
          })
        end,
      },
    },
    keys = {
      {
        "<leader>e",
        function()
          require("neo-tree.command").execute({ toggle = true, reveal = true, dir = require("util").root() })
        end,
        desc = "Explorer NeoTree (root dir)",
      },
      {
        "<leader>E",
        function()
          require("neo-tree.command").execute({ toggle = true, dir = vim.uv.cwd() })
        end,
        desc = "Explorer NeoTree (cwd)",
      },
      { "<leader>ge", "<cmd>Neotree float git_status<cr>", desc = "Git explorer" },
      { "<leader>be", "<cmd>Neotree float buffers<cr>", desc = "Buffer explorer" },
    },
    palette = neotree_palette(),
    opts = {
      -- Let Oil handle directory buffers; Neo-tree stays as sidebar only
      disable_netrw = false,
      hijack_netrw = false,
      close_if_last_window = false,
      enable_git_status = true,
      enable_diagnostics = true,
      sort_case_insensitive = false,
      use_default_mappings = false,
      source_selector = { winbar = true, statusline = false },
      default_component_configs = {
        container = { enable_character_fade = true },
        indent = {
          indent_size = 2,
          padding = 1,
          with_markers = true,
          indent_marker = "│",
          last_indent_marker = "└",
          highlight = "NeoTreeIndentMarker",
          expander_collapsed = icons.arrow_closed,
          expander_expanded = icons.arrow_open,
          expander_highlight = "NeoTreeExpander",
        },
        icon = {
          folder_closed = icons.default,
          folder_open = icons.open,
          folder_empty = icons.empty,
          default = "*",
          highlight = "NeoTreeFileIcon",
        },
        modified = { symbol = "[+]", highlight = "NeoTreeModified" },
        name = { trailing_slash = false, use_git_status_colors = true, highlight = "NeoTreeFileName" },
        git_status = {
          symbols = {
            added = icons.added,
            modified = "",
            deleted = icons.deleted,
            renamed = icons.renamed,
            untracked = icons.untracked,
            ignored = icons.ignored,
            unstaged = icons.unstaged,
            staged = icons.staged,
            conflict = icons.conflict,
          },
        },
      },
      window = {
        position = "left",
        width = 40,
        mapping_options = { noremap = true, nowait = true },
        mappings = {
          ["<space>"] = {
            "toggle_node",
            nowait = false,
          },
          ["<2-LeftMouse>"] = "open",
          ["<cr>"] = "open",
          ["<esc>"] = "revert_preview",
          ["P"] = { "toggle_preview", config = { use_float = true } },
          ["l"] = "focus_preview",
          ["S"] = "open_split",
          ["s"] = "open_vsplit",
          ["t"] = "open_tabnew",
          ["w"] = "open_with_window_picker",
          ["C"] = "close_node",
          ["z"] = "close_all_nodes",
          ["a"] = {
            "add",
            config = { show_path = "none" },
          },
          ["A"] = "add_directory",
          ["d"] = "delete",
          ["r"] = "rename",
          ["y"] = "copy_to_clipboard",
          ["x"] = "cut_to_clipboard",
          ["p"] = "paste_from_clipboard",
          ["c"] = "copy",
          ["m"] = "move",
          ["q"] = "close_window",
          ["R"] = "refresh",
          ["?"] = "show_help",
          ["<"] = "prev_source",
          [">"] = "next_source",
          ["o"] = {
            function(state)
              local node = state.tree:get_node()
              local path = node.type == "directory" and node:get_id() or vim.fn.fnamemodify(node:get_id(), ":h")
              -- Close Neo-tree sidebar, then open Oil in that directory
              vim.cmd("Neotree close")
              require("oil").open(path)
            end,
            desc = "Open in Oil",
          },
        },
      },
      nesting_rules = {
        ["ts"] = { "spec.ts", "spec.tsx", "stories.tsx", "stories.mdx" },
        ["tsx"] = { "spec.ts", "spec.tsx", "stories.tsx", "stories.mdx" },
        ["js"] = { "d.ts" },
        ["jsx"] = { "d.ts" },
      },
      filesystem = {
        filtered_items = {
          visible = true,
          hide_dotfiles = false,
          hide_gitignored = true,
          hide_hidden = true,
          never_show = {
            ".DS_Store",
            "thumbs.db",
          },
        },
        bind_to_cwd = true,
        cwd_target = { sidebar = "tab", current = "window" },
        follow_current_file = { enabled = true },
        group_empty_dirs = false,
        hijack_netrw_behavior = "disabled", -- let Oil handle directory opens
        use_libuv_file_watcher = false,
        window = {
          mappings = {
            ["<bs>"] = "navigate_up",
            ["H"] = "toggle_hidden",
            ["/"] = "fuzzy_finder",
            ["D"] = "fuzzy_finder_directory",
            ["f"] = "filter_on_submit",
            ["<c-x>"] = "clear_filter",
            ["[g"] = "prev_git_modified",
            ["]g"] = "next_git_modified",
          },
        },
      },
      buffers = {
        follow_current_file = { enabled = true },
        group_empty_dirs = true,
        show_unloaded = true,
        window = {
          mappings = {
            ["bd"] = "buffer_delete",
            ["<bs>"] = "navigate_up",
          },
        },
      },
      git_status = {
        window = {
          position = "float",
          mappings = {
            ["A"] = "git_add_all",
            ["gu"] = "git_unstage_file",
            ["ga"] = "git_add_file",
            ["gr"] = "git_revert_file",
            ["gc"] = "git_commit",
            ["gp"] = "git_push",
            ["gg"] = "git_commit_and_push",
          },
        },
      },
    },
  },
}
