# Read `.env` protection

Implemented locally in [`safety-hook.sh`](safety-hook.sh) under the
`PreToolUse` / `Read` handler.

Blocks direct reads of `.env` and `.env.*` files. Use `env-safe` for safe
inspection of environment keys and status.
