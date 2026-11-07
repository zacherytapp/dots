---
name: sf-implement
description: Extends implement with Salesforce org confirmation, source reconciliation, scoped deploys, and Apex test rules. Use when implementing Apex, LWC, Flow, or metadata changes from a spec or tickets.
disable-model-invocation: true
---

# Implement Salesforce Work

Extend [implement](../implement/SKILL.md); don't replace its setup, `.worktrees/` layout, ticket graph, minimal-test rules, or finish. Read that skill first, then apply this one. Read [boundaries.md](boundaries.md) before acting. Command detail lives in:

- [orgs-and-deploy.md](orgs-and-deploy.md)
- [testing.md](testing.md)
- [static-analysis.md](static-analysis.md)
- [logs-and-data.md](logs-and-data.md)

Use the `sf` CLI, pass `--target-org <alias>` on every org command, and request JSON when structured output is useful.

## 1. Confirm the org

After `implement`'s setup, confirm the target with `sf config get target-org --json`, `sf org list --json`, and `sf org display --target-org <alias> --json`. State its alias, username, and type. Develop and deploy only in a confirmed scratch org or sandbox; production and the Dev Hub are stop conditions. If no allowed org exists, use `sf-org-manage` after confirming the Dev Hub. Assign only required permission sets.

## 2. Reconcile inside the worktree

Run `sf project retrieve preview`, then retrieve only the metadata the change touches. Never use `--ignore-conflicts`. Inspect legitimate org drift and commit it separately on the branch before implementing. Stop when org and source disagree in a way the user must decide.

## 3. One org per agent

An org is shared state: two agents must never deploy to or run tests in the same org at once.

- When tickets run in parallel, give each implementer its own confirmed scratch org and pass the alias in its pointers. Scratch orgs count against Dev Hub allocations, so confirm the number with the user before creating them.
- With only one org (any sandbox, or a single scratch org), work the frontier sequentially.
- Never change the default `target-org` or `target-dev-hub` config while other agents are working.
- Run the final gate in the integration worktree against the primary confirmed org.

## 4. Implement each ticket

Follow project conventions, ADRs, Code Analyzer configuration, [code-conventions.md](code-conventions.md), and the glossary. Design for [deep modules](../implement/code-conventions.md#design) and [testability](interface-design.md). Deploy dependencies in order: objects and fields → permission sets → Apex → draft Flows → activation.

Iterate with focused Apex tests, Jest, lint, and Code Analyzer ([testing.md](testing.md)). Never run `RunLocalTests` per ticket.

## 5. Tests

Apply `implement`'s Tests rules, then these Salesforce requirements, each only when the change introduces the risk:

- A bulk test at the cardinality that crosses the limit at risk when a per-record path changes.
- A `System.runAs` test when sharing, CRUD, or FLS behavior changes.
- `Test.setMock` for every callout path; no `SeeAllData=true`.
- The `Assert` class for new or changed assertions, expected value first, with a message.
- Changed classes meet the repository's coverage bar (75% minimum) through behavior tests, never filler.

Delete seeded data when done.

## 6. Final gate and deploy

Once, in the integration worktree, dry-run with coverage, then deploy the same scope:

```bash
sf project deploy start --dry-run --source-dir force-app \
  --test-level RunLocalTests --target-org <alias> --json
sf project deploy start --source-dir force-app --target-org <alias> --json
```

Never use `sf project deploy validate` or `quick`; they are the production quick-deploy workflow. Never deploy past failed tests or unresolved conflicts.

## 7. Finish

Report everything `implement` reports, plus the target orgs, the drift commit, test and coverage results, and the dry-run result. Delete scratch orgs created for parallel tickets only after retrieving their changes and with the user's confirmation.

Never deploy to production, build or promote packages, or create, review, or merge the PR.
