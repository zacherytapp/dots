local util = require("util")

--- fzf-lua picker rooted at the project root (LazyVim's "root dir")
---@param picker string
---@param opts? table|fun():table
local function pick(picker, opts)
  return function()
    local o = type(opts) == "function" and opts() or vim.deepcopy(opts or {})
    if o.cwd == nil then
      o.cwd = util.root()
    end
    require("fzf-lua")[picker](o)
  end
end

--- Same picker in Neovim's cwd
local function pick_cwd(picker, opts)
  return function()
    require("fzf-lua")[picker](opts or {})
  end
end

return {
  {
    "ibhagwan/fzf-lua",
    cmd = "FzfLua",
    init = function()
      -- fzf-lua owns vim.ui.select (commander's palette uses it too)
      ---@diagnostic disable-next-line: duplicate-set-field
      vim.ui.select = function(...)
        require("lazy").load({ plugins = { "fzf-lua" } })
        return vim.ui.select(...)
      end
    end,
    opts = function()
      local actions = require("fzf-lua.actions")
      return {
        "default-title",
        fzf_colors = true,
        fzf_opts = { ["--no-scrollbar"] = true },
        defaults = { formatter = "path.filename_first" },
        winopts = {
          width = 0.85,
          height = 0.85,
          row = 0.5,
          col = 0.5,
          preview = { scrollchars = { "┃", "" }, horizontal = "right:60%" },
        },
        keymap = {
          fzf = { ["ctrl-q"] = "select-all+accept" },
        },
        files = {
          cwd_prompt = false,
          actions = {
            ["alt-i"] = { actions.toggle_ignore },
            ["alt-h"] = { actions.toggle_hidden },
          },
        },
        grep = {
          actions = {
            ["alt-i"] = { actions.toggle_ignore },
            ["alt-h"] = { actions.toggle_hidden },
          },
        },
        oldfiles = { include_current_session = true },
        lsp = {
          symbols = { symbol_style = 1 },
          code_actions = { previewer = vim.fn.executable("delta") == 1 and "codeaction_native" or nil },
        },
        ui_select = function(fzf_opts, items)
          -- Wider prompt for commander's palette and code actions
          return vim.tbl_deep_extend("force", fzf_opts, {
            prompt = " ",
            winopts = {
              title = " " .. vim.trim((fzf_opts.prompt or "Select"):gsub("%s*:%s*$", "")) .. " ",
              title_pos = "center",
              width = 0.6,
              height = math.floor(math.min(vim.o.lines * 0.7 - 16, #items + 2) + 0.5) + 16,
            },
          }, fzf_opts.kind == "codeaction" and {
            winopts = {
              layout = "vertical",
              height = 0.6,
              preview = { layout = "vertical", vertical = "down:15,border-top" },
            },
          } or {})
        end,
      }
    end,
    config = function(_, opts)
      local ui_select = opts.ui_select
      opts.ui_select = nil
      require("fzf-lua").setup(opts)
      require("fzf-lua").register_ui_select(ui_select)
    end,
    commander = {
      -- Top level
      { keys = { "n", "<leader><space>" }, cmd = pick("files"), desc = "Find files (root dir)" },
      { keys = { "n", "<leader>/" }, cmd = pick("live_grep"), desc = "Grep (root dir)" },
      {
        keys = { "n", "<leader>," },
        cmd = pick_cwd("buffers", { sort_mru = true, sort_lastused = true }),
        desc = "Switch buffer",
      },
      { keys = { "n", "<leader>:" }, cmd = "<cmd>FzfLua command_history<cr>", desc = "Command history" },
      -- Find
      {
        keys = { "n", "<leader>fb" },
        cmd = pick_cwd("buffers", { sort_mru = true, sort_lastused = true }),
        desc = "Buffers",
      },
      {
        keys = { "n", "<leader>fc" },
        cmd = pick("files", { cwd = vim.fn.stdpath("config") }),
        desc = "Find config file",
      },
      { keys = { "n", "<leader>ff" }, cmd = pick("files"), desc = "Find files (root dir)" },
      { keys = { "n", "<leader>fF" }, cmd = pick_cwd("files"), desc = "Find files (cwd)" },
      { keys = { "n", "<leader>fg" }, cmd = pick("git_files"), desc = "Find files (git)" },
      { keys = { "n", "<leader>fr" }, cmd = pick_cwd("oldfiles"), desc = "Recent files" },
      { keys = { "n", "<leader>fR" }, cmd = pick_cwd("oldfiles", { cwd_only = true }), desc = "Recent files (cwd)" },
      {
        keys = { "n", "<leader>fp" },
        cmd = pick("files", { cwd = vim.fn.expand("~/projects") }),
        desc = "Find in ~/projects",
      },
      -- Git
      { keys = { "n", "<leader>gc" }, cmd = pick("git_commits"), desc = "Git commits" },
      { keys = { "n", "<leader>gC" }, cmd = pick("git_bcommits"), desc = "Git commits (buffer)" },
      { keys = { "n", "<leader>gs" }, cmd = pick("git_status"), desc = "Git status" },
      { keys = { "n", "<leader>gS" }, cmd = pick("git_stash"), desc = "Git stash" },
      { keys = { "n", "<leader>gr" }, cmd = pick("git_branches"), desc = "Git branches" },
      -- Search
      { keys = { "n", '<leader>s"' }, cmd = "<cmd>FzfLua registers<cr>", desc = "Registers" },
      { keys = { "n", "<leader>sa" }, cmd = "<cmd>FzfLua autocmds<cr>", desc = "Auto commands" },
      { keys = { "n", "<leader>sb" }, cmd = "<cmd>FzfLua lgrep_curbuf<cr>", desc = "Buffer lines" },
      { keys = { "n", "<leader>sc" }, cmd = "<cmd>FzfLua command_history<cr>", desc = "Command history" },
      { keys = { "n", "<leader>sC" }, cmd = "<cmd>FzfLua commands<cr>", desc = "Commands" },
      { keys = { "n", "<leader>sd" }, cmd = "<cmd>FzfLua diagnostics_document<cr>", desc = "Diagnostics (buffer)" },
      { keys = { "n", "<leader>sD" }, cmd = "<cmd>FzfLua diagnostics_workspace<cr>", desc = "Diagnostics (workspace)" },
      { keys = { "n", "<leader>sg" }, cmd = pick("live_grep"), desc = "Grep (root dir)" },
      { keys = { "n", "<leader>sG" }, cmd = pick_cwd("live_grep"), desc = "Grep (cwd)" },
      { keys = { "n", "<leader>sh" }, cmd = "<cmd>FzfLua help_tags<cr>", desc = "Help pages" },
      { keys = { "n", "<leader>sH" }, cmd = "<cmd>FzfLua highlights<cr>", desc = "Highlight groups" },
      { keys = { "n", "<leader>sj" }, cmd = "<cmd>FzfLua jumps<cr>", desc = "Jumplist" },
      { keys = { "n", "<leader>sk" }, cmd = "<cmd>FzfLua keymaps<cr>", desc = "Keymaps" },
      { keys = { "n", "<leader>sl" }, cmd = "<cmd>FzfLua loclist<cr>", desc = "Location list" },
      { keys = { "n", "<leader>sM" }, cmd = "<cmd>FzfLua manpages<cr>", desc = "Man pages" },
      { keys = { "n", "<leader>sm" }, cmd = "<cmd>FzfLua marks<cr>", desc = "Marks" },
      { keys = { "n", "<leader>sR" }, cmd = "<cmd>FzfLua resume<cr>", desc = "Resume last picker" },
      { keys = { "n", "<leader>sq" }, cmd = "<cmd>FzfLua quickfix<cr>", desc = "Quickfix list" },
      { keys = { "n", "<leader>sw" }, cmd = pick("grep_cword"), desc = "Word under cursor (root dir)" },
      { keys = { "n", "<leader>sW" }, cmd = pick_cwd("grep_cword"), desc = "Word under cursor (cwd)" },
      { keys = { "x", "<leader>sw" }, cmd = pick("grep_visual"), desc = "Selection (root dir)" },
      { keys = { "x", "<leader>sW" }, cmd = pick_cwd("grep_visual"), desc = "Selection (cwd)" },
      { keys = { "n", "<leader>uC" }, cmd = "<cmd>FzfLua colorschemes<cr>", desc = "Colorscheme with preview" },
      { keys = { "n", "<leader>ss" }, cmd = "<cmd>FzfLua lsp_document_symbols<cr>", desc = "LSP symbols (buffer)" },
      {
        keys = { "n", "<leader>sS" },
        cmd = "<cmd>FzfLua lsp_live_workspace_symbols<cr>",
        desc = "LSP symbols (workspace)",
      },
      -- LSP goto
      {
        keys = { "n", "gd" },
        cmd = "<cmd>FzfLua lsp_definitions jump1=true ignore_current_line=true<cr>",
        desc = "LSP: Goto definition",
      },
      {
        keys = { "n", "gr", { nowait = true } },
        cmd = "<cmd>FzfLua lsp_references jump1=true ignore_current_line=true includeDeclaration=false<cr>",
        desc = "LSP: References",
      },
      {
        keys = { "n", "gI" },
        cmd = "<cmd>FzfLua lsp_implementations jump1=true ignore_current_line=true<cr>",
        desc = "LSP: Goto implementation",
      },
      {
        keys = { "n", "gy" },
        cmd = "<cmd>FzfLua lsp_typedefs jump1=true ignore_current_line=true<cr>",
        desc = "LSP: Goto type definition",
      },
    },
  },
}
