local util = require("util")

local function fmt(primary, secondary)
  return function()
    if util.has(primary == "tofu_fmt" and "tofu" or "terraform") then
      return { primary }
    end
    return { secondary }
  end
end

return {
  {
    "nvim-treesitter/nvim-treesitter",
    opts = {
      ensure_installed = { "terraform", "hcl" },
      register = {
        opentofu = "terraform",
        ["opentofu-vars"] = "hcl",
        ["terraform-vars"] = "hcl",
        ["hcl.docker-bake"] = "hcl",
      },
    },
  },
  {
    "mason-org/mason.nvim",
    opts = { ensure_installed = { "terraform-ls", "tofu-ls", "tflint" } },
  },
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        terraformls = {},
        -- nvim-lspconfig also attaches tofu-ls to terraform files; keep one server per filetype
        tofu_ls = { filetypes = { "opentofu", "opentofu-vars" } },
      },
    },
  },
  {
    "stevearc/conform.nvim",
    opts = {
      formatters_by_ft = {
        terraform = fmt("terraform_fmt", "tofu_fmt"),
        ["terraform-vars"] = fmt("terraform_fmt", "tofu_fmt"),
        opentofu = fmt("tofu_fmt", "terraform_fmt"),
        ["opentofu-vars"] = fmt("tofu_fmt", "terraform_fmt"),
      },
    },
  },
  {
    "mfussenegger/nvim-lint",
    opts = {
      linters_by_ft = {
        terraform = { "tflint" },
        opentofu = { "tflint" },
      },
    },
  },
}
