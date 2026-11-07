-- Shared AI-completion helpers (copilot.lua + minuet-ai.nvim):
--   * allowed(buf): keep secrets and personal notes away from every AI backend
--   * backend health for minuet: completion is only attempted while the model
--     is known to be reachable and loaded, so a stopped server / missing model /
--     being off the tailnet costs one cheap check per backoff window instead of
--     a timed-out request on every keystroke.
local M = {}

-- Minuet backend. Override per machine with the env vars.
M.backend = {
  -- LM Studio on incubus (Tailscale). Any OpenAI-compatible server works with kind = "openai".
  url = vim.env.MINUET_BASE_URL or "http://100.89.33.66:1234",
  -- model id / LM Studio instance id; a FIM-capable coder model (Qwen2.5-Coder etc.)
  model = vim.env.MINUET_MODEL or "qwen2.5-coder-7b-instruct",
  -- "lmstudio": require the model to be *loaded* (/api/v1/models), so JIT loading
  -- doesn't make the first requests time out. "openai": the model is listed in /v1/models.
  kind = vim.env.MINUET_BACKEND_KIND or "lmstudio",
}

---------------------------------------------------------------------------
-- Buffer allow-list
---------------------------------------------------------------------------

local denied = {
  "/%.env[^/]*$",
  "%.tfvars$",
  "%.tfvars%.json$",
  "%.pem$",
  "%.key$",
  "%.p12$",
  "%.pfx$",
  "%.kdbx$",
  "/%.netrc$",
  "/%.npmrc$",
  "/%.pypirc$",
  "/%.pgpass$",
  "/%.ssh/",
  "/%.gnupg/",
  "/%.aws/",
  "/%.kube/",
  "/%.docker/config%.json$",
  "/%.password%-store/",
  "/gh/hosts%.yml$",
  "secret",
  "credential",
}
local vault = vim.fs.normalize("~/Documents/brain"):lower() .. "/"

--- May this buffer's contents be sent to an AI backend? Cached per buffer+name.
---@param buf? integer
---@return boolean
function M.allowed(buf)
  buf = (buf == nil or buf == 0) and vim.api.nvim_get_current_buf() or buf
  local name = vim.api.nvim_buf_get_name(buf)
  local cache = vim.b[buf].ai_allowed
  if cache and cache.name == name then
    return cache.ok
  end
  local ok = vim.bo[buf].buflisted and vim.bo[buf].buftype == "" and name ~= ""
  if ok then
    local path = vim.fs.normalize(name):lower()
    ok = not vim.startswith(path, vault)
    for _, pattern in ipairs(denied) do
      if ok and path:find(pattern) then
        ok = false
      end
    end
  end
  vim.b[buf].ai_allowed = { name = name, ok = ok }
  return ok
end

---------------------------------------------------------------------------
-- Backend health
---------------------------------------------------------------------------

---@alias AiState "unknown"|"probing"|"up"|"down"|"off"
---@type AiState
M.state = "unknown"
M.reason = ""
local retry_at, backoff, failures = 0, 30, 0
local MAX_BACKOFF, FAILURE_STRIKES = 600, 3

--- Cheap enough to call on every completion trigger.
function M.up()
  return M.state == "up"
end

local function set(state, reason)
  local changed = state ~= M.state
  M.state, M.reason = state, reason or ""
  if state == "up" then
    backoff, failures = 30, 0
  elseif state == "down" then
    retry_at = vim.uv.now() + backoff * 1000
    backoff = math.min(backoff * 2, MAX_BACKOFF)
  end
  if changed then
    vim.api.nvim_exec_autocmds("User", { pattern = "AiBackendChanged", modeline = false })
  end
end

---@param body table decoded JSON
---@return boolean found, string reason
local function find_model(body)
  local want = M.backend.model
  if M.backend.kind == "lmstudio" then
    for _, m in ipairs(body.models or {}) do
      for _, inst in ipairs(m.loaded_instances or {}) do
        if m.key == want or inst.id == want then
          return true, ""
        end
      end
      if m.key == want then
        return false, want .. " is not loaded in LM Studio"
      end
    end
  else
    for _, m in ipairs(body.data or {}) do
      if m.id == want then
        return true, ""
      end
    end
  end
  return false, want .. " not found on " .. M.backend.url
end

--- Check the backend asynchronously. Without `force` this is a no-op while the
--- backend is up, already being probed, disabled, or inside the backoff window.
---@param force? boolean also report the result
function M.probe(force)
  if M.state == "probing" or (M.state == "off" and not force) then
    return
  end
  if not force and (M.state == "up" or vim.uv.now() < retry_at) then
    return
  end
  local prev = M.state
  M.state = "probing"
  local path = M.backend.kind == "lmstudio" and "/api/v1/models" or "/v1/models"
  local ok = pcall(
    vim.system,
    { "curl", "-sf", "--connect-timeout", "3", "--max-time", "5", M.backend.url .. path },
    { text = true },
    vim.schedule_wrap(function(out)
      if M.state ~= "probing" then
        return -- turned off meanwhile
      end
      local decoded, body = pcall(vim.json.decode, out.stdout or "")
      if out.code ~= 0 or not decoded or type(body) ~= "table" then
        set("down", ("%s unreachable (curl exit %d)"):format(M.backend.url, out.code))
      else
        local found, reason = find_model(body)
        set(found and "up" or "down", reason)
      end
      if force then
        vim.notify(
          ("AI backend %s%s"):format(M.state, M.reason ~= "" and (": " .. M.reason) or ""),
          M.up() and vim.log.levels.INFO or vim.log.levels.WARN,
          { title = "minuet" }
        )
      end
    end)
  )
  if not ok then
    M.state = prev
    set("down", "curl not available")
  end
end

--- Turn minuet off/on for the session (`off` stops all probing)
---@param enabled boolean
function M.set_enabled(enabled)
  if enabled then
    retry_at = 0
    set("unknown")
    M.probe(true)
  else
    set("off", "disabled")
  end
end

--- Record the outcome of one completion request: FAILURE_STRIKES empty or failed
--- results in a row mark the backend down (server died, model unloaded, tailnet
--- dropped). Streamed requests that hit the timeout with partial text count as success.
---@param ok boolean
function M.report(ok)
  if M.state ~= "up" then
    return
  end
  failures = ok and 0 or failures + 1
  if failures >= FAILURE_STRIKES then
    set("down", ("%d requests in a row returned nothing"):format(failures))
  end
end

--- Hook minuet's backend so every request outcome reaches M.report, and re-check
--- a down backend lazily when entering insert mode (no background timers).
---@param provider string minuet provider name, e.g. "openai_fim_compatible"
function M.watch(provider)
  local backend = require("minuet.backends." .. provider)
  local complete = backend.complete
  backend.complete = function(context, callback)
    return complete(context, function(items)
      M.report(items ~= nil and #items > 0)
      return callback(items)
    end)
  end
  vim.api.nvim_create_autocmd("InsertEnter", {
    group = vim.api.nvim_create_augroup("user_ai_backend", { clear = true }),
    callback = function()
      M.probe()
    end,
  })
end

--- Statusline text: "" when up (nothing to report) or off.
function M.status()
  return (M.state == "down" or M.state == "probing") and ("󰚩 " .. M.state) or ""
end

return M
