-- Filetype detection for every supported language.
--
-- sf.nvim calls vim.filetype.add() in its own setup (mapping `.page` to html
-- and every `.log` to sflog), so lua/plugins/lang/salesforce.lua calls
-- M.setup() again after sf.nvim loads to restore these rules.
local M = {}

---@param path string
---@param names string|string[]
local function has_upward(path, names)
  return #vim.fs.find(names, { upward = true, path = vim.fs.dirname(path), limit = 1 }) > 0
end

--- HTML under a `templates/` dir: pick the template language from the project.
local function html_template(path, bufnr)
  if has_upward(path, "go.mod") then
    return "gotmpl"
  elseif has_upward(path, "manage.py") then
    return "htmldjango"
  end
  local head = table.concat(vim.api.nvim_buf_get_lines(bufnr, 0, 100, false), "\n")
  if head:find("{%", 1, true) or head:find("{{", 1, true) then
    return "jinja"
  end
  return "html"
end

--- Helm chart templates live in <chart>/templates/ next to Chart.yaml
local function helm_template(path)
  local templates = path:match("^(.*/templates)/")
  if templates and vim.uv.fs_stat(vim.fs.dirname(templates) .. "/Chart.yaml") then
    return "helm"
  end
end

--- Helm values files sit next to Chart.yaml
local function helm_values(path)
  if vim.uv.fs_stat(vim.fs.dirname(path) .. "/Chart.yaml") then
    return "yaml.helm-values"
  end
end

--- Ansible: YAML inside a project that has ansible.cfg or a roles/ tree
local function ansible_yaml(path)
  if has_upward(path, { "ansible.cfg", ".ansible-lint" }) then
    return "yaml.ansible"
  end
end

local ansible = function(path)
  return ansible_yaml(path) or "yaml.ansible"
end

--- Apex debug logs only inside Salesforce projects (sf.nvim claims every *.log)
local function sflog(path)
  if path:match("apex%-[^/]*%.log$") or has_upward(path, { "sfdx-project.json", ".sfdx" }) then
    return "sflog"
  end
end

M.spec = {
  extension = {
    -- Salesforce
    cls = "apex",
    apex = "apex",
    trigger = "apex",
    apexcode = "apex",
    apxc = "apex",
    apxt = "apex",
    soql = "soql",
    sosl = "sosl",
    page = "visualforce",
    component = "visualforce",
    cmp = "aura",
    auradoc = "aura",
    app = "xml",
    evt = "xml",
    intf = "xml",
    design = "xml",
    tokens = "xml",
    log = sflog,
    -- Go templates
    gotmpl = "gotmpl",
    gohtml = "gotmpl",
    tmpl = "gotmpl",
    -- Python templates
    jinja = "jinja",
    jinja2 = "jinja",
    j2 = "jinja",
    -- Terraform / OpenTofu (plain Vim maps an empty .tf to TinyFugue)
    tf = "terraform",
    tfvars = "terraform-vars",
    tofu = "opentofu",
    tfstate = "json",
    -- Caddy
    caddyfile = "caddy",
    Caddyfile = "caddy",
    -- Web
    mdx = "markdown",
  },
  filename = {
    [".env"] = "dotenv",
    ["sfdx-project.json"] = "jsonc",
    [".forceignore"] = "gitignore",
    ["jsconfig.json"] = "jsonc",
    [".babelrc"] = "jsonc",
    [".eslintrc.json"] = "jsonc",
    ["devcontainer.json"] = "jsonc",
    ["Caddyfile"] = "caddy",
    [".terraformrc"] = "hcl",
    ["terraform.rc"] = "hcl",
    ["docker-bake.hcl"] = "hcl.docker-bake",
    ["docker-bake.override.hcl"] = "hcl.docker-bake",
    ["compose.yaml"] = "yaml.docker-compose",
    ["compose.yml"] = "yaml.docker-compose",
    ["docker-compose.yaml"] = "yaml.docker-compose",
    ["docker-compose.yml"] = "yaml.docker-compose",
    ["Containerfile"] = "dockerfile",
    ["ansible.cfg"] = "dosini",
  },
  pattern = {
    ["%.env%..+"] = "dotenv",
    ["tsconfig.*%.json"] = "jsonc",
    [".*/%.vscode/.*%.json"] = "jsonc",
    -- Docker
    ["compose%..+%.ya?ml"] = { "yaml.docker-compose", { priority = 5 } },
    ["docker%-compose%..+%.ya?ml"] = { "yaml.docker-compose", { priority = 5 } },
    ["Dockerfile%..+"] = "dockerfile",
    [".+%.[Dd]ockerfile"] = "dockerfile",
    -- Caddy
    ["Caddyfile%..+"] = "caddy",
    -- Go / Django / Jinja / Helm templates
    [".*/templates/.*%.html?"] = html_template,
    [".*/templates/.*%.ya?ml"] = { helm_template, { priority = 10 } },
    [".*/templates/.*%.tpl"] = helm_template,
    [".*/values[^/]*%.ya?ml"] = { helm_values, { priority = 10 } },
    [".*%.go%.tmpl"] = "gotmpl",
    [".*%.html%.j2"] = "jinja",
    [".*%.html%.jinja2?"] = "jinja",
    -- Ansible
    [".*/playbooks/.*%.ya?ml"] = { ansible, { priority = 1 } },
    [".*/roles/.*/tasks/.*%.ya?ml"] = { ansible, { priority = 1 } },
    [".*/roles/.*/handlers/.*%.ya?ml"] = { ansible, { priority = 1 } },
    [".*/roles/.*/defaults/.*%.ya?ml"] = { ansible, { priority = 1 } },
    [".*/roles/.*/vars/.*%.ya?ml"] = { ansible, { priority = 1 } },
    [".*/roles/.*/meta/.*%.ya?ml"] = { ansible, { priority = 1 } },
    [".*/group_vars/.*%.ya?ml"] = { ansible, { priority = 1 } },
    [".*/host_vars/.*%.ya?ml"] = { ansible, { priority = 1 } },
    -- Any other YAML inside an Ansible project (after the rules above;
    -- negative priorities would run after the `yaml` extension match)
    [".*%.ya?ml"] = { ansible_yaml, { priority = 0 } },
  },
}

function M.setup()
  vim.filetype.add(M.spec)
end

M.setup()

return M
