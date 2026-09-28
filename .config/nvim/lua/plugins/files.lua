local icons = require("assets").icons

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
    commander = {
      {
        keys = { "n", "<leader>fo" },
        cmd = [[<cmd>Oil --float .<cr>]],
        desc = "Oil: Open cwd (float)",
      },
    },
  },
  {
    "nvim-neo-tree/neo-tree.nvim",
    branch = "v3.x",
    lazy = true,
    cmd = { "Neotree" },
    cond = not vim.g.vscode,
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
            other_win_hl_color = "#ea6962",
          })
        end,
      },
    },
    commander = {
      {
        keys = { "n", "<leader>fe" },
        cmd = function()
          require("neo-tree.command").execute({ toggle = true, dir = require("util").root() })
        end,
        desc = "Explorer NeoTree (root dir)",
      },
      {
        keys = { "n", "<leader>fE" },
        cmd = function()
          require("neo-tree.command").execute({ toggle = true, dir = vim.uv.cwd() })
        end,
        desc = "Explorer NeoTree (cwd)",
      },
      {
        keys = { "n", "<leader>e" },
        cmd = function()
          require("neo-tree.command").execute({ toggle = true, reveal = true, dir = require("util").root() })
        end,
        desc = "Explorer NeoTree (root dir)",
      },
      {
        keys = { "n", "<leader>E" },
        cmd = function()
          require("neo-tree.command").execute({ toggle = true, dir = vim.uv.cwd() })
        end,
        desc = "Explorer NeoTree (cwd)",
      },
      {
        keys = { "n", "<leader>ge" },
        cmd = [[<cmd>Neotree float git_status<cr>]],
        desc = "Git explorer",
      },
      {
        keys = { "n", "<leader>be" },
        cmd = [[<cmd>Neotree float buffers<cr>]],
        desc = "Buffer explorer",
      },
      {
        desc = "NeoTree: Create file (a)",
        cmd = function()
          vim.cmd("Neotree reveal action=focus")
          vim.defer_fn(function()
            vim.api.nvim_feedkeys("a", "n", false)
          end, 100)
        end,
      },
      {
        desc = "NeoTree: Create directory (A)",
        cmd = function()
          vim.cmd("Neotree reveal action=focus")
          vim.defer_fn(function()
            vim.api.nvim_feedkeys("A", "n", false)
          end, 100)
        end,
      },
      {
        desc = "NeoTree: Delete file/dir (d)",
        cmd = function()
          vim.cmd("Neotree reveal action=focus")
          vim.defer_fn(function()
            vim.api.nvim_feedkeys("d", "n", false)
          end, 100)
        end,
      },
      {
        desc = "NeoTree: Rename file/dir (r)",
        cmd = function()
          vim.cmd("Neotree reveal action=focus")
          vim.defer_fn(function()
            vim.api.nvim_feedkeys("r", "n", false)
          end, 100)
        end,
      },
      {
        desc = "NeoTree: Move file/dir (m)",
        cmd = function()
          vim.cmd("Neotree reveal action=focus")
          vim.defer_fn(function()
            vim.api.nvim_feedkeys("m", "n", false)
          end, 100)
        end,
      },
      {
        desc = "NeoTree: Copy file/dir (c)",
        cmd = function()
          vim.cmd("Neotree reveal action=focus")
          vim.defer_fn(function()
            vim.api.nvim_feedkeys("c", "n", false)
          end, 100)
        end,
      },
      {
        desc = "NeoTree: Copy to clipboard (y)",
        cmd = function()
          vim.cmd("Neotree reveal action=focus")
          vim.defer_fn(function()
            vim.api.nvim_feedkeys("y", "n", false)
          end, 100)
        end,
      },
      {
        desc = "NeoTree: Cut to clipboard (x)",
        cmd = function()
          vim.cmd("Neotree reveal action=focus")
          vim.defer_fn(function()
            vim.api.nvim_feedkeys("x", "n", false)
          end, 100)
        end,
      },
      {
        desc = "NeoTree: Paste from clipboard (p)",
        cmd = function()
          vim.cmd("Neotree reveal action=focus")
          vim.defer_fn(function()
            vim.api.nvim_feedkeys("p", "n", false)
          end, 100)
        end,
      },
      {
        desc = "NeoTree: Toggle hidden files (H)",
        cmd = function()
          vim.cmd("Neotree reveal action=focus")
          vim.defer_fn(function()
            vim.api.nvim_feedkeys("H", "n", false)
          end, 100)
        end,
      },
      {
        desc = "NeoTree: Fuzzy finder (/)",
        cmd = function()
          vim.cmd("Neotree reveal action=focus")
          vim.defer_fn(function()
            vim.api.nvim_feedkeys("/", "n", false)
          end, 100)
        end,
      },
      {
        desc = "NeoTree: Navigate up (<BS>)",
        cmd = function()
          vim.cmd("Neotree reveal action=focus")
          vim.defer_fn(function()
            vim.api.nvim_feedkeys(vim.api.nvim_replace_termcodes("<BS>", true, false, true), "n", false)
          end, 100)
        end,
      },
      {
        desc = "NeoTree: Preview file (P)",
        cmd = function()
          vim.cmd("Neotree reveal action=focus")
          vim.defer_fn(function()
            vim.api.nvim_feedkeys("P", "n", false)
          end, 100)
        end,
      },
      {
        desc = "NeoTree: Open in split (S)",
        cmd = function()
          vim.cmd("Neotree reveal action=focus")
          vim.defer_fn(function()
            vim.api.nvim_feedkeys("S", "n", false)
          end, 100)
        end,
      },
      {
        desc = "NeoTree: Open in vsplit (s)",
        cmd = function()
          vim.cmd("Neotree reveal action=focus")
          vim.defer_fn(function()
            vim.api.nvim_feedkeys("s", "n", false)
          end, 100)
        end,
      },
      {
        desc = "NeoTree: Open in new tab (t)",
        cmd = function()
          vim.cmd("Neotree reveal action=focus")
          vim.defer_fn(function()
            vim.api.nvim_feedkeys("t", "n", false)
          end, 100)
        end,
      },
      {
        desc = "NeoTree: Open with window picker (w)",
        cmd = function()
          vim.cmd("Neotree reveal action=focus")
          vim.defer_fn(function()
            vim.api.nvim_feedkeys("w", "n", false)
          end, 100)
        end,
      },
      {
        desc = "NeoTree: Open directory in Oil (o)",
        cmd = function()
          vim.cmd("Neotree reveal action=focus")
          vim.defer_fn(function()
            vim.api.nvim_feedkeys("o", "n", false)
          end, 100)
        end,
      },
    },
    opts = {
      -- Oil owns directory buffers; Neo-tree is only a sidebar
      disable_netrw = false,
      hijack_netrw = false,
      close_if_last_window = false,
      enable_git_status = true,
      enable_diagnostics = true,
      sort_case_insensitive = false,
      use_default_mappings = false,
      sort_function = nil,
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
          with_expanders = nil,
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
            config = {
              show_path = "none",
            },
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
          hide_by_name = {
          },
          hide_by_pattern = {
          },
          always_show = {
          },
          never_show = {
            ".DS_Store",
            "thumbs.db",
          },
          never_show_by_pattern = {
          },
        },
        bind_to_cwd = true,
        cwd_target = { sidebar = "tab", current = "window" },
        follow_current_file = { enabled = true },
        group_empty_dirs = false,
        hijack_netrw_behavior = "disabled",
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
