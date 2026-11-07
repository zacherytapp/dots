---
name: implement
description: Implements a spec's tickets, or a single ticket, in isolated project worktrees, shipping only the tests that prove the acceptance criteria. Use when the user wants planned work built from a spec, ticket, or issue.
disable-model-invocation: true
---

# Implement

Workflow: `to-spec` → `to-tickets` → **`implement`** → `file-pr` → `babysit-pr`.

Build what the tickets say and no more. A ticket's acceptance criteria are its definition of done. Follow [code-conventions.md](code-conventions.md) and the project's own docs (`AGENTS.md`, ADRs, glossary), which take precedence.

## Setup

1. **Read the work.** The spec and its tickets, from the tracker or `docs/specs/<feature-slug>/`, including comments. State each ticket's title. Stop and report if a ticket has open questions or an unmerged blocker. Ask if the reference is ambiguous.
2. **Resolve the base.** Get the base repository and branch from the ticket, project config, or provider metadata; don't assume `origin` or a default branch. Fetch it and record the SHA.
3. **Create the worktree.** Worktrees always live in `.worktrees/` at the root of the main checkout, kept out of git without a commit:

   ```bash
   root=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
   git fetch <base-remote> <base> && git rev-parse FETCH_HEAD
   git -C "$root" check-ignore -q .worktrees/ || echo .worktrees/ >> "$root/.git/info/exclude"
   git worktree add "$root/.worktrees/<branch-slug>" -b <branch> FETCH_HEAD
   ```

   `<branch-slug>` is the branch name with `/` replaced by `-`. Never edit, test, or commit in the main checkout. When a caller supplies an existing worktree (for example `implement-pr-fixes`), use it instead.

## One ticket

In the ticket's worktree:

1. Implement the ticket. Typecheck and run focused tests as you go; run the full applicable suite once at the end.
2. Write the tests the ticket lists, following [Tests](#tests), and nothing beyond them.
3. Before each commit, check the branch and staged paths. Commit focused changes on the ticket branch.
4. For a docs-based ticket, set its **Status** to `done` in the same branch. Tracker tickets close through the PR.

## A spec with several tickets

The tickets form a task graph. The **frontier** is every ticket whose blockers are merged.

1. Create the integration worktree as in [Setup](#setup), on a branch named for the spec.
2. For each frontier ticket, start a fresh implementer subagent, in the background when supported. Pass only pointers: the spec and ticket paths, the integration branch, and its own worktree `.worktrees/<integration-slug>-NN` branched from the integration tip. It follows [One ticket](#one-ticket), merges the integration tip into its branch before finishing, and reports back briefly: branch, commits, checks run, and anything left undone.
3. When one finishes, merge its branch in the integration worktree (use `resolving-merge-conflicts` on conflicts), run the checks, recompute the frontier, and start the newly unblocked tickets.
4. Without subagent support, work the frontier yourself, one ticket at a time.
5. When every ticket is merged, run the full validation in the integration worktree. Then have a fresh subagent review the integration diff against the spec and the review-code [Standards](../review-code/SKILL.md#standards) and [Spec axis](../review-code/SKILL.md#two-axes), without the PR ledger or comments. Fix its blockers in one pass.
6. Remove the ticket worktrees and merged ticket branches; keep the integration worktree.

## Tests

Ship the minimum set of tests that proves the work:

- One behavior test per acceptance criterion at most, at the spec's seam, through the public interface. A bug fix gets one regression test. One test that proves two criteria beats two tests.
- Extend existing test files and fixtures before creating new ones.
- Don't test private helpers, trivial code, what the type checker already guarantees, framework behavior, or mocks of code you own. No snapshots unless the snapshot is the behavior.
- Delete exploratory and scaffolding tests before committing.
- Project-mandated coverage thresholds still apply; meet them with behavior tests, not filler.

## Finish

Report the base repository, branch, and starting SHA; the worktree path and branch; commits; checks run and their results; tickets completed; and remaining risks. Hand off to `file-pr` when the user wants a pull request. Don't open, review, or merge the PR yourself.
