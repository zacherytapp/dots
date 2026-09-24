# Local Safety Hooks

These hooks are **accidental-use guardrails**, not a security boundary or complete shell policy. They recognize common direct command forms and can be bypassed by wrappers, nested shells, scripts, aliases outside the first token, or equivalent commands. They may also conservatively misclassify unusual shell syntax.

Runtime configuration in [`hooks.json`](hooks.json) executes [`safety-hook.sh`](safety-hook.sh) from this repository/plugin. It does not require upstream or Python hook scripts.

## Supported command forms

The Bash recognizer handles:

- Direct first-token `rm` commands, including top-level chains, multiline input, aliases, and command substitutions.
- Direct `git add`, `git checkout`, `git restore`, and `git commit`, including common Git global options such as `-C` and `--no-pager`.
- Common direct commands and redirections that access `.env` files.

It deliberately does not claim coverage for wrappers such as `command`, `env`, `sudo`, `xargs`, or `bash -c`. It does not recognize `source .env`. Separators inside single/double quotes and escaped separators are treated as arguments, not command boundaries. Prefer a real shell parser or host sandbox if comprehensive enforcement is required.

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
- [`safety-hook.sh`](safety-hook.sh) — hook entrypoint.
- [`test-safety-hook.sh`](test-safety-hook.sh) — behavioral and host-wiring regression tests.

## Validation

From the repository root:

```bash
npm run check:hooks
```

This runs Bash syntax checks, ShellCheck, entrypoint tests, no-subprocess-side-effect regressions, and host-wiring checks.

## Runtime state

Session flags live in `/tmp/claude` by default. Override `CLAUDE_HOOK_FLAG_DIR` for tests or custom environments.
