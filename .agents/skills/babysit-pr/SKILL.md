---
name: babysit-pr
description: Iteratively reviews and keeps GitHub and Forgejo pull requests merge-ready. Use when a PR was just filed or needs CI, feedback, conflict, or maintainability work.
---

# Babysit a PR

## Select the provider

Inspect `git remote -v` and identify the remote and host for the target PR or base repository; do not assume a remote named `origin`. Then check `command -v gh` and `command -v gt`. Only GitHub and Forgejo are supported: use `gh` for a GitHub remote and `gt` for a Forgejo remote (`gt` is the Gitea CLI, formerly `tea`, and works through Forgejo's Gitea-compatible API); do not choose by CLI precedence when both are installed. Confirm a non-GitHub host is Forgejo with `curl -fsS https://<host>/api/forgejo/v1/version`, which only Forgejo serves, and stop for any other host, including Gitea. Confirm authentication with `gh auth status` or `gt auth status --json host,user,active,credential_available`, matching the remote host to a gt credential. Stop if the matching CLI or credentials are unavailable.

Identify the PR from the user, current branch, or provider output. Never silently select the first PR. For Forgejo:

```bash
gt pr list --json number,title,head,state,url
```

Set `PR`, `HEAD`, and `BASE` from the selected PR.

## Inspect the PR

GitHub:

```bash
gh pr view "$PR" --json number,title,state,isDraft,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup,comments,reviews,headRefName,baseRefName
gh pr checks "$PR"
gh api "repos/{owner}/{repo}/pulls/$PR/comments"
```

Forgejo:

```bash
gt pr view "$PR" --json number,title,state,draft,mergeable,base,head,head_sha,review_decision,comments
gt pr review list "$PR" --json id,author,state,stale,dismissed,commit
gt pr review comments "$PR" --json id,review_id,path,line,body,author,resolver
gt pr checks "$PR" --json name,state,url
gt run list --branch "$HEAD" --event pull_request --json id,status,conclusion,workflow,commit,url
```

If the event-filtered `gt run list` result is empty, retry without `--event`; some workflows run under another event. Treat `mergeable: false` as a conflict unless the provider reports that mergeability is still being calculated.

## Fix failures

For every failed run, inspect details and failed logs.

```bash
# GitHub
gh run view <run-id> --log-failed

# Forgejo
gt run view <run-id> --json id,status,conclusion,jobs
gt run logs <run-id> --failed
```

Reproduce the failure with repository commands before changing code. Typical starting points are the configured lint, type-check, test, and build scripts; do not assume npm or specific script names. Delegate code changes through the existing-environment implementation path used by `implement-pr-fixes`, then re-run the failed check. Never weaken assertions merely to make CI pass.

## Enforce quality and coordinate feedback

At the start of the first round, read and follow [review-code](../review-code/SKILL.md) with the PR URL, actual base, and original request or issue; read [sf-review-code](../sf-review-code/SKILL.md) instead for Salesforce changes. Treat the canonical ledger's open blockers and actionable in-scope human feedback as the worklist.

Make code changes for that worklist by following [implement-pr-fixes](../implement-pr-fixes/SKILL.md) in the existing branch and environment. Do not edit the ledger from the implementation role. After each fix push, run the selected reviewer so it independently reconciles findings against the new SHA. Ask the user about ambiguous requests or design decisions; do not automatically implement subjective nits or out-of-scope suggestions.

Aim for no open review blockers, no actionable in-scope human feedback, passing required CI, and no conflicts—not zero comments. After a Forgejo fix is pushed and independently verified, resolve its thread with `gt pr review resolve "$PR" <comment-id>`. Report feedback that cannot be resolved automatically.

## Resolve conflicts

Use the actual base repository remote and branch resolved from provider metadata, not a hard-coded remote or default:

```bash
git fetch "$BASE_REMOTE" "$BASE"
git merge FETCH_HEAD
```

Follow the `resolving-merge-conflicts` skill. Ask about ambiguous resolutions and never force-push a shared PR branch.

## Validate and push

Run the relevant local checks, inspect the diff, then create focused commits and push normally. Do not use `git add -A` without first checking for unrelated changes.

After each push, re-check PR state, reviews, and CI with the inspection commands. Wait for CI with `gh pr checks "$PR" --watch` or `gt pr checks "$PR" --watch`; both stop at the first failure. Attempt at most three fix-push-review-check rounds.

When everything passes, no actionable feedback or conflicts remain, and the PR is still draft, mark it ready only if that matches the user's intent:

```bash
gh pr ready "$PR"       # GitHub
gt pr ready "$PR"       # Forgejo
```

## Report

Summarize failures and fixes, feedback addressed or deferred, conflict resolution, checks run, and the remaining blocker or merge-ready status.
