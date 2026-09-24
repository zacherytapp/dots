-- Linters per filetype are contributed by lua/plugins/lang/*.lua.
--   linters_by_ft = { ft = { "linter", ... } }
--   linters = { name = { ...overrides, condition = function(ctx) -> boolean } }
-- Linters whose command isn't installed are skipped silently; :LintInfo
-- shows what would run for the current buffer.
return {
  {
    "mfussenegger/nvim-lint",
    event = { "BufReadPost", "BufNewFile", "BufWritePost" },
    opts = {
      events = { "BufWritePost", "BufReadPost", "InsertLeave" },
      linters_by_ft = {},
      linters = {},
    },
    config = function(_, opts)
      local lint = require("lint")
      for name, linter in pairs(opts.linters) do
        if type(linter) == "table" and type(lint.linters[name]) == "table" then
          lint.linters[name] = vim.tbl_deep_extend("force", lint.linters[name], linter)
        else
          lint.linters[name] = linter
        end
      end
      lint.linters_by_ft = opts.linters_by_ft

      local function command_of(linter)
        local cmd = type(linter) == "table" and linter.cmd or nil
        if type(cmd) == "function" then
          local ok, resolved = pcall(cmd)
          cmd = ok and resolved or nil
        end
        return cmd
      end

      --- Linters for the buffer with their state: "run", "missing", "skipped"
      local function resolve(buf)
        local ctx = { buf = buf, filename = vim.api.nvim_buf_get_name(buf) }
        ctx.dirname = vim.fn.fnamemodify(ctx.filename, ":h")
        local names = vim.list_extend({}, lint._resolve_linter_by_ft(vim.bo[buf].filetype))
        local result = {}
        for _, name in ipairs(names) do
          local linter = lint.linters[name]
          local state = "run"
          if not linter then
            state = "unknown"
          elseif type(linter) == "table" and linter.condition and not linter.condition(ctx) then
            state = "skipped"
          else
            local cmd = command_of(linter)
            if type(cmd) == "string" and vim.fn.executable(cmd) == 0 then
              state = "missing"
            end
          end
          result[#result + 1] = { name = name, state = state }
        end
        return result
      end

      local function do_lint()
        local buf = vim.api.nvim_get_current_buf()
        if vim.bo[buf].buftype ~= "" then
          return
        end
        local names = {}
        for _, l in ipairs(resolve(buf)) do
          if l.state == "run" then
            names[#names + 1] = l.name
          end
        end
        if #names > 0 then
          lint.try_lint(names)
        end
      end

      local timer = assert(vim.uv.new_timer())
      vim.api.nvim_create_autocmd(opts.events, {
        group = vim.api.nvim_create_augroup("user_lint", { clear = true }),
        callback = function()
          timer:start(100, 0, vim.schedule_wrap(do_lint))
        end,
      })

      vim.api.nvim_create_user_command("LintInfo", function()
        local lines = {}
        for _, l in ipairs(resolve(0)) do
          lines[#lines + 1] = ("%s: %s"):format(l.name, l.state)
        end
        vim.notify(
          #lines > 0 and table.concat(lines, "\n") or "No linters for " .. vim.bo.filetype,
          vim.log.levels.INFO,
          {
            title = "nvim-lint",
          }
        )
      end, { desc = "Show linters for the current buffer" })
    end,
  },
}
