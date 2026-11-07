---
name: review-issue
description: Reviews specs, tickets, and issues for necessity, accuracy, sizing, blocking edges, and implementation readiness against the shared spec and ticket templates. Use when work items need an adversarial readiness review before implementation.
disable-model-invocation: true
---

# Review Issues and Specs

Workflow: `to-spec` / `to-tickets` → **`review-issue`** → `implement`.

## Goal

Decide whether each work item is needed, consistent with the current project, and implementable without guessing. This is requirements and design review, not code review: leave PR review and findings ledgers to `review-code`. Project goals and standards supersede this skill.

Apply [design-standards.md](design-standards.md) and project conventions. Recommend closing unnecessary work, but close issues or delete source files only with explicit approval.

## Workflow

1. **Locate the source material.** The spec and its tickets, from the tracker or `docs/specs/<feature-slug>/`, plus linked documents, durable decisions in comments, and referenced files.
2. **Resolve the comparison point.** Use the ticket's target, the configured default branch, a stacked base, or the merge base. Don't assume a branch name.
3. **Compare against the project.** Read the relevant architecture, ADRs, glossary, conventions, existing behavior, related issues, and in-flight work. Establish whether the request already exists or conflicts with another source of truth.
4. **Review readiness** using the checks below.
5. **Resolve ambiguity.** Research what code and docs can answer. If a product or domain decision remains, grill the user by following [grill-with-docs](../grill-with-docs/SKILL.md), and keep unsettled choices under the spec's Open questions rather than in ready tickets.
6. **Prepare source-of-truth changes.** By default, give exact replacement text or a structured patch. Edit an issue or file directly only when the user asked for updates or otherwise authorized them. Keep each work item self-contained; don't leave durable decisions only in review comments.

Use additional agents only when the harness supports them and the review areas are independent; otherwise review each area sequentially.

## Readiness checks

- **Spec** follows [SPEC_TEMPLATE.md](../to-spec/SPEC_TEMPLATE.md): every section present, user stories cover all actors and failure flows, decisions settled rather than assumed, glossary terms used, no volatile file paths, and testing limited to the minimum behaviors at one seam.
- **Tickets** follow [TICKET_TEMPLATE.md](../to-tickets/TICKET_TEMPLATE.md) and stand alone: exact paths, symbols, and verified commands; concrete acceptance criteria; and a **Tests** list no bigger than the criteria need.
- **Sizing:** tickets are as large as one agent session allows. Flag tickets to merge (too small, one layer only, or only tests, docs, or cleanup) and tickets to split (beyond one session).
- **Blocking:** every ticket states **Blocked by** and **Blocks**; each edge is a real dependency on merged output, with its reason; there are no cycles; and at least one ticket can start now.
- **Coverage:** together the tickets deliver every user story and acceptance criterion in the spec, and nothing outside it.

## Output

For each item report:

- **Verdict:** Ready / Ready after proposed edits / Blocked by decisions / Unnecessary
- **Evidence:** the code, docs, decisions, and related work checked; screenshots or videos where they help the user review
- **Proposed updates:** exact source changes, or the changes applied with authorization
- **Key fixes:** the most important scope, design, sizing, blocking, or acceptance corrections
- **Remaining questions:** only unresolved decisions that block implementation

Don't present repository labels as provider approval states. Before suggesting a readiness label, confirm the repository defines it or use its configured equivalent.
