# Ticket Body — target shape, and updating in place

The output of this skill is a **rewritten ticket body** that is the single source of truth — not a review comment, not a side doc. Comments get consolidated into it.

## Be maximally specific

Carry **every criterion** the **to-spec** / **to-tickets** skills call for — problem, solution, what-to-build, user stories, implementation and testing decisions, acceptance, out-of-scope — but reverse their stance on detail. They forbid file paths and code snippets because their outputs age before implementation; this ticket ships **next**, so specificity pays off. Name exact classes, methods, field API names, permsets, and paths; inline a short code example when it pins a decision better than prose (a signature, DTO shape, SOQL, trigger hook — trimmed to the decision, not a demo); give the exact commands so the implementer copies rather than composes. The bar is the self-contained test at the bottom.

## Target structure

Rewrite to this shape; drop a section only when it genuinely doesn't apply:

```markdown
## Summary

Intent and observable outcome, in a line or two. What, and why.

## Scope

- **In:** …
- **Out / non-goals:** the adjacent things this ticket does NOT do.

## Org & setup

<the block from org-setup.md — org, standup script/commands, permsets, seed, validation>

## Implementation map

<the Touch / Create lists from inventory.md — exact classes, methods, field API names, LWC, permsets, paths>

## Salesforce constraints & gotchas

<only the risks from gotchas.md that apply — each specific: the limit and where>

## Tests & coverage

- Extend / Create: <test classes.methods>
- Cases (only what holds coverage + locks core behavior/regressions): bulk (200), boundary/null, negative, async — those that apply
- Callout mocks: <if any> · Coverage: ≥75% org-wide (or repo bar), new/changed classes covered
- Run: `sf apex run test --tests <Class.method> --target-org <alias>` and `sf project deploy start --dry-run --source-dir force-app --test-level RunLocalTests --target-org <alias> --json`

## Acceptance criteria

- Observable outcomes with the exact check: `sf data query --query "…"` result, a UI state, a debug-log assertion
- Failure states handled; no regressions in <blast-radius artifacts from the map>

## Sequencing & dependencies

- **Parallel:** work that can proceed at once — <tasks with no shared edge>
- **Blocked by / gates:** only what genuinely serializes, and why
- Deploy order for the phases in play: objects/fields → permsets → Apex → Flows(Draft) → activate

## Open questions

- Remaining ambiguity that doesn't block start but the implementer must watch, each with the current best assumption. (Omit if none; anything that _blocks_ is a stop-and-ask, not a ticket note.)

## References

- Docs / ADRs / linked issues / prior art
```

## Update the body directly — never a review comment

Replace the body in place, preserving the title, labels, and any still-true original content (you're enriching, not erasing intent):

- **Forgejo/Gitea:** `forgejo-mcp` `issue_read` to pull body + comments, `issue_write` to replace the body.
- **GitHub:** `gh issue view <n> --comments`, then `gh issue edit <n> --body-file <file>`.

## Consolidate comments into the body

Comments scatter the ticket's truth. Fold them in:

1. Extract each comment's durable content — decisions, constraints, links, corrections.
2. Merge into the **relevant section** (a scope decision → Scope, a constraint → Gotchas, a link → References). Not a raw dump.
3. Add a trailer so history stays traceable:

   ```markdown
   ---

   _Consolidated from N prior comments during review. Superseded discussion left inline below._
   ```

4. **Don't delete comment history** by default — it's the audit trail. To close the loop, add one brief comment noting the body now supersedes the thread. Deleting someone else's comment is a stop-and-ask.

## The self-contained test

Before finishing: could an implementer complete the ticket having opened **only** the links inside it — no repo hunting, no comment thread, no org guessing? If not, the body isn't done.
