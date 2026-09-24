-- Salesforce: Apex (apex_ls + PMD), LWC (lwc_ls + vtsls/eslint from
-- lang/typescript.lua), Visualforce (visualforce_ls), Aura (aura_ls),
-- SOQL/SOSL/debug-log parsers, sf.nvim for org/deploy/test workflows (<leader>m).
--
-- apex_ls / visualforce_ls / aura_ls: `:SalesforceLspInstall` (see
-- lua/util/salesforce_lsp.lua). lwc_ls: `npm i -g @salesforce/lwc-language-server`.
-- All four only attach inside an sfdx project (sfdx-project.json).
local sflsp = require("util.salesforce_lsp")
local sfdx_root = { "sfdx-project.json" }

local function pmd_ruleset()
  local custom = vim.fn.expand("~/.config/apex/apex_ruleset.xml")
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
  return ("<cmd>lua require('sf').%s()<cr>"):format(fn)
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
          cmd = sflsp.cmd("apex"),
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
    commander = {
      -- Org (<leader>mo)
      { keys = { "n", "<leader>mof" }, cmd = sf("fetch_org_list"), desc = "Salesforce: Fetch org list" },
      { keys = { "n", "<leader>mog" }, cmd = sf("set_target_org"), desc = "Salesforce: Set target org" },
      { keys = { "n", "<leader>moG" }, cmd = sf("set_global_target_org"), desc = "Salesforce: Set global target org" },
      { keys = { "n", "<leader>moo" }, cmd = sf("org_open"), desc = "Salesforce: Open org in browser" },
      {
        keys = { "n", "<leader>moF" },
        cmd = sf("org_open_current_file"),
        desc = "Salesforce: Open current file in org",
      },
      { keys = { "n", "<leader>mol" }, cmd = sf("pull_log"), desc = "Salesforce: Pull Apex log" },
      -- Terminal
      { keys = { "n", "<leader>mT" }, cmd = sf("toggle_term"), desc = "Salesforce: Toggle terminal" },
      { keys = { "n", "<leader>mC" }, cmd = sf("cancel"), desc = "Salesforce: Cancel running command" },
      { cmd = sf("go_to_sf_root"), desc = "Salesforce: cd terminal to project root" },
      -- Deploy (<leader>md)
      { keys = { "n", "<leader>mds" }, cmd = sf("save_and_push"), desc = "Salesforce: Save and push file" },
      { keys = { "n", "<leader>mdd" }, cmd = sf("push_delta"), desc = "Salesforce: Deploy project (delta)" },
      -- Retrieve (<leader>mr)
      { keys = { "n", "<leader>mrf" }, cmd = sf("retrieve"), desc = "Salesforce: Retrieve file" },
      { keys = { "n", "<leader>mrd" }, cmd = sf("retrieve_delta"), desc = "Salesforce: Retrieve project (delta)" },
      {
        keys = { "n", "<leader>mra" },
        cmd = sf("retrieve_apex_under_cursor"),
        desc = "Salesforce: Retrieve Apex under cursor",
      },
      { keys = { "n", "<leader>mrp" }, cmd = sf("retrieve_package"), desc = "Salesforce: Retrieve package" },
      -- Compare (<leader>mc)
      {
        keys = { "n", "<leader>mct" },
        cmd = sf("diff_in_target_org"),
        desc = "Salesforce: Diff file against target org",
      },
      { keys = { "n", "<leader>mco" }, cmd = sf("diff_in_org"), desc = "Salesforce: Diff file against chosen org" },
      -- Query / execute (<leader>mq)
      { keys = { "n", "<leader>mqq" }, cmd = sf("run_query"), desc = "Salesforce: Run SOQL query in file" },
      { keys = { "x", "<leader>mqq" }, cmd = sf("run_highlighted_soql"), desc = "Salesforce: Run highlighted SOQL" },
      { keys = { "n", "<leader>mqt" }, cmd = sf("run_tooling_query"), desc = "Salesforce: Run tooling query in file" },
      { keys = { "n", "<leader>mqa" }, cmd = sf("run_anonymous"), desc = "Salesforce: Run file as anonymous Apex" },
      {
        keys = { "n", "<leader>mqb" },
        cmd = sf("run_anonymous_stdin"),
        desc = "Salesforce: Run buffer as anonymous Apex (unsaved)",
      },
      -- Tests (<leader>mt); lowercase = with coverage, uppercase = quick
      {
        keys = { "n", "<leader>mtm" },
        cmd = sf("run_current_test_with_coverage"),
        desc = "Salesforce: Test method (coverage)",
      },
      {
        keys = { "n", "<leader>mtf" },
        cmd = sf("run_all_tests_in_this_file_with_coverage"),
        desc = "Salesforce: Test file (coverage)",
      },
      { keys = { "n", "<leader>mtM" }, cmd = sf("run_current_test"), desc = "Salesforce: Test method (quick)" },
      { keys = { "n", "<leader>mtF" }, cmd = sf("run_all_tests_in_this_file"), desc = "Salesforce: Test file (quick)" },
      { keys = { "n", "<leader>mto" }, cmd = sf("open_test_select"), desc = "Salesforce: Select tests" },
      { keys = { "n", "<leader>mtr" }, cmd = sf("repeat_last_tests"), desc = "Salesforce: Repeat last test run" },
      { keys = { "n", "<leader>mtl" }, cmd = sf("run_local_tests"), desc = "Salesforce: Run all local tests" },
      { keys = { "n", "<leader>mtj" }, cmd = sf("run_all_jests"), desc = "Salesforce: Run all Jest tests" },
      { keys = { "n", "<leader>mtJ" }, cmd = sf("run_jest_file"), desc = "Salesforce: Run Jest tests in file" },
      { keys = { "n", "<leader>mts" }, cmd = sf("toggle_sign"), desc = "Salesforce: Toggle coverage signs" },
      { keys = { "n", "]v" }, cmd = sf("uncovered_jump_forward"), desc = "Salesforce: Next uncovered line" },
      { keys = { "n", "[v" }, cmd = sf("uncovered_jump_backward"), desc = "Salesforce: Prev uncovered line" },
      -- Create (<leader>mn)
      { keys = { "n", "<leader>mnc" }, cmd = sf("create_apex_class"), desc = "Salesforce: New Apex class" },
      { keys = { "n", "<leader>mna" }, cmd = sf("create_aura_bundle"), desc = "Salesforce: New Aura bundle" },
      { keys = { "n", "<leader>mnw" }, cmd = sf("create_lwc_bundle"), desc = "Salesforce: New LWC bundle" },
      { keys = { "n", "<leader>mnt" }, cmd = sf("create_trigger"), desc = "Salesforce: New Apex trigger" },
      { keys = { "n", "<leader>mng" }, cmd = sf("create_ctags"), desc = "Salesforce: Generate ctags" },
      {
        keys = { "n", "<leader>mnG" },
        cmd = sf("create_and_list_ctags"),
        desc = "Salesforce: Generate and list ctags",
      },
      -- Metadata (<leader>mm)
      {
        keys = { "n", "<leader>mmr" },
        cmd = sf("list_md_to_retrieve"),
        desc = "Salesforce: List metadata to retrieve",
      },
      { keys = { "n", "<leader>mmp" }, cmd = sf("pull_md_json"), desc = "Salesforce: Pull metadata names" },
      {
        keys = { "n", "<leader>mmt" },
        cmd = sf("list_md_type_to_retrieve"),
        desc = "Salesforce: List metadata types to retrieve",
      },
      { keys = { "n", "<leader>mmT" }, cmd = sf("pull_md_type_json"), desc = "Salesforce: Pull metadata type list" },
      { keys = { "n", "<leader>mmP" }, cmd = sf("set_current_package"), desc = "Salesforce: Set current package" },
      {
        keys = { "n", "<leader>mms" },
        cmd = function()
          require("sf").refresh_sobjects({ category = "ALL" })
        end,
        desc = "Salesforce: Refresh sObject definitions (Apex completion)",
      },
      {
        cmd = function()
          require("sf").refresh_sobjects({ category = "CUSTOM" })
        end,
        desc = "Salesforce: Refresh custom sObject definitions",
      },
      -- Misc
      { keys = { "n", "<leader>my" }, cmd = sf("copy_apex_name"), desc = "Salesforce: Copy Apex class name" },
      { cmd = "<cmd>SalesforceLspInstall<cr>", desc = "Salesforce: Install/update Apex, Visualforce, Aura LSPs" },
      { cmd = "<cmd>SalesforceLspStatus<cr>", desc = "Salesforce: Language server versions" },
      -- Destructive: remote + local (<leader>mx)
      {
        keys = { "n", "<leader>mxd" },
        cmd = sf("delete_current_apex_remote_and_local"),
        desc = "Salesforce: Delete Apex (remote + local)",
      },
      {
        keys = { "n", "<leader>mxr" },
        cmd = sf("rename_apex_class_remote_and_local"),
        desc = "Salesforce: Rename Apex class (remote + local)",
      },
    },
  },
}
