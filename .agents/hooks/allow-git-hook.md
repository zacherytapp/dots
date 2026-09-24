# allow-git hook

Implemented locally in [`safety-hook.sh`](safety-hook.sh) under the
`UserPromptSubmit` handler.

Supported prompts:

- `>allow-git`
- `>allow-git staging`
- `>allow-git commit`
- `>allow-git status`
- `>allow-git off`

Session-scoped flags are stored in `/tmp/claude` by default, or in
`CLAUDE_HOOK_FLAG_DIR` when set.
