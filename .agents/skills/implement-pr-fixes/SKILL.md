---
name: implement-pr-fixes
description: Implements PR review feedback and resubmits the change for review. Use when addressing review comments or requested changes, including Salesforce PRs.
disable-model-invocation: true
---

# implement-pr-fixes

## Clarify first

If the PR is missing or ambiguous, ask before writing a single line:

> "Which PR? Paste it here, point me to a file, or describe the tasks. I need scope and context before starting."

The PR can live in session context, a file, or a Gitea/Forgejo/GitHub issue. Use the CLI or MCP if available; do not guess.

Once the PR is clear, resolve its base/head repositories and branches, find the existing head worktree, and confirm it matches the pushed head. Create a worktree from the fetched PR head only when one does not exist. Preserve the provider's requested-changes review state until a reviewer changes it; it is not a label to clear.

## Select the implementation path

Use the platform-specific implementation workflow in the existing PR environment:

- **Salesforce:** Confirm and reuse the PR's existing scratch org or sandbox. Do not create or switch orgs or change the default target org. Use `sf-implement` for fixes, overriding its new-worktree and target-org setup with the confirmed PR context. If the environment cannot be identified or accessed, stop and ask.
- **Otherwise:** Use `implement` for fixes, overriding its new-worktree setup with the confirmed PR context.

Review ownership stays with `review-code` or `sf-review-code`, normally coordinated by `babysit-pr`; this skill does not re-review its own fixes.

## Plan the fixes

Work from the review's findings ledger in the PR comments. The `open` **blockers** are your mandatory worklist; every one must be resolved. Also fold in `open` **nits** where the fix is cheap and low-risk; a nit you skip stays in the ledger and never blocks. Turn the blockers, selected nits, and other PR feedback into an actionable plan. Resolve ambiguity before touching code with `grill-with-docs`; don't proceed until the plan is unambiguous.

## Implement the fixes

Use the selected implementation skill in the existing branch or worktree. Do not mark findings `fixed` yourself; describe the evidence for each attempted resolution so the independent reviewer can reconcile the canonical ledger. Leave skipped nits unchanged.

## Resubmit

After addressing every open blocker, run relevant local checks and push focused commits. For Salesforce, also run the non-production dry-run deployment in the same environment. Post an "issues addressed" comment following [issues-addressed-template.md](issues-addressed-template.md), mapping each finding to evidence and noting deferred nits, then request re-review through the provider. Add a `ready-for-review` label only if the repository defines and uses it. Ledger reconciliation, CI monitoring, and repeated review/check rounds belong to the reviewer and `babysit-pr`.
