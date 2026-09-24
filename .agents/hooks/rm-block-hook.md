# `rm` safety hook

Implemented locally in [`safety-hook.sh`](safety-hook.sh) under the
`PreToolUse` / `Bash` handler.

Blocks direct `rm`, path-qualified `rm`, chained `rm`, and `rm` hidden inside
command substitutions. The preferred workflow is moving files to `TRASH/` and
recording the move in `TRASH-FILES.md`.
