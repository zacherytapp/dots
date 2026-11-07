# Git add safety hook

Implemented locally in [`safety-hook.ts`](safety-hook.ts) under the
`PreToolUse` / `Bash` handler.

Hard-blocked patterns include broad staging (`git add .`, `git add -A`,
`git add --all`), parent-directory adds, and wildcard adds. Staging modified
tracked files asks for approval unless enabled for the session with
`>allow-git staging` or `>allow-git`.

`git commit -a`/`--all` is denied unless a message source is given (`-m`, `-F`,
`-C`, `-c`, `--message`, `--file`, `--reuse-message`, `--reedit-message` or
`--no-edit`, including clustered short flags such as `-am`), so git never opens
an editor. Only `--dry-run` skips the check; `-n` is a dry run for `git add`
but means `--no-verify` for `git commit`.
