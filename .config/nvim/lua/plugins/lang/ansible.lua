return {
  {
    "mason-org/mason.nvim",
    opts = { ensure_installed = { "ansible-language-server", "ansible-lint" } },
  },
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        ansiblels = {
          -- attach in any project with a playbook tree, not only with ansible.cfg
          root_markers = { "ansible.cfg", ".ansible-lint", "requirements.yml", ".git" },
          settings = {
            ansible = {
              validation = { enabled = true, lint = { enabled = true } },
            },
          },
        },
      },
    },
  },
  {
    "mfussenegger/nvim-ansible",
    ft = "yaml.ansible",
    keys = {
      {
        "<leader>ta",
        function()
          require("ansible").run()
        end,
        desc = "Ansible: Run playbook/role",
        ft = "yaml.ansible",
        silent = true,
      },
    },
  },
}
