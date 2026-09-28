# Managing secrets and env vars for MCP servers and coding agents

Researched 2026-09-28. Context: CachyOS + Hyprland (uwsm), zsh, stow-managed
public dotfiles, `pass` initialized, 1Password available, harnesses are Claude
Code 2.1.283, OpenCode, and pi. The target box will be used **remotely /
headless**, so desktop-app unlock flows are out.

Labels: **[V]** verified in primary docs/source · **[L]** local verification on
this machine · **[C]** community/anecdotal · **[U]** unverified or conflicting.

## TL;DR

1. **Don't export secrets globally** (`.zshenv`, `.env` sourced with `set -a`,
   `environment.d`, uwsm `env`). Every harness here passes its full environment
   to the agent's shell tool, so one `env`/`printenv` puts every key in the
   transcript. This has happened repeatedly in public bug reports.
2. **Scope secrets per process with a wrapper**, which is what
   `~/.local/bin/forgejo-mcp-claude` already does. The MCP config's `command` points
   at the wrapper; the wrapper fetches the secret and `exec`s the server. This is
   the emerging practitioner consensus and what 1Password's own MCP guide does.
3. **For a headless box with 1Password**, use a **read-only service account**
   scoped to a dedicated vault, and put `op://` reference files in the dotfiles repo
   (they contain no secrets). The service-account token is the single bootstrap
   secret. Store it with `systemd-creds encrypt --user` or a `chmod 600` file.
4. **Global non-secret env** (URLs, flags, `EDITOR`) can stay in `.zshenv`. A
   sourced `.env`-style file is fine for that.
5. **Harden the harnesses** too. Claude Code has env-scrub switches, Codex has
   `shell_environment_policy`, and OpenCode/pi have no filtering.

## 1. How each harness passes env

| Harness | Config secret syntax | MCP stdio server env | Agent shell tool env |
|---|---|---|---|
| Claude Code | `${VAR}`, `${VAR:-default}` in `command`/`args`/`env`/`url`/`headers`; `headersHelper` command for HTTP headers [V][^cc-mcp] | Inherits full env by default; `CLAUDE_CODE_MCP_ALLOWLIST_ENV=1` → safe baseline + declared `env` [V][^cc-env] | Inherits full env; `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=1` strips recognized credentials from Bash/hooks/MCP [V][^cc-env]; sandbox `credentials.envVars` deny/mask [V][^cc-sb] |
| OpenCode | `{env:VAR}`, `{file:path}` anywhere in config [V][^oc-cfg] | `{...process.env, ...environment}` [V, source][^oc-src] | `process.env` unfiltered [V, source][^oc-src] |
| Codex CLI | `env`, `env_vars` allowlist, `bearer_token_env_var`, `http_headers_helper` [V][^cx-ref] | **Minimal baseline only** (HOME, PATH, USER, LANG…) + `env_vars` + `env` [V, source][^cx-src] | `shell_environment_policy`; see conflict note below |
| Gemini CLI | `$VAR`/`${VAR}` in MCP `env` [V][^gm-mcp] | Always redacted by name/value pattern (TOKEN, KEY, SECRET, `ghp_`…) except explicitly declared vars [V, source][^gm-san] | Redaction setting defaults off [V]; docs contradict themselves [U] |
| Cursor | `${env:NAME}`, `envFile` (stdio only) [V][^cursor] | Undocumented [U] | n/a |
| VS Code | `inputs` with `password: true`, stored "securely"; `envFile` [V][^vscode] | n/a | n/a |
| pi | No built-in MCP; `auth.json`, `"key": "!cmd"` runs a command [V][^pi] | n/a | `process.env` unfiltered [V, source][^pi] |

Notes:

- `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`, `CLAUDE_CODE_MCP_ALLOWLIST_ENV`, and
  `CLAUDE_ENV_FILE` are present in the installed 2.1.283 binary [L]. Their behavior
  was not tested here. One research pass found no such setting on the env-vars
  page and another did; the page is long and fetches truncate, so check the
  current docs before relying on them.
- **Codex conflict [U]:** the docs describe default exclusion of names
  containing KEY/SECRET/TOKEN. The current source sets
  `ignore_default_excludes` to `true` by default, meaning they are **not**
  excluded[^cx-src]. Set `ignore_default_excludes = false` explicitly if you use
  Codex.
