# Bash safety hook

Implemented locally in [`safety-hook.sh`](safety-hook.sh) under the
`PreToolUse` / `Bash` handler.

Checks run in priority order:

1. Hard blocks for destructive or secret-exposing commands.
2. Approval prompts for git staging/commit speed bumps.
3. Approval when no safety check objects.

The hook expands first-token shell aliases where possible before checking
subcommands.
