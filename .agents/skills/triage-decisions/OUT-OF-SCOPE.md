# Out-of-Scope Knowledge Base

`.out-of-scope/` at the repo root records rejected feature requests: the reasoning survives the closed issue, and new requests that match a prior rejection surface it instead of reopening the debate.

## Files

One file per **concept**, not per issue, with a short kebab-case name a reader recognizes without opening it: `dark-mode.md`, `plugin-system.md`. Write it like a short design note:

```markdown
# Dark Mode

This project does not support dark mode or user-facing theming.

## Why this is out of scope

The renderer resolves a single `ThemeConfig` palette at build time. Runtime
themes would need a theme provider, theme-aware styles, and persisted
preferences, which doesn't fit the project's focus on content authoring.

## Prior requests

- #42: "Add dark mode support"
- #87: "Night theme for accessibility"
```

The reason must be substantive and durable: project scope, a technical constraint, or a strategic choice. "Too busy right now" is a deferral, not a rejection; leave that issue open.

## Checking

During context gathering, read every `.out-of-scope/*.md` file. Match by concept, not keyword: "night theme" matches `dark-mode.md`. On a match, ask: "This resembles `.out-of-scope/dark-mode.md`, rejected because [reason]. Still the case?"

- **Confirm:** add the issue to "Prior requests", comment with the link, and close it as `wontfix`.
- **Reconsider:** delete or update the file; the issue continues through triage. Don't reopen old issues.
- **Disagree:** related but distinct; triage normally.

## Writing

Write only when an **enhancement** (issue or PR) is rejected as `wontfix`. Never for an already-implemented request: recording a built feature as rejected poisons later matching.

1. Append to the matching file's "Prior requests", or create a new file with the concept, reason, and first request.
2. Comment on the issue explaining the decision and linking the file.
3. Close it with the `wontfix` label.

Commit `.out-of-scope/` changes with the triage session's other repo edits, or tell the user they're uncommitted.