- **GUI launch problem [C]:** harnesses started outside a shell never read
  `.zshenv`, so `${VAR}` stays unexpanded and auth fails with a 401[^gh-40372].
  This matters less on a headless SSH box.
- **argv leakage [C]:** MCP `env` values passed via `--mcp-config` argv are
  visible in `ps` and `/proc`[^gh-80045]. Wrappers that set env inside the child
  avoid this.
- **MCP spec:** stdio servers "SHOULD NOT follow [the OAuth spec], and instead
  retrieve credentials from the environment." Remote servers should use OAuth 2.1
  with short-lived, scoped tokens [V][^mcp-auth].

## 2. Tools for supplying the secret

"Scoped" means only the wrapped process tree sees the value.

| Tool | Mechanism | Scope | Headless / SSH fit |
|---|---|---|---|
| 1Password `op run` | `KEY="op://vault/item/field"` env file, `op run --env-file=f -- cmd`; masks output [V][^op-run] | Scoped | Desktop-app integration needs PolKit + GUI; not usable over SSH [U, inferred]. Manual `op signin` expires after 30 min idle [V][^op-signin]. **Service account** is the answer (below). |
| 1Password service account | `OP_SERVICE_ACCOUNT_TOKEN`; works with `op read`/`run`/`inject` [V][^op-sa] | Scoped | Designed for this. Read-only, vault-scoped, optional expiry; can't access Personal/Private vaults, and permissions are immutable [V][^op-sa-start] |
| Bitwarden `bws run` | `BWS_ACCESS_TOKEN` + `bws run -- cmd` [V][^bws] | Scoped | Same model as an `op` service account |
| `rbw` | Agent holds keys in memory, `lock_timeout` 3600s default; configurable pinentry [V][^rbw] | Scoped (via wrapper) | Works with `pinentry-curses`, but still needs an interactive unlock per timeout |
| `pass` / gopass | gpg-agent caches passphrase (600s default / 7200s max) [V][^gpg] | Scoped (via wrapper) | A harness-spawned server has no TTY for pinentry, so the agent must already be unlocked. `gpg-agent --extra-socket` forwarding keeps keys on the local machine [V] |
| sops + age | `sops exec-env file 'cmd'`; age key file on disk [V][^sops] | Scoped | Works headless. Encrypted files can be committed publicly, but **key names are visible** |
| systemd-creds | `systemd-creds encrypt --user` (v256+) binds to UID + machine-id; `LoadCredentialEncrypted=` for user units [V][^sd-exec] | File, not env | Good home for the one bootstrap token. systemd 262 is installed [L] |
| chezmoi | Templates call `onepasswordRead`, `pass`, `rbw`… at apply time [V][^chezmoi] | **Plaintext in target files** | Needs migrating off stow; renders secrets to disk |
| mise / direnv | `[env]` / `.envrc`, can call `op`/`pass` [V][^mise][^direnv] | Shell-global once activated | Per-directory; doesn't solve global MCP secrets |
| environment.d / uwsm `env` | Loaded into the systemd user manager env [V][^envd] | **Global to all user services** | `systemd.exec(5)`: env vars "are not suitable for passing secrets." SSH logins don't read it anyway |
| Docker MCP Toolkit | `docker mcp secret set`; gateway injects into containers [V][^docker] | Scoped, containerized | Rough edges on Linux [C][^docker-551] |

**1Password service account limits [V][^op-rl]:** Individual/Families plans get
1,000 reads/hour per token and **1,000 requests/day for the whole account**.
Every `op run` makes API calls, so resolving on each server start in each session
adds up. Don't call it from `.zshenv`. That the plan includes service accounts is
inferred from the rate-limit table, not from the pricing page [U].

## 3. What people are actually doing [C]

Most of this evidence is individual blogs and public dotfiles, so treat it as
anecdotal.

- **`op run` as the MCP `command`**: 1Password's official MCP guide[^op-mcp]
  and several blogs[^callahan].
- **Per-server wrapper reading a keychain/file, then `exec`**: macOS Keychain
  variant at about 30 ms per launch[^kahunam]; agenix variant because shell lookups
  didn't reach daemon-spawned sessions[^oscar].
- **Untracked `~/.config/zsh/.secret` sourced from `.zshrc`**: common, and
  exactly the global-export risk above[^frad].
- **Lazy `op read` via zsh `preexec`** to avoid an unlock prompt per shell[^kakkoyun].
- **chezmoi renders one MCP list for all harnesses**, with a launcher that
  fetches from Bitwarden only when unlocked[^iyadh].
