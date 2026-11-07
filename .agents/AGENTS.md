# AGENTS.md

## Overview

`.agents/` in the dots repo, stowed to `~/.agents`, holds shared agent skills and hooks. It is no longer a standalone repo. Dev tooling, commands and formatting rules live at the dots repo root (see the root `AGENTS.md`).

## Repository structure

- `skills/` — third-party and local agent skills.
- `.skill-lock.json` — installation receipt for third-party skills currently on disk, not a desired-state manifest. Local skills are intentionally absent. Run the owning installer to create or refresh receipt hashes; the validator only prunes/checks stale entries.
- `hooks/` — accidental-use guardrails for common destructive command forms, environment files, and large writes. They are not a security boundary; see `hooks/README.md`.
- `scripts/validate-skills.ts` — skill validator (TypeScript, run by Node directly), run as `pnpm check:skills` from the repo root.
- `.pi/tasks/` — ignored transient Pi session state.

## Key rules

- Keep skill instructions token-efficient: avoid duplication and filler. Every line must earn its place.
- Follow `write-a-skill` for canonical skill structure, metadata, and references.
- `CLAUDE.md` is a symlink to this file.
- Don't add a `package.json`, lockfile or formatter config here; use the repo-root tooling.

## Commands

From the dots repo root: `pnpm check:skills`, `pnpm test` (includes the hook behavioral tests), `pnpm lint`, `pnpm format`, or `pnpm check` for everything.

## Local custom skills

This exhaustive list is checked against skill directories not recorded in `.skill-lock.json`:

- `babysit-pr` — keep GitHub and Forgejo/Gitea pull requests merge-ready
- `deslop` — remove AI-generated slop from diffs
- `file-pr` — create clear pull requests with the correct host CLI
- `grill-with-docs` — grill a plan while recording the glossary and ADRs in `docs/`
- `grilling` — interview the user in rounds to stress-test a plan
- `implement` — build a spec's tickets in `.worktrees/` with minimal tests
- `implement-pr-fixes` — apply PR review feedback
- `meeting-notes` — draft concise meeting minutes
- `merge-pr-into-main` — merge a PR and clean up
- `review-and-commit` — review changes and create scoped commits
- `review-code` — deep maintainability audit
- `review-issue` — review issues/specs for readiness
- `sf-docs` — retrieve official Salesforce documentation
- `sf-implement` — implement Salesforce work
- `sf-logs-debug` — diagnose Salesforce debug logs
- `sf-org-manage` — create, snapshot, and open Salesforce orgs
- `sf-review-code` — review Salesforce code
- `sf-review-issue` — review Salesforce issues/specs
- `sf-scratch-org-cleanup` — prune scratch orgs
- `to-spec` — synthesize a large spec from the spec template
- `to-tickets` — split a spec into few, large, blocking-aware tickets
