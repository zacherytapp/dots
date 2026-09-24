---
name: resolving-merge-conflicts
description: Resolves or safely aborts in-progress Git conflicts. Use when a merge, rebase, cherry-pick, or revert has conflicts.
---

# Resolve Merge Conflicts

1. Inspect `git status`, the operation in progress, its base/onto commits, conflicting paths, and unrelated worktree changes.
2. Confirm the operation and target are intentional. If the merge/rebase/cherry-pick/revert was accidental, uses the wrong base, or cannot preserve the intended changes, explain why and ask before running the matching `--abort` command.
3. Read the commits, PRs, issues, and surrounding code that establish both sides' intent. Resolve each hunk without inventing behavior; ask when the correct semantic result is ambiguous.
4. Stage only paths whose conflicts were resolved. Never use `git add .`, `git add -A`, or stage unrelated files. Verify no unmerged entries remain with `git diff --name-only --diff-filter=U`.
5. Run the repository's relevant formatting, type, build, and test checks. Fix only problems caused by the integration.
6. Continue the actual operation with `git merge --continue`, `git rebase --continue`, `git cherry-pick --continue`, or `git revert --continue`. Do not replace a continue command with an unconditional `git commit`. Repeat the inspect–resolve–stage–validate cycle if later rebase commits conflict.
7. Report the resolutions, checks, resulting commit/HEAD, and any trade-offs or unrelated changes left untouched.
