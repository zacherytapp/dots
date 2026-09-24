# Bash `.env` protection

Implemented locally in [`safety-hook.sh`](safety-hook.sh) under the
`PreToolUse` / `Bash` handler.

Blocks direct Bash access to `.env` and `.env.*` files through common readers,
editors, search tools, redirection, and mutation commands. Use `env-safe` for
safe inspection.
