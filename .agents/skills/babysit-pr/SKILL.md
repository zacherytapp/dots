---
name: babysit-pr
description: Iteratively reviews and keeps GitHub and Forgejo/Gitea pull requests merge-ready. Use when a PR was just filed or needs CI, feedback, conflict, or maintainability work.
---

# Babysit a PR

## Select the provider

Inspect `git remote -v` and identify the remote and host for the target PR or base repository; do not assume a remote named `origin`. Then check `command -v gh` and `command -v tea`. Use `gh` for a GitHub remote and `tea` for a Forgejo/Gitea remote; do not choose by CLI precedence when both are installed. Confirm authentication with `gh auth status` or `tea logins list -o json`, matching the remote host to a Tea login. Stop if the matching CLI or credentials are unavailable.

Identify the PR from the user, current branch, or provider output. Never silently select the first PR. For Tea:

```bash
tea pr ls --fields index,title,head,state,url --output json
```

Set `PR`, `HEAD`, and `BASE` from the selected PR.

## Inspect the PR

GitHub:

```bash
gh pr view "$PR" --json number,title,state,isDraft,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup,comments,reviews,headRefName,baseRefName
gh pr checks "$PR"
gh api "repos/{owner}/{repo}/pulls/$PR/comments"
```

Forgejo/Gitea (`tea` is the locally installed compatible CLI):

```bash
tea pr "$PR" --fields index,title,state,mergeable,base,head,comments,ci --comments --output json
tea pr review-comments "$PR" --output json
tea api "repos/{owner}/{repo}/pulls/$PR/reviews"
tea actions runs list --branch "$HEAD" --event pull_request --output json
```

If the event-filtered Tea result is empty, retry without `--event`; some workflows run under another event. Treat `mergeable: false` as a conflict unless the provider reports that mergeability is still being calculated.

## Fix failures

For every failed run, inspect details and failed logs.

```bash
# GitHub
gh run view <run-id> --log-failed

# Forgejo/Gitea
tea actions runs view <run-id> --jobs --output json
tea actions runs logs <run-id>
```

Reproduce the failure with repository commands before changing code. Typical starting points are the configured lint, type-check, test, and build scripts; do not assume npm or specific script names. Delegate code changes through the existing-environment implementation path used by `implement-pr-fixes`, then re-run the failed check. Never weaken assertions merely to make CI pass.

## Enforce quality and coordinate feedback

At the start of the first round, load and follow `review-code` with the PR URL, actual base, and original request or issue; use `sf-review-code` for Salesforce changes. Treat the canonical ledger's open blockers and actionable in-scope human feedback as the worklist.

Delegate code changes for that worklist to `implement-pr-fixes` in the existing branch and environment. Do not edit the ledger from the implementation role. After each fix push, run the selected reviewer so it independently reconciles findings against the new SHA. Ask the user about ambiguous requests or design decisions; do not automatically implement subjective nits or out-of-scope suggestions.

Aim for no open review blockers, no actionable in-scope human feedback, passing required CI, and no conflicts—not zero comments. After a Forgejo/Gitea fix is pushed and independently verified, resolve its thread with `tea pr resolve <comment-id>`. Report feedback that cannot be resolved automatically.

## Resolve conflicts

Use the actual base repository remote and branch resolved from provider metadata, not a hard-coded remote or default:

```bash
git fetch "$BASE_REMOTE" "$BASE"
git merge FETCH_HEAD
```

Follow the `resolving-merge-conflicts` skill. Ask about ambiguous resolutions and never force-push a shared PR branch.

## Validate and push

Run the relevant local checks, inspect the diff, then create focused commits and push normally. Do not use `git add -A` without first checking for unrelated changes.

After each push, re-check PR state, reviews, and CI with the inspection commands. GitHub can wait with `gh pr checks "$PR" --watch`; Tea has no equivalent, so poll `tea actions runs list --branch "$HEAD" --output json` at a reasonable interval while runs are queued or active. Attempt at most three fix-push-review-check rounds.

When everything passes, no actionable feedback or conflicts remain, and the PR is still draft, mark it ready only if that matches the user's intent:

```bash
gh pr ready "$PR"       # GitHub
tea pr edit "$PR" --ready # Forgejo/Gitea
```

## Report

Summarize failures and fixes, feedback addressed or deferred, conflict resolution, checks run, and the remaining blocker or merge-ready status.
