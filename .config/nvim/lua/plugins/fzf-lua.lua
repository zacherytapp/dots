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
      -- fzf-lua owns vim.ui.select (the <leader>k command palette uses it too)
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
          -- Wider prompt for the command palette and code actions
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
    keys = {
      -- Top level
      { "<leader><space>", pick("files"), desc = "Find files (root dir)" },
      { "<leader>/", pick("live_grep"), desc = "Grep (root dir)" },
      { "<leader>,", pick_cwd("buffers", { sort_mru = true, sort_lastused = true }), desc = "Switch buffer" },
      { "<leader>:", "<cmd>FzfLua command_history<cr>", desc = "Command history" },
      -- Find
      { "<leader>fb", pick_cwd("buffers", { sort_mru = true, sort_lastused = true }), desc = "Find buffers" },
      { "<leader>fc", pick("files", { cwd = vim.fn.stdpath("config") }), desc = "Find config file" },
      { "<leader>ff", pick("files"), desc = "Find files (root dir)" },
      { "<leader>fF", pick_cwd("files"), desc = "Find files (cwd)" },
      { "<leader>fg", pick("git_files"), desc = "Find files (git)" },
      { "<leader>fr", pick_cwd("oldfiles"), desc = "Recent files" },
      { "<leader>fR", pick_cwd("oldfiles", { cwd_only = true }), desc = "Recent files (cwd)" },
      {
        "<leader>fp",
        pick("files", { cwd = vim.env.XDG_PROJECTS_DIR or vim.fn.expand("~/Projects") }),
        desc = "Find in ~/Projects",
      },
      -- Git
      { "<leader>gc", pick("git_commits"), desc = "Git commits" },
      { "<leader>gC", pick("git_bcommits"), desc = "Git commits (buffer)" },
      { "<leader>gs", pick("git_status"), desc = "Git status" },
      { "<leader>gS", pick("git_stash"), desc = "Git stash" },
      { "<leader>gr", pick("git_branches"), desc = "Git branches" },
      -- Search
      { '<leader>s"', "<cmd>FzfLua registers<cr>", desc = "Registers" },
      { "<leader>sa", "<cmd>FzfLua autocmds<cr>", desc = "Auto commands" },
      { "<leader>sb", "<cmd>FzfLua lgrep_curbuf<cr>", desc = "Buffer lines" },
      { "<leader>sC", "<cmd>FzfLua commands<cr>", desc = "Commands" },
      { "<leader>sd", "<cmd>FzfLua diagnostics_document<cr>", desc = "Diagnostics (buffer)" },
      { "<leader>sD", "<cmd>FzfLua diagnostics_workspace<cr>", desc = "Diagnostics (workspace)" },
      { "<leader>sg", pick("live_grep"), desc = "Grep (root dir)" },
      { "<leader>sG", pick_cwd("live_grep"), desc = "Grep (cwd)" },
      { "<leader>sh", "<cmd>FzfLua help_tags<cr>", desc = "Help pages" },
      { "<leader>sH", "<cmd>FzfLua highlights<cr>", desc = "Highlight groups" },
      { "<leader>sj", "<cmd>FzfLua jumps<cr>", desc = "Jumplist" },
      { "<leader>sk", "<cmd>FzfLua keymaps<cr>", desc = "Keymaps" },
      { "<leader>sl", "<cmd>FzfLua loclist<cr>", desc = "Location list" },
      { "<leader>sM", "<cmd>FzfLua manpages<cr>", desc = "Man pages" },
      { "<leader>sm", "<cmd>FzfLua marks<cr>", desc = "Marks" },
      { "<leader>sR", "<cmd>FzfLua resume<cr>", desc = "Resume last picker" },
      { "<leader>sq", "<cmd>FzfLua quickfix<cr>", desc = "Quickfix list" },
      { "<leader>sw", pick("grep_cword"), desc = "Word under cursor (root dir)" },
      { "<leader>sW", pick_cwd("grep_cword"), desc = "Word under cursor (cwd)" },
      { "<leader>sw", pick("grep_visual"), mode = "x", desc = "Selection (root dir)" },
      { "<leader>sW", pick_cwd("grep_visual"), mode = "x", desc = "Selection (cwd)" },
      { "<leader>uC", "<cmd>FzfLua colorschemes<cr>", desc = "Colorscheme with preview" },
      { "<leader>ss", "<cmd>FzfLua lsp_document_symbols<cr>", desc = "LSP symbols (buffer)" },
      { "<leader>sS", "<cmd>FzfLua lsp_live_workspace_symbols<cr>", desc = "LSP symbols (workspace)" },
      -- LSP goto
      {
        "gd",
        "<cmd>FzfLua lsp_definitions jump1=true ignore_current_line=true<cr>",
        desc = "LSP: Goto definition",
      },
      {
        "gr",
        "<cmd>FzfLua lsp_references jump1=true ignore_current_line=true includeDeclaration=false<cr>",
        nowait = true,
        desc = "LSP: References",
      },
      {
        "gI",
        "<cmd>FzfLua lsp_implementations jump1=true ignore_current_line=true<cr>",
        desc = "LSP: Goto implementation",
      },
      {
        "gy",
        "<cmd>FzfLua lsp_typedefs jump1=true ignore_current_line=true<cr>",
        desc = "LSP: Goto type definition",
      },
    },
  },
}
