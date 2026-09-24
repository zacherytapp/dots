---
name: merge-pr-into-main
description: Merge an open pull request into the default branch, clean up its branch, and reconcile linked issues. Use when the user asks to merge or finalize a PR.
disable-model-invocation: true
user-invocable: true
---

# Merge PR Into Main

Merge the selected PR autonomously. Never create a PR, bypass repository protections, move the user from a worktree, or touch unrelated changes. Ask only at the decision points below.

## Select and inspect

1. Resolve the target from an explicit PR argument, then session context, then the current branch. Never silently choose the first PR in a list.
2. Identify the provider from the target URL or its base-repository remote, not CLI precedence. Match that host to `gh auth status --hostname <host>` or `tea logins list -o json`; stop if unsupported or unauthenticated.
3. Record the PR URL, base repository/default branch/ref, head repository/ref, and head SHA; compare those identities with `git remote -v`. If the checkout matches neither repository, operate remotely and skip local cleanup.
4. Inspect `git status --short` and `git worktree list --porcelain`. Leave unrelated changes and all worktrees untouched.

GitHub:

```bash
gh pr view "$PR" --json number,title,url,body,state,isDraft,baseRefName,headRefName,headRefOid,headRepository,headRepositoryOwner,isCrossRepository,mergeable,mergeStateStatus,reviewDecision,reviewRequests,latestReviews,statusCheckRollup,closingIssuesReferences
gh pr checks "$PR"
```

Forgejo/Gitea:

```bash
tea pr "$PR" --repo "$BASE_REPO" --fields index,title,url,state,body,mergeable,base,base-commit,head,comments,ci --comments --output json
```

## Validate and merge

Require an open, non-draft PR into the repository's actual default branch, with a non-default head, expected pushed head SHA, satisfied review requirements, no unresolved blocking feedback, passing required checks, and no conflicts.

Use `babysit-pr` for pending or failed checks, feedback, or conflicts; follow `resolving-merge-conflicts` while resolving. After every push, inspect the diff, run relevant local checks, and repeat the full PR validation. Merge only the final reviewed SHA.

Choose the merge method from project docs, then PR history, then the host default. Do not ask about method. For GitHub, guard against a head change:

```bash
gh pr merge "$PR" --squash --match-head-commit "$HEAD_SHA" # or --merge/--rebase per convention
```

For Forgejo/Gitea, recheck the head immediately before `tea pr merge`. Wait for any merge queue and confirm the merged state and resulting commit before cleanup.

## Clean up

- **Remote branch:** delete through the provider using only the recorded head repository and ref. Never infer the remote from the branch name or assume `origin` owns it. If deletion is unauthorized or protected, leave it and report why.
- **Local branch:** delete only when its tip equals the final PR head SHA, it is verified to track that head repository/ref, and no worktree has it checked out. Otherwise leave it and report why.
- **Issues:** use provider-linked issues or explicit links in the PR as authoritative. Branch names and commits may only discover candidates. Close an issue only when this PR completes its documented scope; if partial, comment with what landed and remains. Leave unrelated issues untouched.

## Ask only when

- The target is missing or ambiguous, the base is not the default branch, or the head is the default branch.
- The PR is a draft without explicit merge instruction, or a required gate remains blocked after `babysit-pr`.
- A conflict, review request, or issue-completion decision is semantic or unclear.
- Credentials/provider support are missing, or local changes cannot be avoided safely.

## Report

Report the PR and head → base, method and merge SHA, validation or conflict work, remote/local branch disposition, issues closed or updated, and remaining follow-ups.
