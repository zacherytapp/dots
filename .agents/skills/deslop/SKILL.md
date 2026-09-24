---
name: deslop
description: Remove AI-generated code slop and clean up code style. Use when a diff needs concise, idiomatic cleanup before review.
disable-model-invocation: true
---

# Remove AI code slop

Resolve the change's actual comparison point from PR metadata, the configured target branch, or the merge base. Check only that diff and remove AI-generated slop introduced by the change; never assume the default branch name.

## Focus Areas

- Extra comments that are unnecessary or inconsistent with local style
- Defensive checks or try/catch blocks that are abnormal for trusted code paths
- Casts to `any` used only to bypass type issues
- Deeply nested code that should be simplified with early returns
- Other patterns inconsistent with the file and surrounding codebase

## Guardrails

- Keep behavior unchanged unless fixing a clear bug.
- Prefer minimal, focused edits over broad rewrites.
- Keep the final summary concise (1-3 sentences).
