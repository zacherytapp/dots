# Git commit safety hook

Implemented locally in [`safety-hook.ts`](safety-hook.ts) under the
`PreToolUse` / `Bash` handler.

Commits ask for approval by default. Session-scoped approval can be enabled with
`>allow-git commit` or `>allow-git`. `git commit -a` without a message flag is
hard-blocked to avoid opening an editor unexpectedly.
