# Git checkout safety hook

Implemented locally in [`safety-hook.ts`](safety-hook.ts) under the
`PreToolUse` / `Bash` handler.

Blocks checkout forms that can discard or overwrite local work: `--force`/`-f`,
`git checkout .`, and `git checkout <tree-ish> -- <paths>`. Ordinary branch
switching is left to Git's own overwrite checks, even in a dirty tree. The same
handler also blocks `git restore` unless it is staged-only (`--staged` without
`--worktree`).
