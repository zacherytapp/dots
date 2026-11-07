-- Salesforce: Apex (apex_ls + PMD), LWC (lwc_ls + vtsls/eslint from
-- lang/typescript.lua), Visualforce (visualforce_ls), Aura (aura_ls),
-- SOQL/SOSL/debug-log parsers, sf.nvim for org/deploy/test workflows (<leader>m).
--
-- apex_ls / visualforce_ls / aura_ls: `:SalesforceLspInstall` (see
-- lua/util/salesforce_lsp.lua). lwc_ls: `npm i -g @salesforce/lwc-language-server`.
-- All four only attach inside an sfdx project (sfdx-project.json).
local call = require("util").call
local sflsp = require("util.salesforce_lsp")
local sfdx_root = { "sfdx-project.json" }

local function pmd_ruleset()
  local custom = vim.fn.stdpath("config") .. "/pmd/apex.xml"
  return vim.fn.filereadable(custom) == 1 and custom or "rulesets/apex/quickstart.xml"
end

--- prettier-plugin-apex installed in the project (otherwise prettier can't parse Apex)
local function has_prettier_apex(dirname)
  return vim.fs.find("node_modules/prettier-plugin-apex", { upward = true, path = dirname, type = "directory" })[1]
    ~= nil
end

--- conform formatter: the Visualforce server implements range formatting but
--- advertises no formatting capability, so request it for the whole buffer
local visualforce_format = {
  meta = { description = "Visualforce language server, whole-buffer range formatting" },
  condition = function(_, ctx)
    return #vim.lsp.get_clients({ bufnr = ctx.buf, name = "visualforce_ls" }) > 0
  end,
  format = function(_, ctx, lines, callback)
    local client = vim.lsp.get_clients({ bufnr = ctx.buf, name = "visualforce_ls" })[1]
    local params = {
      textDocument = { uri = vim.uri_from_bufnr(ctx.buf) },
      range = { start = { line = 0, character = 0 }, ["end"] = { line = #lines, character = 0 } },
      options = { tabSize = vim.bo[ctx.buf].shiftwidth, insertSpaces = vim.bo[ctx.buf].expandtab },
    }
    client:request("textDocument/rangeFormatting", params, function(err, edits)
      if err then
        return callback(err.message)
      end
      if not edits or #edits == 0 then
        return callback(nil, lines)
      end
      -- apply the edits to a scratch copy and hand the result back to conform
      local scratch = vim.api.nvim_create_buf(false, true)
      vim.api.nvim_buf_set_lines(scratch, 0, -1, false, lines)
      vim.lsp.util.apply_text_edits(edits, scratch, client.offset_encoding)
      local formatted = vim.api.nvim_buf_get_lines(scratch, 0, -1, false)
      vim.api.nvim_buf_delete(scratch, { force = true })
      callback(nil, formatted)
    end, ctx.buf)
  end,
}

local function sf(fn)
  return call("sf", fn)
end

return {
  {
    "nvim-treesitter/nvim-treesitter",
    opts = {
      ensure_installed = { "apex", "soql", "sosl", "sflog", "html", "javascript", "css", "xml" },
      register = { visualforce = "html", aura = "html" },
    },
  },
  {
    "mason-org/mason.nvim",
    opts = { ensure_installed = { "lemminx", "ctags-lsp" } },
  },
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        apex_ls = {
          -- lspconfig's default cmd is a function, which lsp.lua's available()
          -- treats as startable; a missing placeholder keeps apex_ls off until
          -- :SalesforceLspInstall makes salesforce_lsp.enable() set the real cmd.
          cmd = sflsp.cmd("apex") or { "apex-jorje-lsp-not-installed" },
          filetypes = { "apex" },
          root_markers = sfdx_root,
          workspace_required = true,
          init_options = { enableEmbeddedSoqlCompletion = true },
          settings = {
            apex = { enable_semantic_errors = true, enable_completion_statistics = false },
          },
        },
        lwc_ls = {
          cmd = { "lwc-language-server", "--stdio" },
          filetypes = { "javascript", "html" },
          root_markers = sfdx_root,
          workspace_required = true,
          init_options = { embeddedLanguages = { javascript = true } },
          settings = {
            lwc = { suggest = { enabled = true }, validate = { enabled = true } },
          },
        },
        visualforce_ls = {
          cmd = sflsp.cmd("visualforce"),
          filetypes = { "visualforce" },
          root_markers = sfdx_root,
          workspace_required = true,
          init_options = {
            embeddedLanguages = { css = true, javascript = true },
            provideFormatter = true,
          },
          settings = {
            html = {
              format = {
                enable = true,
                wrapLineLength = 120,
                wrapAttributes = "auto",
                indentInnerHtml = false,
                preserveNewLines = true,
                maxPreserveNewLines = 2,
                endWithNewline = true,
                templating = false,
              },
              suggest = { html5 = true },
              completion = { attributeDefaultValue = "doublequotes" },
              validate = { scripts = true, styles = true },
              autoClosingTags = true,
              autoCreateQuotes = true,
            },
            css = { validate = true },
            javascript = { suggest = { autoImports = true, enabled = true } },
          },
        },
        aura_ls = {
          cmd = sflsp.cmd("aura"),
          filetypes = { "aura" },
          root_markers = sfdx_root,
          workspace_required = true,
        },
        -- ctags-assisted goto definition for Apex (needs universal-ctags; see
        -- <leader>mng to generate tags)
        ctags_lsp = {
          cmd = { "ctags-lsp" },
          filetypes = { "apex" },
          root_markers = sfdx_root,
          workspace_required = true,
          enabled = vim.fn.executable("ctags") == 1,
        },
        -- XML: Salesforce metadata (*-meta.xml), package.xml, Aura .app/.evt/...
        lemminx = {},
      },
    },
  },
  {
    "stevearc/conform.nvim",
    opts = {
      formatters_by_ft = {
        apex = { "prettierd_apex" },
        visualforce = { "visualforce_ls" },
        -- Aura markup is not auto-formatted
        aura = {},
      },
      formatters = {
        visualforce_ls = visualforce_format,
        prettierd_apex = {
          inherit = "prettierd",
          condition = function(_, ctx)
            return has_prettier_apex(ctx.dirname)
          end,
        },
      },
    },
  },
  {
    "mfussenegger/nvim-lint",
    opts = {
      linters_by_ft = { apex = { "pmd" } },
      linters = {
        pmd = {
          args = { "check", "--format", "sarif", "--rulesets", pmd_ruleset, "--no-cache", "--no-progress", "--dir" },
          -- PMD fails with "Script too large" on huge files
          condition = function(ctx)
            return vim.api.nvim_buf_line_count(ctx.buf) <= 10000
          end,
        },
      },
    },
  },
  {
    "xixiaofinland/sf.nvim",
    name = "sf.nvim",
    branch = "main",
    event = "VeryLazy",
    dependencies = { "nvim-treesitter/nvim-treesitter", "ibhagwan/fzf-lua" },
    init = function()
      sflsp.setup()
    end,
    config = function()
      require("sf").setup({
        enable_hotkeys = false,
        types_to_retrieve = {
          "ApexClass",
          "ApexTrigger",
          "AuraDefinitionBundle",
          "ConnectedApp",
          "CustomApplication",
          "CustomField",
          "CustomMetadata",
          "CustomObject",
          "CustomPermission",
          "CustomTab",
          "EmailTemplate",
          "ExperienceBundle",
          "ExternalCredential",
          "FlexiPage",
          "FlowDefinition",
          "Flow",
          "Group",
          "Layout",
          "LightningComponentBundle",
          "LightningMessageChannel",
          "NamedCredential",
          "OmniDataTransform",
          "OmniIntegrationProcedure",
          "PermissionSetGroup",
          "PermissionSet",
          "Profile",
          "QuickAction",
          "RecordType",
          "Role",
          "Settings",
          "SharingCriteriaRule",
          "SharingOwnerRule",
          "StandardValueSet",
          "StaticResource",
          "ValidationRule",
        },
        term_config = {
          border = "rounded",
          dimensions = { height = 0.6, width = 0.9, y = 0.5 },
        },
      })
      -- sf.nvim's setup maps `.page` to html and every `.log` to sflog;
      -- restore this config's Visualforce / Apex-log detection
      require("config.filetypes").setup()
    end,
    keys = {
      { "<leader>mof", sf("fetch_org_list"), desc = "Salesforce: Fetch org list" },
      { "<leader>mog", sf("set_target_org"), desc = "Salesforce: Set target org" },
      { "<leader>moG", sf("set_global_target_org"), desc = "Salesforce: Set global target org" },
      { "<leader>moo", sf("org_open"), desc = "Salesforce: Open org in browser" },
      { "<leader>moF", sf("org_open_current_file"), desc = "Salesforce: Open current file in org" },
      { "<leader>mol", sf("pull_log"), desc = "Salesforce: Pull Apex log" },
      { "<leader>mT", sf("toggle_term"), desc = "Salesforce: Toggle terminal" },
      { "<leader>mC", sf("cancel"), desc = "Salesforce: Cancel running command" },
      { "<leader>mds", sf("save_and_push"), desc = "Salesforce: Save and push file" },
      { "<leader>mdd", sf("push_delta"), desc = "Salesforce: Deploy project (delta)" },
      { "<leader>mrf", sf("retrieve"), desc = "Salesforce: Retrieve file" },
      { "<leader>mrd", sf("retrieve_delta"), desc = "Salesforce: Retrieve project (delta)" },
      { "<leader>mra", sf("retrieve_apex_under_cursor"), desc = "Salesforce: Retrieve Apex under cursor" },
      { "<leader>mrp", sf("retrieve_package"), desc = "Salesforce: Retrieve package" },
      { "<leader>mct", sf("diff_in_target_org"), desc = "Salesforce: Diff file against target org" },
      { "<leader>mco", sf("diff_in_org"), desc = "Salesforce: Diff file against chosen org" },
      { "<leader>mqq", sf("run_query"), desc = "Salesforce: Run SOQL query in file" },
      { "<leader>mqq", sf("run_highlighted_soql"), mode = "x", desc = "Salesforce: Run highlighted SOQL" },
      { "<leader>mqt", sf("run_tooling_query"), desc = "Salesforce: Run tooling query in file" },
      { "<leader>mqa", sf("run_anonymous"), desc = "Salesforce: Run file as anonymous Apex" },
      { "<leader>mqb", sf("run_anonymous_stdin"), desc = "Salesforce: Run buffer as anonymous Apex (unsaved)" },
      { "<leader>mtm", sf("run_current_test_with_coverage"), desc = "Salesforce: Test method (coverage)" },
      { "<leader>mtf", sf("run_all_tests_in_this_file_with_coverage"), desc = "Salesforce: Test file (coverage)" },
      { "<leader>mtM", sf("run_current_test"), desc = "Salesforce: Test method (quick)" },
      { "<leader>mtF", sf("run_all_tests_in_this_file"), desc = "Salesforce: Test file (quick)" },
      { "<leader>mto", sf("open_test_select"), desc = "Salesforce: Select tests" },
      { "<leader>mtr", sf("repeat_last_tests"), desc = "Salesforce: Repeat last test run" },
      { "<leader>mtl", sf("run_local_tests"), desc = "Salesforce: Run all local tests" },
      { "<leader>mtj", sf("run_all_jests"), desc = "Salesforce: Run all Jest tests" },
      { "<leader>mtJ", sf("run_jest_file"), desc = "Salesforce: Run Jest tests in file" },
      { "<leader>mts", sf("toggle_sign"), desc = "Salesforce: Toggle coverage signs" },
      { "]v", sf("uncovered_jump_forward"), desc = "Salesforce: Next uncovered line" },
      { "[v", sf("uncovered_jump_backward"), desc = "Salesforce: Prev uncovered line" },
      { "<leader>mnc", sf("create_apex_class"), desc = "Salesforce: New Apex class" },
      { "<leader>mna", sf("create_aura_bundle"), desc = "Salesforce: New Aura bundle" },
      { "<leader>mnw", sf("create_lwc_bundle"), desc = "Salesforce: New LWC bundle" },
      { "<leader>mnt", sf("create_trigger"), desc = "Salesforce: New Apex trigger" },
      { "<leader>mng", sf("create_ctags"), desc = "Salesforce: Generate ctags" },
      { "<leader>mnG", sf("create_and_list_ctags"), desc = "Salesforce: Generate and list ctags" },
      { "<leader>mmr", sf("list_md_to_retrieve"), desc = "Salesforce: List metadata to retrieve" },
      { "<leader>mmp", sf("pull_md_json"), desc = "Salesforce: Pull metadata names" },
      { "<leader>mmt", sf("list_md_type_to_retrieve"), desc = "Salesforce: List metadata types to retrieve" },
      { "<leader>mmT", sf("pull_md_type_json"), desc = "Salesforce: Pull metadata type list" },
      { "<leader>mmP", sf("set_current_package"), desc = "Salesforce: Set current package" },
      {
        "<leader>mms",
        function()
          require("sf").refresh_sobjects({ category = "ALL" })
        end,
        desc = "Salesforce: Refresh sObject definitions (Apex completion)",
      },
      { "<leader>my", sf("copy_apex_name"), desc = "Salesforce: Copy Apex class name" },
      { "<leader>mxd", sf("delete_current_apex_remote_and_local"), desc = "Salesforce: Delete Apex (remote + local)" },
      {
        "<leader>mxr",
        sf("rename_apex_class_remote_and_local"),
        desc = "Salesforce: Rename Apex class (remote + local)",
      },
    },
    palette = {
      { desc = "Salesforce: cd terminal to project root", cmd = sf("go_to_sf_root") },
      {
        desc = "Salesforce: Refresh custom sObject definitions",
        cmd = function()
          require("sf").refresh_sobjects({ category = "CUSTOM" })
        end,
      },
      { desc = "Salesforce: Install/update Apex, Visualforce, Aura LSPs", cmd = "SalesforceLspInstall" },
      { desc = "Salesforce: Language server versions", cmd = "SalesforceLspStatus" },
    },
  },
}
