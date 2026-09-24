---
name: implement
description: Implements work from a spec or tickets in an isolated worktree. Use when the user invokes an implementation workflow with an existing plan.
disable-model-invocation: true
---

# Implement

## 1. Clarify the target

Require a clear plan, target base branch, and intended base repository. Resolve them from the issue, PR, project configuration, or provider metadata; ask only when they remain ambiguous. Verify referenced files and code before changing anything.

## 2. Start from the resolved base

Determine which remote represents the base repository; do not assume `origin`, especially for forks. Fetch the target base, record its SHA, list existing worktrees, and create the branch from that fetched ref:

```bash
git fetch <base-remote> <base>
git rev-parse FETCH_HEAD
git worktree list
git worktree add .worktrees/<slug> -b <branch> FETCH_HEAD
cd .worktrees/<slug>
```

Use the repository's preferred worktree location. If `.worktrees/` is used, ensure it is ignored without mixing that housekeeping change into feature work. Never edit, retrieve generated source, test, or commit in the primary checkout.

## 3. Plan

Explore relevant code and use the project's domain vocabulary. Follow [code-conventions](code-conventions.md), ADRs, and architecture docs. Design for [deep modules](deep-modules.md) and [testability](interface-design.md). Split the work into small, independently validated vertical tasks.

## 4. Implement and validate

Implement one task at a time. Run the relevant focused tests and checks at task boundaries, then the complete applicable validation before finalizing. Apply the [refactoring checklist](refactoring.md) to touched code without broadening scope.

Use additional agents only when the harness provides them and parallel work has independent boundaries. Assign roles by capability—research, mechanical implementation, UI work, or review—not product or model names. If orchestration is unavailable, perform the same tasks sequentially in the current agent.

## 5. Commit and hand off

Before each commit, confirm the worktree branch and inspect staged paths. Create focused commits only on the feature branch. Finish with:

- the resolved base repository, branch, and starting SHA;
- commits created and checks run;
- remaining risks or blockers;
- a handoff to `file-pr` when the user wants a pull request.

Do not create the PR, wait for CI, perform PR review, or merge; those belong to `file-pr`, `babysit-pr`, `review-code`, and `merge-pr-into-main`.

## Red flags

- Branching from an unresolved current `HEAD`
- Assuming the base remote or branch
- Changing files outside the isolated worktree
- Writing code without a clear plan
- Skipping relevant tests or mixing unrelated changes
