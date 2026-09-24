# Opening Salesforce Orgs

Use `sf org open` to open an authenticated org, print a frontdoor URL, navigate to a Lightning path, or open a supported metadata type in its builder.

## Common commands

```bash
sf org open --target-org <alias>
sf org open --target-org <alias> --browser chrome
sf org open --target-org <alias> --private
sf org open --target-org <alias> --url-only --json
sf org open --target-org <alias> --path '/lightning/setup/ObjectManager/home'
```

Use `--json` for URL-only or other structured-output workflows. It is optional when the purpose is simply to launch a browser.

## Paths

Examples:

```bash
sf org open --target-org <alias> --path '/lightning/setup/SetupOneHome/home'
sf org open --target-org <alias> --path '/lightning/setup/ObjectManager/home'
sf org open --target-org <alias> --path '/lightning/o/Account/list'
sf org open --target-org <alias> --path '/lightning/o/Report/home'
```

Use the path supplied by the user or confirmed from Salesforce navigation; setup routes and permissions vary.

## Supported source files

The installed CLI supports `--source-file` for:

- ApexPage → Visualforce editor
- FlexiPage → Lightning App Builder
- Flow → Flow Builder
- Agent metadata → Agent Builder

```bash
sf org open --target-org <alias> \
  --source-file force-app/main/default/flexipages/Account_Record_Page.flexipage-meta.xml
sf org open --target-org <alias> \
  --source-file force-app/main/default/flows/MyFlow.flow-meta.xml
```

Do not use `--source-file` for ApexClass or CustomObject metadata. Use an appropriate `--path` instead. Read package directories from `sfdx-project.json`; do not assume `force-app/main/default`.

`--path` and `--source-file` are mutually exclusive. Supported metadata generally must already exist in the target org.

## Troubleshooting

| Problem                      | Response                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| No target org                | Add `--target-org <alias>`; change the default only when the user asks                                 |
| Authentication error         | Reauthenticate with `sf org login web --alias <alias>`                                                 |
| Builder cannot find metadata | Confirm the type is supported and deployed; deploy its containing source directory or use `--metadata` |
| URL printed but browser shut | Remove `--url-only`                                                                                    |
| Path returns 404             | Verify the route, metadata identity, feature license, and user permissions                             |

`sf project deploy start` has no `--source-file` flag. To deploy one component, use its containing `--source-dir` or an exact `--metadata Type:Name` selector.
