-- Salesforce language servers that ship only inside the Salesforce VS Code
-- extensions (not on Mason or npm): the Apex jorje jar, the Visualforce server
-- and the Aura server. `:SalesforceLspInstall [apex|visualforce|aura]`
-- downloads the latest extension from Open VSX and unpacks the server into
-- stdpath("data")/salesforce-lsp. The LWC server comes from npm
-- (`npm i -g @salesforce/lwc-language-server`).
local M = {}

M.root = vim.fn.stdpath("data") .. "/salesforce-lsp"

---@type table<string, {extension: string, unzip: string[], entry: string, lsp: string}>
M.servers = {
  apex = {
    extension = "salesforcedx-vscode-apex",
    unzip = { "extension/dist/apex-jorje-lsp.jar" },
    entry = "extension/dist/apex-jorje-lsp.jar",
    lsp = "apex_ls",
  },
  visualforce = {
    extension = "salesforcedx-vscode-visualforce",
    unzip = { "extension/dist/visualforceServer.js" },
    entry = "extension/dist/visualforceServer.js",
    lsp = "visualforce_ls",
  },
  aura = {
    -- the Aura server needs the extension's node_modules
    extension = "salesforcedx-vscode-lightning",
    unzip = { "extension/*" },
    entry = "extension/dist/auraServer.js",
    lsp = "aura_ls",
  },
}

---@param name string
---@return string|nil path to the installed server entry point
function M.entry(name)
  local path = ("%s/%s/%s"):format(M.root, name, M.servers[name].entry)
  return vim.uv.fs_stat(path) and path or nil
end

--- Apex jar: the installed one, else the jar bundled in this config
function M.apex_jar()
  local bundled = vim.fn.stdpath("config") .. "/lspserver/apex-jorje-lsp.jar"
  return M.entry("apex") or (vim.uv.fs_stat(bundled) and bundled or nil)
end

---@param name "apex"|"visualforce"|"aura"
---@return string[]|nil
function M.cmd(name)
  if name == "apex" then
    local jar = M.apex_jar()
    return jar
      and {
        "java",
        "-Xmx2048m",
        "-XX:+UseG1GC",
        "-XX:+UseStringDeduplication",
        "-Ddebug.internal.errors=true",
        "-Ddebug.semantic.errors=true",
        "-Ddebug.completion.statistics=false",
        "-Dlwc.typegeneration.disabled=true",
        "-cp",
        jar,
        "apex.jorje.lsp.ApexLanguageServerLauncher",
      }
  end
  local entry = M.entry(name)
  return entry and { "node", entry, "--stdio" } or nil
end

local function notify(msg, level)
  vim.schedule(function()
    vim.notify(msg, level or vim.log.levels.INFO, { title = "Salesforce LSP" })
  end)
end

--- Run a command asynchronously; `cb` runs on the main loop (vim.fn is not
--- allowed in vim.system's fast-event callback)
---@param cmd string[]
---@param cb fun(out: vim.SystemCompleted)
local function run(cmd, cb)
  vim.system(cmd, { text = true }, vim.schedule_wrap(cb))
end

---@param name string
---@param done fun(ok: boolean)
local function install_one(name, done)
  local server = M.servers[name]
  local api = ("https://open-vsx.org/api/salesforce/%s/latest"):format(server.extension)
  run({ "curl", "-sfL", "--max-time", "30", api }, function(meta)
    local ok, info = pcall(vim.json.decode, meta.stdout or "")
    if meta.code ~= 0 or not ok or not (info.files and info.files.download) then
      notify(("%s: could not query Open VSX (%s)"):format(name, vim.trim(meta.stderr or "")), vim.log.levels.ERROR)
      return done(false)
    end
    local dir = M.root .. "/" .. name
    local tmp = dir .. ".new"
    local vsix = M.root .. "/" .. name .. ".vsix"
    vim.fn.mkdir(M.root, "p")
    notify(("%s: downloading %s %s"):format(name, server.extension, info.version))
    run({ "curl", "-sfL", "--max-time", "600", "-o", vsix, info.files.download }, function(dl)
      if dl.code ~= 0 then
        notify(name .. ": download failed", vim.log.levels.ERROR)
        return done(false)
      end
      vim.fn.delete(tmp, "rf")
      run(
        vim.list_extend({ "unzip", "-q", "-o", vsix }, vim.list_extend(vim.deepcopy(server.unzip), { "-d", tmp })),
        function(uz)
          vim.fn.delete(vsix)
          if uz.code ~= 0 then
            notify(name .. ": unzip failed: " .. vim.trim(uz.stderr or ""), vim.log.levels.ERROR)
            return done(false)
          end
          vim.fn.delete(dir, "rf")
          vim.uv.fs_rename(tmp, dir)
          local f = io.open(dir .. "/VERSION", "w")
          if f then
            f:write(info.version)
            f:close()
          end
          notify(("%s: installed %s"):format(name, info.version))
          done(true)
        end
      )
    end)
  end)
end

--- Point the LSP config at the freshly installed server and start it
---@param name string
function M.enable(name)
  local cmd = M.cmd(name)
  if not cmd then
    return
  end
  local lsp = M.servers[name].lsp
  vim.lsp.config(lsp, { cmd = cmd })
  vim.lsp.enable(lsp)
end

---@param names? string[]
function M.install(names)
  for _, bin in ipairs({ "curl", "unzip" }) do
    if vim.fn.executable(bin) == 0 then
      return notify(bin .. " is required", vim.log.levels.ERROR)
    end
  end
  names = (names and #names > 0) and names or vim.tbl_keys(M.servers)
  for _, name in ipairs(names) do
    if not M.servers[name] then
      return notify("unknown server: " .. name, vim.log.levels.ERROR)
    end
  end
  for _, name in ipairs(names) do
    install_one(name, function(ok)
      if ok then
        M.enable(name)
      end
    end)
  end
end

--- Installed versions, for :SalesforceLspInstall with no servers missing
function M.status()
  local lines = {}
  for name in pairs(M.servers) do
    local f = io.open(("%s/%s/VERSION"):format(M.root, name))
    local version = f and f:read("*l") or nil
    if f then
      f:close()
    end
    lines[#lines + 1] = ("%-12s %s"):format(name, version or (M.cmd(name) and "bundled" or "not installed"))
  end
  table.sort(lines)
  return lines
end

function M.setup()
  vim.api.nvim_create_user_command("SalesforceLspInstall", function(args)
    M.install(args.fargs)
  end, {
    nargs = "*",
    complete = function()
      return vim.tbl_keys(M.servers)
    end,
    desc = "Install/update Salesforce language servers from Open VSX",
  })
  vim.api.nvim_create_user_command("SalesforceLspStatus", function()
    notify(table.concat(M.status(), "\n"))
  end, { desc = "Show installed Salesforce language servers" })

  -- One hint per session when a Salesforce file opens without its server
  local hinted = {}
  vim.api.nvim_create_autocmd("FileType", {
    group = vim.api.nvim_create_augroup("user_salesforce_lsp_hint", { clear = true }),
    pattern = { "apex", "visualforce", "aura" },
    callback = function(ev)
      local name = ({ apex = "apex", visualforce = "visualforce", aura = "aura" })[ev.match]
      if hinted[name] or M.cmd(name) or not vim.fs.root(ev.buf, "sfdx-project.json") then
        return
      end
      hinted[name] = true
      notify(("No %s language server installed. Run :SalesforceLspInstall %s"):format(name, name), vim.log.levels.WARN)
    end,
  })
end

return M