- **Credential-injecting proxy** so the agent never holds the real token
  (Envoy/HAProxy header injection, short-lived macaroons)[^hn]. Claude Code's
  sandbox `mask` mode is the built-in version of this[^cc-sb].

## 4. Why global exports are the problem

- **Agents read secrets despite instructions.** Public issues show Claude Code
  grepping `.env`, running `printenv` via a hook, and echoing `$GH_TOKEN` while
  debugging[^gh-58173][^gh-11271][^eve]. `.claudeignore`/AGENTS.md rules are not
  a boundary; only `settings.json` deny rules and sandboxing enforce
  anything[^register][^cc-perm].
- **Supply chain.** s1ngularity (Nx, Aug 2025) prompted locally installed AI
  CLIs to hunt for secrets[^nx]; postmark-mcp was a malicious MCP
  package[^postmark]; CVE-2025-6514 was an RCE in `mcp-remote`[^jfrog]. Any
  `npx` server inherits whatever env you export.
- **Prompt-injection exfiltration.** The "lethal trifecta" (private data +
  untrusted content + an outbound channel)[^willison]; the GitHub MCP
  broad-PAT leak[^invariant].
- **Plaintext config files.** Trail of Bits found world-readable MCP configs and
  logs containing credentials[^tob].

Consensus across vendors, the spec, and researchers: no secrets in config files;
least-scope, short-lived tokens; OAuth for remote servers; pin and vet MCP
packages; enforce with deny rules or sandboxes, not prompts. Per-process
injection over global export is the practitioner consensus, not yet a vendor
mandate.

## 5. Recommendation for this setup

**Layer 1: `.zshenv` for non-secrets only.** Source a small
`~/.config/env/public` (or keep it inline) for URLs and flags. No tokens.

**Layer 2: one bootstrap secret on the box.** Create a 1Password vault
(e.g. `agents`) holding only MCP/agent tokens, and a **read-only service
account** scoped to it, with an expiry. Store its token as:

```sh
systemd-creds encrypt --user --name=op-sa - ~/.config/credstore.encrypted/op-sa
# read back:  systemd-creds decrypt --user ~/.config/credstore.encrypted/op-sa -
```

A `chmod 600` file is the simpler fallback, with the same trust model as the
current forgejo token file.

**Layer 3: a generic wrapper, one reference file per server.**

- `~/.local/bin/with-secrets <name> -- <cmd…>` loads the bootstrap token and
  runs `exec op run --env-file ~/.config/secrets/<name>.env -- "$@"`.
- `~/.config/secrets/<name>.env` contains only `op://agents/<item>/<field>`
  references, so it **can live in the public stow repo**.
- Each harness config's `command` points at `with-secrets`. The secret exists
  only in that server's process tree.
- If the 1,000/day account limit becomes a problem, fall back per server to a
  local `chmod 600` file or `sops exec-env` with no network call.

**Layer 4: harness hardening.**

- Claude Code: add deny rules for the credstore paths and for commands that
  decrypt secrets (`with-secrets`, `systemd-creds decrypt`, `op read/run/inject`).
  Leave `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` off. The 2.1.283 binary contains a
  "permission mode forced to default" path tied to it, which looks like CI
  hardening and may disable auto mode. Leave `CLAUDE_CODE_MCP_ALLOWLIST_ENV` off
  too: it cuts stdio MCP servers down to a baseline environment, which would
  likely break the browser devtools servers. Neither is needed once no secrets
  are exported globally.
- Codex (if used): `shell_environment_policy.ignore_default_excludes = false`.
- OpenCode/pi have no filtering, which is why Layer 3 matters.

**Avoid:** secrets in uwsm `env` / `environment.d` (global and exposed on
D-Bus), chezmoi migration just for this (renders plaintext), and `op` calls in
`.zshenv` (latency plus rate limits).

## Open questions

- Confirm Claude Code scrub/allowlist env behavior on 2.1.283 with a test server
  that prints its env.
- Confirm your 1Password plan includes service accounts.
- Check whether `systemd-creds --user` decrypt works from a non-systemd
  process on this box (expected yes on v256+, untested).

