# Git checkout safety hook

Implemented locally in [`safety-hook.sh`](safety-hook.sh) under the
`PreToolUse` / `Bash` handler.

Blocks checkout forms that can discard or overwrite local work, and blocks
branch/file checkout when the repository has uncommitted changes that may be
lost.
