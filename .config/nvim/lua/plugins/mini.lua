local sf = { glyph = "󰢎", hl = "MiniIconsBlue" }
local markup = { glyph = "\u{f121}", hl = "MiniIconsGreen" }
local gotmpl = { glyph = "󰟓", hl = "MiniIconsCyan" }
local jinja = { glyph = "\u{f071e}", hl = "MiniIconsRed" }

return {
  {
    "echasnovski/mini.nvim",
    version = "*",
    lazy = false,
    init = function()
      -- mini.icons stands in for nvim-web-devicons for every plugin
      package.preload["nvim-web-devicons"] = function()
        require("mini.icons").mock_nvim_web_devicons()
        return package.loaded["nvim-web-devicons"]
      end
    end,
    config = function()
      require("mini.misc").setup({})

      require("mini.icons").setup({
        lsp = {
          snippet = { glyph = "󱄽", hl = "MiniIconsGreen" },
        },
        file = {
          [".forceignore"] = { glyph = "󰢎", hl = "MiniIconsGrey" },
          ["sfdx-project.json"] = sf,
          ["Caddyfile"] = { glyph = "󰒒", hl = "MiniIconsGreen" },
          ["Chart.yaml"] = { glyph = "󱃾", hl = "MiniIconsAzure" },
          ["ansible.cfg"] = { glyph = "󱂚", hl = "MiniIconsRed" },
          [".prettierrc"] = { glyph = "\u{e6b4}", hl = "MiniIconsPurple" },
          ["devcontainer.json"] = { glyph = "\u{f308}", hl = "MiniIconsAzure" },
        },
        filetype = {
          apex = sf,
          soql = { glyph = "󰆼", hl = "MiniIconsBlue" },
          sosl = { glyph = "󰆼", hl = "MiniIconsBlue" },
          sflog = { glyph = "󰌱", hl = "MiniIconsGrey" },
          visualforce = markup,
          aura = markup,
          gotmpl = gotmpl,
          templ = gotmpl,
          helm = { glyph = "󱃾", hl = "MiniIconsAzure" },
          jinja = jinja,
          htmldjango = jinja,
          caddy = { glyph = "󰒒", hl = "MiniIconsGreen" },
          opentofu = { glyph = "\u{f1062}", hl = "MiniIconsYellow" },
          ["opentofu-vars"] = { glyph = "\u{f1062}", hl = "MiniIconsYellow" },
          ["yaml.ansible"] = { glyph = "󱂚", hl = "MiniIconsRed" },
          ["yaml.docker-compose"] = { glyph = "󰡨", hl = "MiniIconsBlue" },
          ["hcl.docker-bake"] = { glyph = "󰡨", hl = "MiniIconsBlue" },
          dotenv = { glyph = "\u{f462}", hl = "MiniIconsYellow" },
        },
        extension = {
          cls = sf,
          apex = sf,
          trigger = sf,
          soql = { glyph = "󰆼", hl = "MiniIconsBlue" },
          sosl = { glyph = "󰆼", hl = "MiniIconsBlue" },
          page = markup,
          component = markup,
          cmp = markup,
          auradoc = markup,
          design = markup,
          tmpl = gotmpl,
          gotmpl = gotmpl,
          gohtml = gotmpl,
          templ = gotmpl,
          j2 = jinja,
          jinja = jinja,
          jinja2 = jinja,
          tofu = { glyph = "\u{f1062}", hl = "MiniIconsYellow" },
        },
      })

      -- Better a/i textobjects (LazyVim): f function, c class, o block,
      -- u/U call, t tag, d digits, e word segment, g buffer, a argument
      local ai = require("mini.ai")
      ai.setup({
        n_lines = 500,
        custom_textobjects = {
          o = ai.gen_spec.treesitter({
            a = { "@block.outer", "@conditional.outer", "@loop.outer" },
            i = { "@block.inner", "@conditional.inner", "@loop.inner" },
          }),
          f = ai.gen_spec.treesitter({ a = "@function.outer", i = "@function.inner" }),
          c = ai.gen_spec.treesitter({ a = "@class.outer", i = "@class.inner" }),
          t = { "<([%p%w]-)%f[^<%w][^<>]->.-</%1>", "^<.->().*()</[^/]->$" },
          d = { "%f[%d]%d+" },
          e = {
            { "%u[%l%d]+%f[^%l%d]", "%f[%S][%l%d]+%f[^%l%d]", "%f[%P][%l%d]+%f[^%l%d]", "^[%l%d]+%f[^%l%d]" },
            "^().*()$",
          },
          g = function()
            local from = { line = 1, col = 1 }
            local to = { line = vim.fn.line("$"), col = math.max(vim.fn.getline("$"):len(), 1) }
            return { from = from, to = to }
          end,
          u = ai.gen_spec.function_call(),
          U = ai.gen_spec.function_call({ name_pattern = "[%w_]" }),
        },
      })

      -- Surround on gs* (flash.nvim owns s): gsa add, gsd delete, gsr replace,
      -- gsf/gsF find, gsh highlight, gsn update n_lines
      require("mini.surround").setup({
        mappings = {
          add = "gsa",
          delete = "gsd",
          find = "gsf",
          find_left = "gsF",
          highlight = "gsh",
          replace = "gsr",
          update_n_lines = "gsn",
        },
      })

      -- gS split / gJ join arguments
      require("mini.splitjoin").setup({
        mappings = { toggle = "", split = "gS", join = "gJ" },
      })

      -- Move text: <M-h/j/k/l> (selection in Visual, line in Normal)
      require("mini.move").setup({})
    end,
  },
}
