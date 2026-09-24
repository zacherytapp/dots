---
name: sf-org-manage
description: Create Salesforce scratch orgs and snapshots, and open orgs through the sf CLI. Use when asked to spin up an org, take a snapshot, open an org, or get its URL. Not for switching defaults or deploying metadata.
metadata:
  version: "1.0"
  minApiVersion: "60.0"
  cliTools:
    - tool: ["sf"]
      semver: ">=2.0.0"
---

# Manage Salesforce Orgs

Run these operations directly rather than generating scripts for the user. Use the `sf` CLI; request `--json` when the command supports it and structured output is useful. Streaming or browser-opening commands need not use JSON.

## Create a scratch org

**1. Pick the creation method** from the request:

| Signal                               | Method                            |
| ------------------------------------ | --------------------------------- |
| "definition file", or a `.json` path | `--definition-file <path>`        |
| "snapshot", "from snapshot"          | `--snapshot <name>`               |
| "org shape", "source-org"            | `--source-org <15-char-shape-id>` |
| none of the above                    | see below                         |

With no signal, look for a definition file — `ls config/project-scratch-def.json config/scratch-def.json 2>/dev/null | head -1`. Use it if found, otherwise fall back to `--edition developer`.

**2. Confirm a Dev Hub** with `sf config get target-dev-hub --json`. If none is set, stop and ask the user what the default Dev Hub should be before proceeding - and advise `sf org login web --set-default-dev-hub`.

**3. Create it:**

```bash
sf org create scratch <method-flag> --target-dev-hub <alias> --alias <name> --json
```

Add when asked: `--duration-days <n>` (default 7, max 30), `--set-default`, `--no-track-source` (CI/CD).

**4. Report** the alias, username, and org ID from the result. Don't suggest verification steps — if you want the full org record, `sf org list --json` returns it under `result.scratchOrgs`.

Errors: "Snapshot not found" → list them with `sf org list snapshot --target-dev-hub <alias>`. "No default Dev Hub" → `sf org login web --set-default-dev-hub`.

## Create a snapshot

Needs a source scratch org (ID or alias) and a unique snapshot name; description optional. Use the Dev Hub the user names, else the default from `sf config get target-dev-hub --json`.

```bash
sf org create snapshot --source-org <orgId-or-alias> --name <SnapshotName> \
  [--description "<desc>"] --target-dev-hub <devHub> --json
```

Returns `SnapshotId` and `Status`; report both.

Errors: `NOT_FOUND` → the Dev Hub doesn't have the snapshot feature enabled. "Snapshot name already exists" → pick a different name.

## Open an org

| Goal                    | Command                                   |
| ----------------------- | ----------------------------------------- |
| Default org             | `sf org open --json`                      |
| Specific org            | `sf org open --target-org <alias> --json` |
| Specific browser        | `sf org open --browser chrome --json`     |
| Incognito               | `sf org open --private --json`            |
| Navigate to a path      | `sf org open --path '<path>' --json`      |
| URL only, don't open    | `sf org open --url-only --json`           |
| Open supported metadata | `sf org open --source-file <path> --json` |

`--source-file` supports ApexPage, FlexiPage, Flow, and Agent metadata in the installed CLI. Use `--path` for other setup pages.

Errors: "no target org" → specify `--target-org <alias>` or, only when the user wants a default change, run `sf config set target-org <alias>`. Auth error → `sf org login web --alias <alias>`.

## References

Load only when the summary above isn't enough:

| File                                                                | Read when                                                              |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [definition_file_options.md](references/definition_file_options.md) | Configuring org features, settings, or advanced definition file fields |
| [edition_types.md](references/edition_types.md)                     | Choosing between editions or explaining the differences                |
| [snapshot_usage.md](references/snapshot_usage.md)                   | Using snapshots in definition files, or post-snapshot workflow         |
| [creating-scratch-org.md](references/creating-scratch-org.md)       | Scratch org creation is failing, or you need the full workflow         |
| [creating-snapshot.md](references/creating-snapshot.md)             | Snapshot creation is failing, or you need the full workflow            |
| [cli_flags.md](references/cli_flags.md)                             | Full snapshot CLI flag reference                                       |
| [opening-org.md](references/opening-org.md)                         | Setup paths, opening metadata files, advanced open flags               |

Sample command output for troubleshooting lives in [examples/](examples/README.md): `scratch-orgs/` covers success via definition file, edition, and snapshot plus `error_no_devhub` and `error_timeout` (exit 69); `snapshots/` covers `success_output` and `error_output`.
