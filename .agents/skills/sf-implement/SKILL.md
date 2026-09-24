---
name: sf-implement
description: Implements Salesforce work from a spec or tickets, reconciling org state and validating via the sf CLI. Use when implementing Apex, LWC, Flow, or metadata changes.
disable-model-invocation: true
---

# Implement Salesforce Work

Use the `sf` CLI and request JSON when the command supports it and structured output is useful. Read [boundaries.md](boundaries.md) before acting. Detailed commands live in:

- [orgs-and-deploy.md](orgs-and-deploy.md)
- [testing.md](testing.md)
- [static-analysis.md](static-analysis.md)
- [logs-and-data.md](logs-and-data.md)

## 1. Clarify the target

Require a clear plan, target base branch, base repository, and allowed scratch org or sandbox. Resolve repository facts from provider metadata or project configuration; ask when ambiguity would change the implementation.

## 2. Start from the resolved base

Determine the remote for the base repository; do not assume `origin`. Fetch the base, record its SHA, and create the feature worktree from the fetched ref:

```bash
git fetch <base-remote> <base>
git rev-parse FETCH_HEAD
git worktree list
git worktree add .worktrees/<slug> -b <branch> FETCH_HEAD
cd .worktrees/<slug>
```

Use the repository's preferred worktree location. If `.worktrees/` is used, ensure it is ignored without mixing that housekeeping change into feature work; otherwise choose an ignored external location. Make every source, retrieve, test-output, and commit change inside this worktree.

## 3. Confirm the target org

Show the configured target and confirm alias, username, and type with `sf config get target-org --json`, `sf org list --json`, and `sf org display --target-org <alias> --json`. Develop and deploy only to a confirmed scratch org or sandbox. Production and Dev Hub targets are stop conditions.

If no allowed org exists, use `sf-org-manage` to create one after confirming the Dev Hub. Assign only required permission sets.

## 4. Reconcile inside the worktree

Run `sf project retrieve preview`, then retrieve only metadata the change will touch. Never use `--ignore-conflicts` to overwrite work. If retrieved org drift is legitimate, inspect it and commit it separately on the feature branch before implementation. Stop when org and source disagree in a way the user must decide.

## 5. Plan and implement

Follow project conventions, ADRs, Code Analyzer configuration, [code-conventions.md](code-conventions.md), and the repository's domain vocabulary. Project rules supersede defaults in this skill. Design for [deep modules](../implement/deep-modules.md) and [testability](interface-design.md).

Implement one vertical task at a time and deploy dependencies in order: objects/fields → permission sets → Apex → draft Flows → activation. Use additional agents only when available and tasks are independent; otherwise work sequentially in the current agent.

## 6. Validate and deploy

Use focused Jest, lint, Code Analyzer, data inspection, logs, and targeted Apex tests while iterating. Run the final regression gate once. For an allowed non-production target, validate with a dry run, then deploy the same scoped source:

```bash
sf project deploy start --dry-run --source-dir force-app \
  --test-level RunLocalTests --target-org <alias> --json
sf project deploy start --source-dir force-app --target-org <alias> --json
```

Do not use `sf project deploy validate`; it is a production quick-deploy workflow. Do not deploy past failed tests or unresolved source conflicts.

## 7. Commit and hand off

Confirm the feature branch and inspect staged paths before focused commits. Report the base and starting SHA, target org, retrieve commit, implementation commits, tests, coverage, dry-run result, and remaining risks. Hand off to `file-pr` when a PR is requested.

Do not create or monitor the PR, review it, deploy production, build packages, or merge.
