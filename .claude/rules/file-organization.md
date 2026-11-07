# File organization in ~/Projects

When working in a project under `~/Projects` (or the legacy `~/projects`), except the `dots` dotfiles repo:

- Don't create loose files in the project root. Put new files in:
  - `docs/`: notes, plans, reports, write-ups
  - `scripts/`: reusable helper or maintenance scripts
  - `tmp/`: scratch work, debug or one-off test scripts, logs, command output (git-ignored)
- Keep temporary files inside the project's `tmp/` rather than `/tmp` or another system temp directory. This applies to shell redirects and heredocs too, not just the Write tool.
- Standard root files (README, LICENSE, CLAUDE.md, AGENTS.md, manifests, config files, entrypoints) are fine where they belong.

The `organize-guard.ts` PreToolUse hook enforces this for Write. If it blocks a file that really belongs at the root, ask the user to add a glob to `<project>/.claude/organize.allow`.
