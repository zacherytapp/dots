---
name: test-prune
description: Aggressively prunes, consolidates, and speeds up unit, integration, and e2e tests in a file, package, or whole project, deleting low-value tests and cutting live-service calls while keeping real coverage. Use when the user wants fewer or faster tests, a slow or flaky suite cleaned up, or test bloat removed.
disable-model-invocation: true
---

# test-prune

A suite must tell the truth about production, cheaply. Aim for **fewer, faster tests that would catch the same production bugs**. Every surviving test answers "what real bug does this catch that no cheaper test does?" Measure; never guess.

## Scope and roles

Scope is what the user names: one file, a package or directory, or the whole project (the default).

- **Coordinator (you):** baseline, partition, approve the plan, review every diff, verify, report.
- **Scouts:** read-only, on the cheapest fast model available. They inventory, time, and classify. Run them in parallel, one per unit: a file for small scopes, a package or directory for a project. Add one cross-cutting scout for runner config, CI, scripts, harness helpers, and live-service seams.
- **Refactorers:** on the most capable model available. They edit tests, fixtures, and test harness code. One unit each, on disjoint files, in parallel.

A single small file needs no fan-out. Without subagents, do each role yourself in order.

## Workflow

1. **Orient.** Read the project's agent instructions (`AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`), the test runner config, and CI. Find every caller of the test commands: CI jobs, release scripts, hooks, and explicit test lists.
2. **Baseline.** Before running anything, make sure the run can't reach live services (see [Live services](#live-services)). Run the in-scope suite once with per-test timing (`--durations`, `--reporter=verbose`, or equivalent). Record wall time, collected, passed, failed, and skipped counts, and the 20 slowest tests. Note failures that already exist.
3. **Scout.** Each scout returns a table, one row per test: `test | behavior proved (one line) | verdict | reason | evidence`. Verdicts: `keep`, `delete`, `merge → <target>`, `rewrite`, `push down` (move to a cheaper layer), `speed up`, or `fake service`. Evidence names the production code covered, the duplicate test, or the measured cost. Scouts also flag skipped, disabled, or quarantined tests; git-ignored test files the runner still collects; sleeps, retries, polling, and timeouts; and any real network, credentials, or `.env` loading.
4. **Plan.** Merge the tables. Use the behavior column to find duplicates across units, which no single scout can see. Spot-check verdicts against the code, upgrading timid `keep`s as well as rejecting bad `delete`s. Before editing CI, release scripts, or what a shared test command runs, confirm with the user.
5. **Refactor.** Give each refactorer its unit's approved rows and this skill's rules. It applies them, runs its unit's tests until they pass, and reports files changed, tests before → after, and time before → after.
6. **Verify.** Read every diff yourself; subagents quietly weaken assertions. Re-run the in-scope suite and compare against the baseline. Prove there were zero live calls. Grep the repo for deleted test names and files (docs, CI, scripts, test lists, design docs that cite test titles) and fix stale references. Coverage gates still apply; meet them with behavior tests, not filler.
7. **Report.** A before → after table (tests, wall time, failures, skips, slowest test), deletions grouped by reason, consolidations, speedups, and live seams replaced. Close with three piles: **Done**, **Optional**, and **Parked** (with the reason).

## Delete

Delete, don't skip. Git keeps the history. Skip markers, `xfail`, `.skip`, commented-out tests, and a "quarantine" teach people to ignore red. A permanently skipped or failing test gets fixed now or deleted. Only a skip for a platform or optional dependency the test genuinely needs may stay. Delete:

- **Trivial:** getters, setters, constructors, constants, re-exports, framework or library behavior, and anything the type checker already guarantees.
- **Weak:** asserts only not-null, truthy, type, "doesn't throw", or a snapshot nobody reviews. Would it still pass with a broken implementation? Then it tests nothing.
- **Mock theater:** asserts that a mock of your own code returned what it was told, or checks call counts and order.
- **Implementation-coupled:** private helpers, internal state, query shape, exact log, copy, or prompt wording. Rewrite to observable behavior if the behavior matters.
- **Duplicate:** the same behavior proved at several layers. Keep the cheapest layer that proves it. Keep e2e only for critical user journeys that lower layers can't prove.
- **Dead path:** drives code no production entrypoint reaches (deprecated or experimental implementations). Tests that prove old data, formats, or migrations still load guard production and stay.
- **Improbable:** edge cases outside real inputs or risk areas.
- **Flaky without a fix:** fix the cause (time, ordering, shared state) or delete. Never add retries.

A test that is red because it pins obsolete behavior goes. A test that is red because it exposes a real bug stays, and you report it.

## Consolidate and refactor

- Collapse same-shape cases into one table-driven or parameterized test.
- Merge tests that repeat expensive setup to check one scenario into a single test with several assertions. In e2e, one journey checks many things instead of N logins.
- Push e2e and integration checks down to unit tests wherever the seam allows.
- Replace copy-pasted setup with the project's existing factories and fixtures, and share expensive setup per file or suite when isolation allows.
- Assert end-state outcomes with the most specific matcher available. Name each test as scenario → outcome.

## Speed

- Measure before you fix. A slow test's time is usually elsewhere: retry backoff, a hard-coded poll, or a timeout in a helper. Spy on sleep or use a profiler to find it.
- Use fake timers or an injected clock, and shrink retry and backoff settings in test config. Wait on conditions, never on time.
- Avoid repeated app boots, browser launches, and migrations. Prefer in-memory stores, transaction rollback, and smaller fixtures.
- Enable parallel runs when the tests are isolated.

## Live services

Default test runs never touch real networks, paid APIs, or shared environments.

- Fake at the boundary seam (HTTP client, SDK adapter) with a local fake, recorded fixtures, or a local emulator or container. Stub every lane, not just the main path.
- Make the harness fail closed: don't load `.env` or real credentials in tests, and block outbound network where the runner allows it.
- A test that only proves a third-party service works gets deleted. If one genuinely guards an integration contract, move it to an explicit opt-in suite outside the default run, and give any script that needs it the opt-in.
- Prove it: run with the network blocked or credentials unset, or scan network or cost logs.

## Pitfalls

- Git-ignored is not uncollected. The runner reads the filesystem, so check what it actually collects.
- Changing the default test command silently changes what CI and release scripts run.
- A subagent's "fixed" can hide a changed assertion. Diffs, not summaries, are the source of truth.
- When two conflicting sources disagree on what a test should assert (a comment, a doc, the code), check `git log -S` and the design docs before you move the test.
