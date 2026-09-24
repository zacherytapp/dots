---
name: review-code
description: Run a strict maintainability review for abstraction quality, giant files, and conditional complexity. Use when the user wants a deep code audit rather than an interactive architecture scan.
disable-model-invocation: true
---

# review-code

An unusually strict review of maintainability, abstraction quality, and codebase health.

Above all, be **ambitious** about structure. Don't stop at local cleanups. Hunt for "code judo" moves: behavior-preserving restructurings that make the implementation dramatically simpler, smaller, and more direct — where whole branches, helpers, modes, or layers disappear entirely. Prefer deleting complexity over rearranging it. Aim for the version that feels inevitable in hindsight. Apply the reusable [requirements and design standards](../review-issue/design-standards.md) when evaluating the PR's design claims.

## Mechanics for Review

### Pin the review point

Before anything else, check the PR comments for a ledger left by a previous `review-code` run (the `<!-- review-code:ledger -->` marker). Its presence decides the fixed point:

- **No prior ledger — first review.** Resolve the PR's actual base repository, branch, and merge base from provider metadata or explicit user context. Diff `HEAD` against that fetched base. This is the full-branch pass.
- **Prior ledger exists — pick up from it.** It records the last reviewed SHA. Use that as the fixed point and review only `git diff <last-reviewed-SHA>...HEAD` — the code changed since your last review, not the whole branch. Apply its prior findings per [Findings ledger](#findings-ledger).

### Findings ledger

Memory across successive `review-code` runs: without it, each call re-litigates the whole diff and re-raises findings already `fixed` or `waived`. It lives in the PR comments as one canonical comment, updated in place each run, following [ledger-template.md](ledger-template.md).

Carry status forward — don't re-raise anything `fixed` or `waived`, add only genuinely new findings, and record `Reviewed up to <sha>` so the next run knows where to start. Nits stay in the ledger (or become filed issues) but aren't blockers.

**Reconcile before posting.** Once the review is complete, walk every carried-over `open` finding and check whether the current code has since resolved it. Flip any that is now fixed from `open` to `fixed`, and drop its call-out from the review comment so it is no longer flagged. Then recompute **Open blockers** so the count reflects only items still outstanding. Never silently leave a resolved finding sitting as `open`. Fixed/waived findings stay in the table as history — flip status, don't delete rows.

### Two axes

Review the [pinned diff](#pin-the-review-point)—the delta on a re-review—along two independent axes. If the harness supports parallel agents, give each one exactly the pinned diff; neither may widen back to the full branch. Otherwise review the axes sequentially in the current agent, preserving the same fixed point and evidence requirements. Then aggregate the findings.

- **Standards axis** — does the code follow the repo's documented coding standards? Find whatever documents them (`CODING_STANDARDS.md`, `CONVENTIONS.md`, `CONTRIBUTING.md`), ideally referenced from `AGENTS.md`. If nothing is documented, ask the user to point to it or add it to `AGENTS.md`.
- **Spec axis** — does the diff faithfully implement the originating issue / PRD? Flag requirements missing or partial, behaviour not asked for (scope creep), and requirements implemented wrongly. Quote the spec line for each finding.

### Orchestration

Choose agents by capability rather than product or model name. The coordinating role pins the review point, keeps both axes scoped to it, aggregates findings, and updates canonical comments. Reviewer roles must inspect the concrete code and project sources each finding depends on. When no subagent controls exist, the current agent performs those roles sequentially.

## Standards

Flag all of these aggressively:

1. **Ambition.** Look for reframings that make branches, helpers, modes, or layers vanish. Push hard on any visible path to delete complexity rather than spread it around.
2. **File size.** Treat pushing a file from under 1k lines to over 1k lines as a strong smell. Waive only for a compelling structural reason where the result is still clearly organized.
3. **Spaghetti growth.** Be highly suspicious of new ad-hoc conditionals, scattered special cases, or one-off branches added to unrelated flows. Treat "weird if statements in random places" as a design problem, not a nit — even if it works. Push the logic into a dedicated helper, state machine, policy object, or module instead.
4. **Hacky / magical code.** Prefer direct, boring code. Be skeptical of generic mechanisms hiding simple data-shape assumptions, and of thin abstractions, identity wrappers, or pass-through helpers that add indirection without clarity.
5. **Types and boundaries.** Question unnecessary optionality, `unknown`, `any`, or cast-heavy code where a clearer type boundary could exist. Prefer explicit typed models or shared contracts over loosely-shaped ad-hoc objects. When a branch uses silent fallback to paper over an unclear invariant, ask whether the boundary should be made explicit.
6. **Canonical layer.** Keep logic in the layer that owns the concept and reuse existing helpers. Flag feature logic leaking into shared paths, implementation details leaking through APIs, and near-duplicate helpers. Push code to the right package/module instead of normalizing drift.
7. **Concurrency and atomicity.** If independent work is serialized for no good reason, ask whether it should run in parallel. If related updates can leave state half-applied, push for a more atomic structure. Don't chase micro-optimizations, but flag complexity that makes the code brittle.

## Preferred Remedies

Prefer structural fixes over cosmetic ones:

- Delete indirection and pass-through wrappers instead of polishing them; reuse the canonical helper over a near-duplicate.
- Reframe the state model — a typed model or explicit dispatcher — so conditionals and special cases vanish instead of being centralized.
- Extract pure helpers, split large files into focused modules, and separate orchestration from business logic.
- Make type boundaries explicit so control flow simplifies.
- Move logic to the layer that owns the concept; parallelize or make related updates atomic when it also simplifies the flow.

Don't settle for "maybe rename this" when the issue is structural, or for a cleaner version of the same messy idea when a much simpler idea is plausible.

## Output

Prioritize findings roughly in this order: structural regressions → missed code-judo simplifications → spaghetti/branching growth → boundary/abstraction/type problems → file-size and decomposition → legibility. Prefer a few high-conviction comments over a long list of nits.

## Approval Bar

Don't approve just because behavior seems correct. Treat any unjustified instance of the [Standards](#standards) above as a presumptive blocker — above all a code-judo move that would delete complexity the PR preserves, or a file crossing 1000 lines. Otherwise, leave explicit, actionable feedback pushing for a cleaner decomposition.

## Posting the Review

Post two canonical (non-threaded) comments on the PR, updating those same two in place on each run. The reviewing agent that aggregated the axes edits the existing comments directly (locate them by their `<!-- review-code:ledger -->` / `<!-- review-code:review -->` markers and update in place) — never post a fresh duplicate, and never leave the ledger update to a later run:

- The **review** — following [review-comment-template.md](review-comment-template.md): the full review, remediation steps, and verdict.
- The **ledger** — following [ledger-template.md](ledger-template.md); see [Findings ledger](#findings-ledger). Post the ledger reflecting the [reconciliation](#findings-ledger) — resolved findings already flipped to `fixed`, **Open blockers** recomputed — so the comment on the PR always shows current status.

For non-blocking recommendations, file issues with the same detail and link them from the review. Include any context or implementation detail a future agent needs — err toward more detail on issues found, not less.

When authorized, submit the provider's review state—request changes for open blockers, approve when none remain. Review states are not repository labels. Change workflow labels only when the repository defines them and the requested transition is part of its documented process.
