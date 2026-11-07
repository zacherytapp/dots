# Local Safety Hooks

These hooks are **accidental-use guardrails**, not a security boundary or complete shell policy. They recognize common direct command forms and can be bypassed by wrappers, nested shells, scripts, aliases outside the first token, or equivalent commands. They may also conservatively misclassify unusual shell syntax.

Runtime configuration in [`hooks.json`](hooks.json) executes [`safety-hook.ts`](safety-hook.ts) from `${CLAUDE_PLUGIN_ROOT}` when a plugin host sets it, otherwise from `~/.agents`, with the `node` on `PATH` (Node 24+ for built-in TypeScript support; `.profile` puts nvm's default there for login shells and the uwsm session). VS Code agent hooks load it through `chat.hookFilesLocations` (`~/.agents/hooks`). Claude Code does not use it; its guards are the TypeScript hooks in `~/.claude/hooks`. It is self-contained: no imports outside this directory, no upstream or Python hook scripts, and no `jq`.

## Supported command forms

The Bash recognizer handles:

- Direct first-token `rm` commands, including top-level chains, multiline input, aliases, command substitutions, `if`/`while`/`for` bodies, and `( … )` / `{ … }` groups.
- Direct `git add`, `git checkout`, `git restore`, and `git commit`, including common Git global options such as `-C` and `--no-pager`.
- Common direct commands and redirections that access `.env` files.

It deliberately does not claim coverage for wrappers such as `command`, `env`, `sudo`, `xargs`, or `bash -c`. It does not recognize `source .env`. Separators inside single/double quotes and escaped separators are treated as arguments, not command boundaries, except newlines: each line of a quoted multi-line string (a heredoc commit message, say) is also checked as a command, and `$(…)` is extracted even inside single quotes. Both err toward blocking. Prefer a real shell parser or host sandbox if comprehensive enforcement is required.

## Runtime hooks

- `PreToolUse` / `Bash`
  - Blocks recognized `rm` usage.
  - Blocks broad `git add` patterns and asks before staging modified tracked files.
  - Blocks force/path checkout and working-tree restore. Ordinary branch switching is left to Git's overwrite checks.
  - Asks before `git commit`.
  - Blocks recognized `.env` reads and writes.
- `PreToolUse` / `Read` blocks direct reads of `.env` and `.env.*`.
- `PreToolUse` / `Edit|Write` adds a speed bump when source output exceeds `MAX_FILE_LINES` (default `10000`).
- `UserPromptSubmit` supports `>allow-git`, `staging`, `commit`, `status`, and `off` session toggles.

## Files

- [`hooks.json`](hooks.json) — host runtime configuration.
- [`safety-hook.ts`](safety-hook.ts) — hook entrypoint.
- [`safety-hook.test.ts`](safety-hook.test.ts) — behavioral and host-wiring regression tests (`node --test`).

## Validation

From the dots repository root:

```bash
pnpm test
```

This runs the recognizer and policy tests, entrypoint tests, no-subprocess-side-effect regressions, and host-wiring checks. `pnpm typecheck` covers the hook too.

## Runtime state

Session flags live in `/tmp/claude` by default. Override `CLAUDE_HOOK_FLAG_DIR` for tests or custom environments.
