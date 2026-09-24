return {
  {
    "nvim-treesitter/nvim-treesitter",
    branch = "main",
    build = ":TSUpdate",
    lazy = false,
    opts_extend = { "ensure_installed" },
    opts = {
      -- Language files add their parsers
      ensure_installed = {
        "bash",
        "comment",
        "diff",
        "editorconfig",
        "git_config",
        "git_rebase",
        "gitattributes",
        "gitcommit",
        "gitignore",
        "html",
        "ini",
        "make",
        "markdown",
        "markdown_inline",
        "printf",
        "query",
        "regex",
        "sql", -- injected by after/queries (go, ecma)
        "toml",
        "vim",
        "vimdoc",
        "xml",
      },
      -- filetype -> parser for filetypes without a parser of their own
      register = {
        dotenv = "bash",
      },
      -- Filetypes that keep Vim's runtime indentexpr (treesitter indent is worse)
      runtime_indent = {},
    },
    config = function(_, opts)
      local ts = require("nvim-treesitter")
      local wanted = {}
      for _, lang in ipairs(opts.ensure_installed) do
        wanted[lang] = true
      end
      local installed = {}
      for _, lang in ipairs(ts.get_installed()) do
        installed[lang] = true
      end
      local missing = vim.tbl_filter(function(lang)
        return not installed[lang]
      end, vim.tbl_keys(wanted))
      if #missing > 0 then
        table.sort(missing)
        ts.install(missing)
      end

      for ft, lang in pairs(opts.register) do
        vim.treesitter.language.register(lang, ft)
      end

      -- Enable highlighting + indentation for filetypes that have a parser.
      -- Without the parser check every buffer would get a treesitter indentexpr.
      vim.api.nvim_create_autocmd("FileType", {
        group = vim.api.nvim_create_augroup("user_treesitter", { clear = true }),
        callback = function(args)
          if not pcall(vim.treesitter.start, args.buf) then
            return
          end
          if not opts.runtime_indent[vim.bo[args.buf].filetype] then
            vim.bo[args.buf].indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
          end
        end,
      })
    end,
  },
  {
    "nvim-treesitter/nvim-treesitter-context",
    event = { "BufReadPost", "BufNewFile" },
    opts = { max_lines = 3, separator = "─" },
  },
  {
    "windwp/nvim-ts-autotag",
    event = { "BufReadPre", "BufNewFile" },
    opts = {
      aliases = {
        visualforce = "html",
        aura = "html",
        gotmpl = "html",
        htmldjango = "html",
        jinja = "html",
      },
    },
  },
  {
    "nvim-treesitter/nvim-treesitter-textobjects",
    branch = "main",
    event = "VeryLazy",
    config = function()
      require("nvim-treesitter-textobjects").setup({
        select = { lookahead = true },
        move = { set_jumps = true },
      })
      local move = require("nvim-treesitter-textobjects.move")
      local swap = require("nvim-treesitter-textobjects.swap")

      -- LazyVim motions: ]f function, ]c class, ]a argument (capitals = end),
      -- plus ]i conditional and ]o loop. ]c / [c keep Vim's diff meaning in diff mode.
      local moves = {
        goto_next_start = {
          ["]f"] = "@function.outer",
          ["]c"] = "@class.outer",
          ["]a"] = "@parameter.inner",
          ["]i"] = "@conditional.outer",
          ["]o"] = "@loop.outer",
        },
        goto_next_end = {
          ["]F"] = "@function.outer",
          ["]C"] = "@class.outer",
          ["]A"] = "@parameter.inner",
          ["]I"] = "@conditional.outer",
          ["]O"] = "@loop.outer",
        },
        goto_previous_start = {
          ["[f"] = "@function.outer",
          ["[c"] = "@class.outer",
          ["[a"] = "@parameter.inner",
          ["[i"] = "@conditional.outer",
          ["[o"] = "@loop.outer",
        },
        goto_previous_end = {
          ["[F"] = "@function.outer",
          ["[C"] = "@class.outer",
          ["[A"] = "@parameter.inner",
          ["[I"] = "@conditional.outer",
          ["[O"] = "@loop.outer",
        },
      }
      for method, keymaps in pairs(moves) do
        for key, query in pairs(keymaps) do
          local desc = (key:sub(1, 1) == "[" and "Prev " or "Next ")
            .. query:gsub("@", ""):gsub("%..*", "")
            .. (key:sub(2, 2):match("%u") and " end" or " start")
          vim.keymap.set({ "n", "x", "o" }, key, function()
            if vim.wo.diff and key:find("[cC]") then
              return vim.cmd("normal! " .. key)
            end
            move[method](query, "textobjects")
          end, { desc = desc, silent = true })
        end
      end

      -- Swap with next / previous (<leader>cx)
      local swaps = {
        ["<leader>cxa"] = { "swap_next", "@parameter.inner", "Swap argument with next" },
        ["<leader>cxA"] = { "swap_previous", "@parameter.inner", "Swap argument with previous" },
        ["<leader>cxf"] = { "swap_next", "@function.outer", "Swap function with next" },
        ["<leader>cxF"] = { "swap_previous", "@function.outer", "Swap function with previous" },
        ["<leader>cxp"] = { "swap_next", "@property.outer", "Swap property with next" },
        ["<leader>cxP"] = { "swap_previous", "@property.outer", "Swap property with previous" },
      }
      for key, s in pairs(swaps) do
        vim.keymap.set("n", key, function()
          swap[s[1]](s[2])
        end, { desc = s[3] })
      end
    end,
  },
}
