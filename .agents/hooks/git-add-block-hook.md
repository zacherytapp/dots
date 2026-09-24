# Git add safety hook

Implemented locally in [`safety-hook.sh`](safety-hook.sh) under the
`PreToolUse` / `Bash` handler.

Hard-blocked patterns include broad staging (`git add .`, `git add -A`,
`git add --all`), parent-directory adds, and wildcard adds. Staging modified
tracked files asks for approval unless enabled for the session with
`>allow-git staging` or `>allow-git`.
