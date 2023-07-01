local lsp = require("lsp-zero")

lsp.preset("recommended")

lsp.ensure_installed({
	'apex_ls'
})

local cmp = require('cmp')
local cmp_select = {behavior = cmp.SelectBehavior.Select}

lsp.nvim_workspace()

require'lspconfig'.apex_ls.setup {
  apex_jar_path = '/home/zakk/.config/nvim/after/plugin/apex-jorje-lsp.jar',
  apex_enable_semantic_errors = false, -- Whether to allow Apex Language Server to surface semantic errors
  apex_enable_completion_statistics = false, -- Whether to allow Apex Language Server to collect telemetry on code completion usage
}

local cmp_mappings = lsp.defaults.cmp_mappings({
  ['<C-p>'] = cmp.mapping.select_prev_item(cmp_select),
  ['<C-n>'] = cmp.mapping.select_next_item(cmp_select),
  ['<Return>'] = cmp.mapping.confirm({ select = true }),
  ["<C-Space>"] = cmp.mapping.complete(),
})

lsp.set_preferences({
  sign_icons = { }
})

lsp.setup_nvim_cmp({
  mapping = cmp_mappings
})

lsp.on_attach(function(client, bufnr)
  local opts = {buffer = bufnr, remap = false}

  vim.keymap.set("n", "<leader>vg", function() vim.lsp.buf.definition() end, opts)
  vim.keymap.set("n", "<leader>vk", function() vim.lsp.buf.hover() end, opts)
  vim.keymap.set("n", "<leader>vs", function() vim.lsp.buf.workspace_symbol() end, opts)
  vim.keymap.set("n", "<leader>vd", function() vim.diagnostic.open_float() end, opts)
  vim.keymap.set("n", "<leader>vn", function() vim.diagnostic.goto_next() end, opts)
  vim.keymap.set("n", "<leader>vp", function() vim.diagnostic.goto_prev() end, opts)
  vim.keymap.set("n", "<leader>vc", function() vim.lsp.buf.code_action() end, opts)
  vim.keymap.set("n", "<leader>vr", function() vim.lsp.buf.references() end, opts)
  vim.keymap.set("n", "<leader>vb", function() vim.lsp.buf.rename() end, opts)
  vim.keymap.set("i", "<C-h>", function() vim.lsp.buf.signature_help() end, opts)
end)

lsp.setup()

