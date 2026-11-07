---
name: review-code
description: Audits a pull request strictly for maintainability, abstraction quality, and fidelity to its spec and tickets, keeping a findings ledger in the PR comments. Use when the user wants a deep code review of a PR rather than a quick scan.
disable-model-invocation: true
---

# review-code

An unusually strict review of maintainability, abstraction quality, and codebase health. Workflow: `implement` → `file-pr` → **`review-code`** (usually run by `babysit-pr`) → `implement-pr-fixes`.

Above all, be **ambitious** about structure. Don't stop at local cleanups: hunt for code-judo moves that make whole branches, helpers, modes, or layers disappear. Apply the reusable [requirements and design standards](../review-issue/design-standards.md) to the PR's design claims.

## Mechanics for Review

### Pin the review point

Before anything else, check the PR comments for a ledger left by a previous `review-code` run (the `<!-- review-code:ledger -->` marker). Its presence decides the fixed point:

- **No prior ledger — first review.** Resolve the PR's actual base repository, branch, and merge base from provider metadata or explicit user context. Diff `HEAD` against that fetched base. This is the full-branch pass.
- **Prior ledger exists — pick up from it.** It records the last reviewed SHA. Review only `git diff <last-reviewed-SHA>...HEAD` and apply its prior findings per [Findings ledger](#findings-ledger).

### Findings ledger

Memory across successive `review-code` runs, so no run re-litigates the whole diff or re-raises findings already `fixed` or `waived`. It is one canonical PR comment, updated in place each run, following [ledger-template.md](ledger-template.md).

Carry status forward: don't re-raise anything `fixed` or `waived`, add only genuinely new findings, and record `Reviewed up to <sha>`. Nits stay in the ledger (or become filed issues) but aren't blockers.

**Reconcile before posting.** Walk every carried-over `open` finding and check whether the current code resolves it. Flip resolved ones to `fixed` and drop their call-outs from the review comment, then recompute **Open blockers**. Never leave a resolved finding `open`. Fixed and waived rows stay as history.

### Two axes

Review the [pinned diff](#pin-the-review-point) along two independent axes. With parallel agents, give each exactly the pinned diff; neither may widen to the full branch. Otherwise review them sequentially with the same fixed point and evidence bar. Then aggregate.

- **Standards axis** — does the code meet the [Standards](#standards)?
- **Spec axis** — does the diff faithfully implement its spec and tickets (tracker issues or `docs/specs/<feature-slug>/`)? Flag acceptance criteria missing or partial, behavior not asked for (scope creep), and requirements implemented wrongly. Quote the spec or ticket line for each.

### Orchestration

Assign roles by capability, not product or model name. The coordinating role pins the review point, keeps both axes scoped to it, aggregates findings, and updates the canonical comments. Reviewers inspect the concrete code and project sources each finding depends on. Without subagent controls, the current agent performs every role sequentially.

## Standards

Flag aggressively every violation of the project's documented standards (`AGENTS.md`, `CONTRIBUTING.md`, `CONVENTIONS.md`, or equivalent) and of the shared [code conventions](../implement/code-conventions.md#standards): ambition, spaghetti growth, file size, hacky code, types and boundaries, canonical layer, concurrency and state, comments, tests, and scope. Project standards win where they conflict.

## Preferred Remedies

Prefer structural fixes over cosmetic ones:

- Delete indirection and pass-through wrappers instead of polishing them; reuse the canonical helper over a near-duplicate.
- Reframe the state model, with a typed model or explicit dispatcher, so conditionals and special cases vanish instead of being centralized.
- Extract pure helpers, split large files into focused modules, and separate orchestration from business logic.
- Make type boundaries explicit so control flow simplifies.
- Cut tests that duplicate coverage or pin implementation details; add the one behavior test a criterion lacks.

Don't settle for "maybe rename this" when the issue is structural, or for a cleaner version of the same messy idea when a much simpler idea is plausible.

## Output

Prioritize: structural regressions → missed code-judo simplifications → spaghetti growth → boundary, abstraction, and type problems → spec gaps and scope creep → file size and decomposition → test bloat → legibility. Prefer a few high-conviction comments over a long list of nits.

## Approval Bar

Don't approve just because behavior seems correct. Treat any unjustified violation of the [Standards](#standards) as a presumptive blocker, above all a code-judo move that would delete complexity the PR preserves, or a file crossing 1000 lines. Otherwise leave explicit, actionable feedback pushing for a cleaner decomposition.

## Posting the Review

Post two canonical (non-threaded) comments on the PR and update those same two in place on each run. The agent that aggregated the axes locates them by their `<!-- review-code:ledger -->` and `<!-- review-code:review -->` markers and edits them directly. Never post a duplicate, and never leave the ledger update to a later run:

- The **review**, following [review-comment-template.md](review-comment-template.md): the full review, remediation steps, and verdict.
- The **ledger**, following [ledger-template.md](ledger-template.md), already [reconciled](#findings-ledger) so the PR always shows current status.

File issues for non-blocking recommendations and link them from the review. Include the context a future agent needs to implement them; err toward more detail, not less.

When authorized, submit the provider's review state: request changes for open blockers, approve when none remain. Review states are not repository labels; change workflow labels only when the repository defines them and its documented process calls for the transition.
