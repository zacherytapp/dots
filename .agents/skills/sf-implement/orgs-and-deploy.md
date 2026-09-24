# Orgs, Reconcile, and Deploy

This skill works only with scratch orgs and sandboxes. It does not deploy production, build packages, create package versions, or perform quick deploys. See the [implementation boundaries](boundaries.md).

Request JSON when a command supports it and structured output is useful.

## Confirm the target

```bash
sf config get target-org --json
sf config get target-dev-hub --json
sf org list --json
sf org display --target-org <alias> --json
```

State alias, username, and type before acting. Production and Dev Hub targets are stop conditions. `SF_TARGET_ORG` can override project configuration.

## Create a scratch org

Use `sf-org-manage` after confirming the Dev Hub. Creation sources are mutually exclusive:

| Source          | Flag                              |
| --------------- | --------------------------------- |
| Definition file | `--definition-file <path>`        |
| Snapshot        | `--snapshot <name>`               |
| Org shape       | `--source-org <15-char-shape-id>` |
| Simple default  | `--edition developer`             |

```bash
sf org create scratch --definition-file config/project-scratch-def.json \
  --target-dev-hub <hub> --alias <name> --duration-days <n> --json
```

The command waits by default. On an async request or timeout, resume with the returned job ID. Assign only required permission sets.

## Open supported metadata

```bash
sf org open --target-org <alias> --json
sf org open --path '/lightning/setup/ObjectManager/home' --target-org <alias> --json
sf org open --source-file <path> --target-org <alias> --json
```

`--source-file` supports ApexPage, FlexiPage, Flow, and Agent metadata in the installed CLI. Use `--path` for other setup pages.

## Reconcile inside the feature worktree

```bash
sf project retrieve preview --target-org <alias> --json
sf project retrieve start --metadata 'ApexClass:Account*' --target-org <alias> --json
sf project retrieve start --source-dir <package-path> --target-org <alias> --json
sf project retrieve start --manifest manifest/package.xml --target-org <alias> --json
```

Retrieve only affected metadata after the worktree exists. Inspect source conflicts; never bulldoze them with `--ignore-conflicts`. Commit legitimate drift separately on the feature branch.

## Deploy to scratch orgs and sandboxes

```bash
# Iteration
sf project deploy start --source-dir <scoped-source> --target-org <alias> --json

# Final non-production validation
sf project deploy start --dry-run --source-dir force-app \
  --test-level RunLocalTests --target-org <alias> --json

# Deploy the same scope after a successful dry run
sf project deploy start --source-dir force-app --target-org <alias> --json
```

Do not use `sf project deploy validate`; that command creates a production quick-deploy job and is not the sandbox validation workflow. Never proceed past failing tests or unresolved retrieve conflicts.

Deploy dependencies in order: objects/fields → permission sets → Apex → draft Flows → activation. Scope non-source-tracked targets with `--source-dir`, `--metadata`, or `--manifest`.
