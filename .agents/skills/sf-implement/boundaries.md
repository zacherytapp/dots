# Salesforce implementation boundaries

Read before implementation. These constraints are absolute.

## Valid outcomes

1. Implement and commit Salesforce source on a feature branch in a worktree under `.worktrees/`.
2. Dry-run and deploy validated source to a confirmed sandbox.
3. Dry-run and deploy validated source to a confirmed scratch org.

Never deploy to production, package metadata, edit package configuration, promote a package version, or target a Dev Hub for development/deployment. A ticket mentioning production or packaging is not authorization.

## Stop and ask

- The target org or release path is ambiguous.
- Any path leads to production or the Dev Hub.
- A scratch org is needed but no approved Dev Hub is available.
- Org changes would be overwritten by retrieve/reconcile.
- Referenced metadata is absent or local and org state disagree irreconcilably.
- The ticket asks for production deployment, packaging, or package creation.
- Parallel tickets need more scratch orgs than the user approved.

## Red flags

- Using an unconfirmed org, production, or the Dev Hub.
- Two agents deploying to or testing in the same org at once, or changing the default `target-org` while others work.
- Working in the primary checkout, on the resolved base branch, or detached; committing the worktree directory.
- Ignoring source conflicts or assuming local source matches the org.
- Skipping the tests a ticket lists, final regression validation, or the `Assert` class for new assertions.
- Writing tests beyond what the acceptance criteria, introduced risks, and coverage bar need.
- Running `RunLocalTests` per ticket, separate coverage-only runs, or unchanged green tests again.
- Skipping cheap checks such as queries, Jest, linting, Code Analyzer, and browser inspection.
- Creating throwaway scripts when the `sf` CLI or repository tools suffice.
- Leaving seeded data, accepting coverage below 75%, or deploying past failures.
- Running `sf package`, `sf project deploy validate`, or `quick`, or editing package settings.
- Mixing unrelated changes or continuing with unresolved blockers.
