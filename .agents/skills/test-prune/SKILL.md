---
name: test-prune
description: Aggressively prunes, consolidates, and speeds up unit, integration, and e2e tests, deleting low-value tests and cutting live-service calls while keeping real coverage. Use when the user wants fewer or faster tests, a slow or flaky suite cleaned up, or test bloat removed.
---

# test-prune

Goal: **fewer, faster tests that catch the same production bugs.** Every surviving test must catch a real bug no cheaper test does. Measure; never guess.

## Roles

Scope is what the user names: a single file, module or the entire project.

- **Coordinator (you):** baseline, plan, review every diff, verify, report.
- **Scouts:** read-only, cheapest fast model, in parallel, one per unit (file or package), plus one for runner config, CI, scripts, harness helpers, and live-service seams.
- **Refactorers:** most capable model, one unit each, disjoint files, in parallel.

A single small file needs no fan-out. Without subagents, play each role in order.

## Workflow

1. **Orient.** Read agent instructions, runner config, and CI. Find every caller of the test commands: CI, release scripts, hooks, explicit test lists.
2. **Baseline.** First make sure the run can't reach live services. Run the suite once with per-test timing. Record wall time, pass/fail/skip counts, the 20 slowest tests, and existing failures.
3. **Scout.** Each scout returns `test | behavior proved | verdict | reason | evidence`. Verdicts: `keep`, `delete`, `merge → <target>`, `rewrite`, `push down`, `speed up`, `fake service`. Evidence names the covered code, the duplicate, or the measured cost. Also flag skipped tests, git-ignored files the runner still collects, sleeps/retries/polls/timeouts, and real network, credentials, or `.env` loading.
4. **Plan.** Merge tables; use the behavior column to find cross-unit duplicates. Spot-check verdicts both ways: upgrade timid `keep`s, reject bad `delete`s. Confirm with the user before changing CI, release scripts, or what a shared test command runs — that silently changes what CI ships.
5. **Refactor.** Each refactorer gets its approved rows and this skill's rules, runs its tests to green, and reports files changed, tests and time before → after.
6. **Verify.** Read every diff yourself; summaries hide weakened assertions. Re-run and compare to baseline. Prove zero live calls. Grep for deleted test names and files (docs, CI, scripts, test lists) and fix stale references. Meet coverage gates with behavior tests, not filler.
7. **Report.** Before → after table (tests, wall time, failures, skips, slowest test), deletions by reason, consolidations, speedups, live seams replaced. End with **Done**, **Optional**, and **Parked** (with reason).

## Delete

Delete, don't skip; git keeps history. No `skip`, `xfail`, commented-out tests, or quarantine. Fix or delete permanently skipped or failing tests; only skips for a genuinely required platform or optional dependency stay. Delete tests that are:

- **Trivial:** getters, setters, constructors, constants, re-exports, framework behavior, anything the type checker guarantees.
- **Weak:** assert only not-null, truthy, type, "doesn't throw", or an unreviewed snapshot — would pass with a broken implementation.
- **Mock theater:** a mock of your own code returns what it was told, or call counts and order.
- **Implementation-coupled:** private helpers, internal state, query shape, exact log/copy/prompt wording. Rewrite to observable behavior if it matters.
- **Duplicate:** keep the cheapest layer that proves it; e2e only for critical journeys lower layers can't prove.
- **Dead path:** code no production entrypoint reaches. Tests proving old data, formats, or migrations still load stay.
- **Improbable:** edge cases outside real inputs or risk areas.
- **Flaky:** fix the cause (time, ordering, shared state) or delete. Never add retries.

Red because it pins obsolete behavior: delete. Red because it exposes a real bug: keep and report. If comments, docs, and code disagree on what a test should assert, check `git log -S` and design docs first.

## Consolidate

- Collapse same-shape cases into parameterized tests.
- Merge tests that repeat expensive setup for one check; in e2e, one journey asserts many things.
- Push e2e and integration checks down to units where the seam allows.
- Aggressively reuse existing factories and fixtures; share expensive setup when isolation allows.
- Consider refactoring test setup project-wide or module-wide when setup is expensive.
- Assert end state with the most specific matcher. Name tests scenario → outcome.
- Look for opportunities to leverage linting, type checking or cheaper places to ensure durability and refactor.

## Speed

- Profile first: slow time usually hides in retry backoff, hard-coded polls, or helper timeouts.
- Fake timers or an injected clock; shrink retry/backoff in test config. Wait on conditions, never time.
- Avoid repeated app boots, browser launches, and migrations. Prefer in-memory stores, transaction rollback, smaller fixtures.
- Run in parallel when tests are isolated.
- If CI jobs exist, these should be aggressively pruned to ensure that deployments to main keep durability, but nightly releases, tagged releases, etc. are where the full suite of tests should run.
- Both should be examined for performance and speed improvements.

## Live services

Default runs never touch real networks, paid APIs, or shared environments.

- Fake at the boundary (HTTP client, SDK adapter) with a local fake, recorded fixtures, or a local emulator. Stub every lane, not just the main path.
- Fail closed: no `.env` or real credentials in tests; block outbound network where the runner allows.
- Delete tests that only prove a third-party service works. Real contract tests move to an opt-in suite outside the default run; give scripts that need them the opt-in.
- Prove it with the network blocked or credentials unset, or by scanning network or cost logs.
