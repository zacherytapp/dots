---
name: project-cleanup
description: Inventories a repository's local and remote branches, worktrees, stashes, and project or machine temp files, confirms with tests which branches fully landed on the default branch, then deletes those branches and their leftovers. Use when the user wants merged branches, stale worktrees, or branch and project temp files cleaned up after work lands on main.
disable-model-invocation: true
---

# Project Cleanup

Delete only what has **provably landed on the default branch and works there**. Anything uncertain is kept and reported. Print every deleted tip so it can be restored with `git branch <name> <sha>`.

```bash
I=~/.agents/skills/project-cleanup/scripts/inventory.ts # node "$I" [--base <remote>/<branch>] [--repo <path>]
```

The script prints JSON and changes nothing. Each branch gets a `status`:

- `landed`, with `via`: `ancestor` (merge commit), `fast-forward` (local reflog shows its commits), `rebase` (every commit patch-equivalent), `merge-tree` (merging it into base changes nothing), or `squash` (its whole diff matches one base commit).
- `pointer`: no commits of its own. It was fast-forwarded or freshly created for upcoming work.
- `unlanded`: base lacks some of its changes.

It also lists worktrees (dirty count, in use by a live process), stashes, project scratch (`tmp/`, `.tmp/`, `scratch/`), orphan dirs in `.worktrees/` or `.claude/worktrees/`, and machine temp entries named after the repo or a branch.

## Roles

- **Coordinator (you):** orient, inventory, test base, plan, delete, report.
- **Temp scout:** one subagent on the cheapest fast model. It only reads.
- **Verifiers:** one subagent per landed branch (batch up to five trivial ones) on a mid-tier model, in parallel and in the background. They read and run tests; they never edit, commit, push, or delete.

Without subagents, do each role yourself in order.

## Workflow

1. **Orient.** Read the project's agent instructions, CI, and setup and test docs. Resolve the base from the host (`gh repo view --json defaultBranchRef`) or `<remote>/HEAD`, preferring `upstream` over `origin` in a fork. Run `git fetch --all --prune`. Note `git status`; never touch the user's checkout or uncommitted work.
2. **Inventory.** Run `node "$I" --base <remote>/<branch>` and save its output in the session scratch dir, not the project. Cross-check with the host: a merged PR whose head SHA equals a branch tip confirms the landing. A merged PR whose content git can't find in base (reverted or rewritten later) stays `unlanded`. A branch with an open PR is never deleted.
3. **Scout temp files** (subagent, in parallel with step 4). Give it the inventory's `worktrees`, `stashes`, and `temp` plus the branch statuses. It also finds per-branch or per-project leftovers the script can't see: anything the project's docs, scripts, compose files, or CI create, such as docker containers, volumes, and images, local databases, preview deploys, scratch orgs, or build sandboxes outside the repo. It returns `path or resource | owner branch | size | last modified | in use | verdict (remove, ask, keep) | reason` and deletes nothing. Machine-wide caches belong to `clean-disk`.
4. **Test base.** Create a detached worktree at the base SHA in `.worktrees/cleanup-verify` (add `.worktrees/` to `.git/info/exclude` if it isn't ignored), install dependencies the documented way, and run the project's full check once. Record failures and whether they predate the landings (rerun on the base commit before the first landing when unclear).
5. **Verify each landing.** Give each verifier its rows (name, remote, tip, `via`, `mergeBase`, PR link), the verification worktree path, and the base result. It:
   - confirms every hunk of `git diff <mergeBase> <tip>` is in base, or names the later base commit that intentionally changed it (`git log -S`, `git log -L`);
   - finds the tests and checks covering the changed code and runs the focused ones in the verification worktree, including opt-in suites the default run skips (e2e, build, packaging) that the change touches;
   - returns `branch | verdict (verified, untested, failed, not landed) | evidence | commands and results`.

   If the project's tests can't run concurrently (shared ports, databases, or build dirs), have verifiers return their commands and run them yourself, one at a time.

6. **Plan.** Merge everything into one table: item, kind, action, reason, tip SHA or size. Delete a branch only when it is `landed`, its verdict is `verified` or `untested`, it isn't protected, current, or behind an open PR, and its worktree (if any) is clean and unused. Remove the local copy and the remote copy of a branch separately; each needs its own row.
   - **Without asking:** local landed branches, their clean unused worktrees, orphan worktree dirs, and project scratch untouched for 7 days and not in use.
   - **Ask once** with AskUserQuestion (multiSelect, grouped by kind, each option giving the name, SHA or path, size, author, and reason): remote branches (they are shared and may back deploys or others' work), `pointer` branches, dirty worktrees, stashes, newer project scratch, machine temp, and the scout's project resources.
   - **Keep and report:** `unlanded`, `failed`, and `not landed` branches, anything in use, and tracked files.
7. **Clean.** Rerun the inventory first and drop any row whose tip, dirty count, or in-use flag changed. Then, in order:
   - Worktrees: `git worktree remove <path>`, using `--force` only after the user accepted losing the changes. Finish with `git worktree prune`.
   - Local branches: `git branch -D <name>` (squash and rebase landings fail `-d`).
   - Remote branches: `git push --force-with-lease=refs/heads/<name>:<sha> <remote> :refs/heads/<name>`, using only the inventory's remote. If the push is rejected, report why and leave the branch. Never force past branch protection.
   - Temp: delete only approved paths. Drop stashes with `git stash drop` from the highest index down, so the remaining indexes don't shift.
   - Remove the verification worktree last.
8. **Report.** Give the base ref and SHA and the full-check result; a branch table (local or remote, `via`, verdict, action, tip SHA); worktrees and temp removed with sizes; what was kept and why; restore commands; and follow-ups such as failing checks, untested landings, open PRs, and a local base branch that is ahead of or behind its remote.

## Pitfalls

- `git branch --merged` misses squash and rebase landings. Trust `via` and PR evidence instead.
- A tip that moved after verification is not the code you verified. Recheck SHAs right before deleting.
- `git fetch --prune` deletes remote-tracking refs, never remote branches. Deleting a remote branch can close its PR or break a deploy watching it.
- A green suite proves nothing about a landed change with no covering test. Mark it `untested` rather than `verified`.