[^cc-mcp]: https://code.claude.com/docs/en/mcp
[^cc-env]: https://code.claude.com/docs/en/env-vars
[^cc-sb]: https://code.claude.com/docs/en/sandboxing
[^cc-perm]: https://code.claude.com/docs/en/permissions
[^oc-cfg]: https://opencode.ai/docs/config/ ; https://opencode.ai/docs/mcp-servers/
[^oc-src]: opencode source `packages/opencode/src/mcp/index.ts`, `src/tool/shell.ts`
[^cx-ref]: https://learn.chatgpt.com/docs/config-file/config-reference
[^cx-src]: codex source `codex-rs/rmcp-client/src/utils.rs` (`DEFAULT_ENV_VARS`), `codex-rs/config/src/shell_environment_policy.rs`; docs https://learn.chatgpt.com/docs/config-file/config-advanced
[^gm-mcp]: https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md
[^gm-san]: gemini-cli source `packages/core/src/services/environmentSanitization.ts`
[^cursor]: https://cursor.com/docs/context/mcp
[^vscode]: https://code.visualstudio.com/docs/copilot/reference/mcp-configuration
[^pi]: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/providers.md ; source `src/utils/shell.ts`
[^mcp-auth]: https://modelcontextprotocol.io/specification/latest/basic/authorization ; https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices
[^op-run]: https://www.1password.dev/cli/secrets-environment-variables/
[^op-signin]: https://www.1password.dev/cli/sign-in-manually
[^op-sa]: https://www.1password.dev/service-accounts/use-with-1password-cli
[^op-sa-start]: https://www.1password.dev/service-accounts/get-started/
[^op-rl]: https://www.1password.dev/service-accounts/rate-limits/
[^op-mcp]: https://www.1password.dev/get-started/secure-ai-access ; https://1password.com/blog/securing-mcp-servers-with-1password-stop-credential-exposure-in-your-agent
[^bws]: https://bitwarden.com/help/secrets-manager-cli/
[^rbw]: https://github.com/doy/rbw
[^gpg]: https://www.gnupg.org/documentation/manuals/gnupg/Agent-Options.html
[^sops]: https://github.com/getsops/docs (usage, age identities)
[^sd-exec]: `man systemd.exec`, `man systemd-creds` (systemd 262)
[^chezmoi]: https://www.chezmoi.io/user-guide/password-managers/
[^mise]: https://mise.jdx.dev/environments/ ; https://mise.jdx.dev/environments/secrets/sops.html
[^direnv]: https://direnv.net/man/direnv-stdlib.1.html
[^envd]: `man environment.d`, `man uwsm`
[^docker]: https://docs.docker.com/reference/cli/docker/mcp/secret/
[^docker-551]: https://github.com/docker/mcp-gateway/issues/551
[^gh-40372]: https://github.com/anthropics/claude-code/issues/40372
[^gh-80045]: https://github.com/anthropics/claude-code/issues/80045
[^gh-58173]: https://github.com/anthropics/claude-code/issues/58173
[^gh-11271]: https://github.com/anthropics/claude-code/issues/11271
[^eve]: https://eve.gd/2026/04/19/claude-code-can-consume-transmit-and-compromise-your-env-files-even-if-you-tell-it-not-to/
[^register]: https://www.theregister.com/2026/01/28/claude_code_ai_secrets_files/
[^callahan]: https://williamcallahan.com/blog/secure-environment-variables-1password-doppler-llms-mcps-ai-tools
[^kahunam]: https://kahunam.com/articles/automations-ai/securing-mcp-server-secrets-with-macos-keychain/
[^oscar]: https://github.com/OscarMarshall/dotfiles/pull/910
[^frad]: https://github.com/FradSer/dotfiles/blob/main/CLAUDE.md
[^kakkoyun]: https://kakkoyun.me/posts/stop-putting-api-keys-in-shell-config/
[^iyadh]: https://github.com/iyadh/dotfiles/issues/17
[^hn]: https://news.ycombinator.com/item?id=46605155
[^nx]: https://nx.dev/blog/s1ngularity-postmortem
[^postmark]: https://postmarkapp.com/blog/information-regarding-malicious-postmark-mcp-package
[^jfrog]: https://jfrog.com/blog/2025-6514-critical-mcp-remote-rce-vulnerability/
[^willison]: https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/
[^invariant]: https://invariantlabs.ai/blog/mcp-github-vulnerability
[^tob]: https://blog.trailofbits.com/2025/04/30/insecure-credential-storage-plagues-mcp/
