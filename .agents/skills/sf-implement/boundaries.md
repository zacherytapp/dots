# Salesforce implementation boundaries

Read before implementation. These constraints are absolute.

## Valid outcomes

1. Implement and commit Salesforce source on a feature branch in a dedicated worktree.
2. Dry-run and deploy validated source to a confirmed sandbox.
3. Dry-run and deploy validated source to a confirmed scratch org.

Never deploy to production, package metadata, edit package configuration, or target a Dev Hub for development/deployment. A ticket mentioning production or packaging is not authorization.

## Stop and ask

- The target org or release path is ambiguous.
- Any path leads to production or the Dev Hub.
- A scratch org is needed but no approved Dev Hub is available.
- Org changes would be overwritten by retrieve/reconcile.
- Referenced metadata is absent or local and org state disagree irreconcilably.
- The ticket asks for production deployment, packaging, or package creation.

## Red flags

- Using an unconfirmed org, production, or the Dev Hub.
- Working in the primary checkout, on the resolved base branch, or detached; committing the worktree directory.
- Ignoring source conflicts or assuming local source matches the org.
- Skipping relevant tests, final regression validation, or repository assertion conventions.
- Running `RunLocalTests` per task, separate coverage-only runs, or unchanged green tests again.
- Skipping cheap checks such as queries, Jest, linting, Code Analyzer, and browser inspection.
- Creating throwaway scripts when the `sf` CLI or repository tools suffice.
- Leaving seeded data, accepting coverage below 75%, or deploying past failures.
- Running `sf package` or editing package settings.
- Mixing unrelated changes or continuing with unresolved blockers.
