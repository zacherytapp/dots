---
name: clean-disk
description: Free disk space on this machine by clearing dev caches, temp dirs, agent leftovers, and pacman/journal/btrfs slack. Use when the disk or /tmp is full, or the user asks to clean up disk space or caches.
---

# Clean disk

All cleanup runs through one script, so every run makes the same decisions:

```
S=~/.claude/skills/clean-disk/scripts/clean-disk
```

It has three tiers:

- **user**: deleted without asking. Covers regenerable caches (Go, npm/pnpm/npx, uv/pip, cargo, browser caches, paru build output, docker images unused for 7d and old build cache) and stale `/tmp` entries. It also covers agent leftovers that meet a fixed rule:
  - Claude session transcripts untouched for 14d, and all sessions of a project whose directory is gone. Live sessions and `memory/` are kept.
  - Finished Claude jobs untouched for 7d, and the build caches of younger ones.
  - Ended-session scratchpads untouched for 1d.
  - Worktrees that are merged, clean, unused and untouched for 1d. The branch stays.
  - Repo `.tmp`/`scratch` dirs untouched for 7d, and gitignored build output in repos with no commit for 30d.

  The thresholds are constants at the top of the script.

- **system**: needs root. Covers pacman cache, `download-*` leftovers, the journal, coredumps, unused flatpaks, snapper cleanup, and a filtered btrfs balance.
- **review**: whatever misses those rules but may matter: unmerged or dirty worktrees, recent finished jobs and scratchpads, recent big `/tmp` entries, caches with no rule, non-standard `~` dirs, large files, docker volumes, and younger unused images. The user decides on each one.

The script skips any path that a live process references (cwd, open fd, argv, environment, docker bind mount). `/tmp` is a RAM-backed tmpfs here, so a full `/tmp` also eats swap.

## Steps

1. **Scan.** Run `$S scan`. It is a dry run that prints each tier and refreshes the review list. Tell the user the headline: how much the user tier would free, plus anything surprising.
2. **Run the user tier.** Run `$S run`. It prints disk usage before and after, then the fresh review list. If it reports `skipped: go running` (or `firefox running`, and so on), say which process blocked which cache. The user can close it and rerun.
3. **System tier.** It needs a sudo password, so hand the user the command and let them run it. Show `$S system --dry-run` first, then give them `! sudo ~/.claude/skills/clean-disk/scripts/clean-disk system`. The btrfs balance can take minutes.
4. **Review.** Every row in the review list gets an answer: **remove**, **keep** (never ask again), or **later** (ask next run). Group the rows by kind and ask with AskUserQuestion. Use multiSelect, and put the path, size and detail in each option. Quote the facts the detail line gives: `merged into main: yes`, `N uncommitted`, `OPEN in a running process`, `may hold database data`. Then apply the answers:
   - `$S remove PATH…` for removals. It only accepts paths from the last review and re-checks that each one is unused.
   - `$S remove --force PATH…` only for a worktree with uncommitted changes, after the user has confirmed that those changes can be lost. Removing a worktree leaves its branch in place.
   - `$S keep PATH…` for keeps. It writes to `~/.config/clean-disk/keep`, and anything under a kept path is never listed again.
   - If the user approves the same kind of row run after run, offer to turn it into a rule (see below) so later runs stop asking.
5. **Report.** Give the space freed per tier (the last lines of `~/.local/state/clean-disk/history.log`), the `df` figures before and after, and anything skipped or deferred. Totals are apparent sizes. btrfs compresses, so the `df` change is the real on-disk number.

## Changing the script

The script is the only thing that deletes files. If a run turns up a recurring cache or temp pattern that has no rule, add a rule to `scripts/clean-disk` instead of deleting it by hand. Put regenerable things in the user tier and anything with possible user value in a review collector. Add a case to `scripts/test-clean-disk` and run it until it passes. The tests use a throwaway home and never touch real data.

State files are in `~/.local/state/clean-disk/`: `review.tsv` (the last review, which `remove` checks against), `last-run.tsv` (every item from the last run, including ones under 1M), and `history.log`.
