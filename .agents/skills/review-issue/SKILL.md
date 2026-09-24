---
name: review-issue
description: Reviews issues and specs for necessity, accuracy, design quality, and implementation readiness. Use when one or more work items need adversarial readiness review.
disable-model-invocation: true
---

# Review Issues and Specs

## Goal

Determine whether each work item is needed, consistent with the current project, and implementable without guessing. This is requirements and design review, not PR code review; do not invoke `review-code` or create a PR findings ledger. The goal is to review the issue along the definitions outlined in the project and the items outlined below. The project goals/standards should always supercede what is specified below.

Apply [design-standards.md](design-standards.md) and project conventions. Recommend closing unnecessary work, but close issues or delete source files only with explicit approval.

The issue should be clear (with examples) around types, boundaries, abstractions and the general call stack. These should all be defined explicitly in the issue. Anything that's created or modified related to this should be called out.

## Workflow

1. **Locate the source material.** Read the issue or spec, linked documents, durable decisions from comments, and referenced files.
2. **Resolve the comparison point.** Use the ticket's target, configured default branch, relevant stacked base, or merge base. Do not assume `main`.
3. **Compare against the project.** Read relevant architecture, ADRs, conventions, domain docs, existing behavior, related issues, and in-flight work. Establish whether the request already exists or conflicts with another source of truth.
4. **Review readiness.** Check scope and non-goals, architecture, terminology, data/UI/API/security impacts, acceptance criteria, edge and failure states, tests, rollout, dependencies, and vertical sequencing.
5. **Resolve ambiguity.** Research answers available from code and docs. If an important product or domain decision remains, use `grill-with-docs` and keep unsettled choices out of the ready specification.
6. **Prepare source-of-truth changes.** By default, provide exact replacement text or a structured patch. Edit an issue body or spec directly only when the user asked for updates or has otherwise explicitly authorized them. Keep the work item self-contained rather than leaving durable decisions only in review comments.

Use additional agents only when the harness supports them and review areas are independent. Otherwise evaluate each area sequentially in the current agent.

## Output

For each item report:

- **Verdict:** Ready / Ready after proposed edits / Blocked by decisions / Unnecessary
- **Evidence:** current code, docs, decisions, and related work checked
- **Proposed updates:** exact source changes, or changes applied with authorization
- **Key fixes:** the most important scope, design, acceptance, or sequencing corrections
- **Remaining questions:** only unresolved decisions that block implementation

Do not represent repository labels as provider approval states. If suggesting a readiness label, first verify that the repository defines it or use the configured equivalent.
