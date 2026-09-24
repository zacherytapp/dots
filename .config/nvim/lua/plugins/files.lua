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
    -- File explorer plugin
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
        -- tag = "v1.*",
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
      -- Toggle / Navigation
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
      -- File operations (reveal tree then act)
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
      -- Clipboard operations
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
      -- Navigation & display
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
      -- Split/tab operations
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
      -- Oil bridge
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
      -- don't reset the cursor position when opening a file
      -- Let Oil handle directory buffers; Neo-tree stays as sidebar only
      disable_netrw = false,
      hijack_netrw = false,
      close_if_last_window = false,
      enable_git_status = true,
      enable_diagnostics = true,
      sort_case_insensitive = false, -- used when sorting files and directories in the tree
      use_default_mappings = false,
      sort_function = nil, -- use a custom function for sorting files and directories in the tree
      source_selector = { winbar = true, statusline = false },
      default_component_configs = {
        container = { enable_character_fade = true },
        indent = {
          indent_size = 2,
          padding = 1, -- extra padding on left hand side
          -- indent guides
          with_markers = true,
          indent_marker = "│",
          last_indent_marker = "└",
          highlight = "NeoTreeIndentMarker",
          -- expander config, needed for nesting files
          with_expanders = nil, -- if nil and file nesting is enabled, will enable expanders
          expander_collapsed = icons.arrow_closed,
          expander_expanded = icons.arrow_open,
          expander_highlight = "NeoTreeExpander",
        },
        icon = {
          folder_closed = icons.default,
          folder_open = icons.open,
          folder_empty = icons.empty,
          -- The next two settings are only a fallback, if you use nvim-web-devicons and configure default icons there
          -- then these will never be used.
          default = "*",
          highlight = "NeoTreeFileIcon",
        },
        modified = { symbol = "[+]", highlight = "NeoTreeModified" },
        name = { trailing_slash = false, use_git_status_colors = true, highlight = "NeoTreeFileName" },
        git_status = {
          symbols = {
            -- Change type
            added = icons.added,
            modified = "",
            deleted = icons.deleted,
            renamed = icons.renamed,
            -- Status type
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
            nowait = false, -- disable `nowait` if you have existing combos starting with this char that you want to use
          },
          ["<2-LeftMouse>"] = "open",
          ["<cr>"] = "open",
          ["<esc>"] = "revert_preview",
          ["P"] = { "toggle_preview", config = { use_float = true } },
          ["l"] = "focus_preview",
          ["S"] = "open_split",
          ["s"] = "open_vsplit",
          -- ["S"] = "split_with_window_picker",
          -- ["s"] = "vsplit_with_window_picker",
          ["t"] = "open_tabnew",
          -- ["<cr>"] = "open_drop",
          -- ["t"] = "open_tab_drop",
          ["w"] = "open_with_window_picker",
          -- ["P"] = "toggle_preview", -- enter preview mode, which shows the current node without focusing
          ["C"] = "close_node",
          ["z"] = "close_all_nodes",
          -- ["Z"] = "expand_all_nodes",
          ["a"] = {
            "add",
            -- this command supports BASH style brace expansion ("x{a,b,c}" -> xa,xb,xc). see `:h neo-tree-file-actions` for details
            -- some commands may take optional config options, see `:h neo-tree-mappings` for details
            config = {
              show_path = "none", -- "none", "relative", "absolute"
            },
          },
          ["A"] = "add_directory", -- also accepts the optional config.show_path option like "add". this also supports BASH style brace expansion.
          ["d"] = "delete",
          ["r"] = "rename",
          ["y"] = "copy_to_clipboard",
          ["x"] = "cut_to_clipboard",
          ["p"] = "paste_from_clipboard",
          ["c"] = "copy", -- takes text input for destination, also accepts the optional config.show_path option like "add":
          -- ["c"] = {
          --  "copy",
          --  config = {
          --    show_path = "none" -- "none", "relative", "absolute"
          --  }
          -- }
          ["m"] = "move", -- takes text input for destination, also accepts the optional config.show_path option like "add".
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
          visible = true, -- when true, they will just be displayed differently than normal items
          hide_dotfiles = false,
          hide_gitignored = true,
          hide_hidden = true, -- only works on Windows for hidden files/directories
          hide_by_name = {
            -- "node_modules"
          },
          hide_by_pattern = { -- uses glob style patterns
            -- "*.meta",
            -- "*/src/*/tsconfig.json",
          },
          always_show = { -- remains visible even if other settings would normally hide it
            -- ".gitignored",
          },
          never_show = { -- remains hidden even if visible is toggled to true, this overrides always_show
            ".DS_Store",
            "thumbs.db",
          },
          never_show_by_pattern = { -- uses glob style patterns
            -- ".null-ls_*",
          },
        },
        bind_to_cwd = true,
        cwd_target = { sidebar = "tab", current = "window" },
        follow_current_file = { enabled = true }, -- This will find and focus the file in the active buffer every
        -- time the current file is changed while the tree is open.
        group_empty_dirs = false, -- when true, empty folders will be grouped together
        hijack_netrw_behavior = "disabled", -- let Oil handle directory opens
        use_libuv_file_watcher = false, -- This will use the OS level file watchers to detect changes
        -- instead of relying on nvim autocmd events.
        window = {
          mappings = {
            ["<bs>"] = "navigate_up",
            -- ["<c-.>"] = "set_root",
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
        follow_current_file = { enabled = true }, -- This will find and focus the file in the active buffer every
        -- time the current file is changed while the tree is open.
        group_empty_dirs = true, -- when true, empty folders will be grouped together
        show_unloaded = true,
        window = {
          mappings = {
            ["bd"] = "buffer_delete",
            ["<bs>"] = "navigate_up",
            -- ["<c-.>"] = "set_root",
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
