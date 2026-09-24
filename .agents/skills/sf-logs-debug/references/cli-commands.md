# Salesforce CLI Debug Commands

Request JSON when parsing structured output. Streaming and raw-log commands use human/text output.

## Retrieve logs

```bash
sf apex list log --target-org <alias> --json
sf apex get log --log-id <07L-id> --target-org <alias>
sf apex get log --log-id <07L-id> --target-org <alias> --output-dir ./logs
sf apex tail log --target-org <alias> --color
```

`--output-dir` saves retrieved logs. Shell redirection is also valid for a single log:

```bash
sf apex get log --log-id <07L-id> --target-org <alias> > debug.log
```

Do not use `-o debug.log`; `-o` means `--target-org`, not output file.

## Tooling API objects

ApexLog, TraceFlag, and DebugLevel are Tooling API objects. Queries and mutations must include `--use-tooling-api`, an explicit target org, and JSON when the result will be parsed.

```bash
sf data query \
  --query "SELECT Id, StartTime, Operation, Status, LogLength FROM ApexLog ORDER BY StartTime DESC LIMIT 20" \
  --use-tooling-api --target-org <alias> --json

sf data query \
  --query "SELECT Id, TracedEntityId, DebugLevelId, StartDate, ExpirationDate, LogType FROM TraceFlag" \
  --use-tooling-api --target-org <alias> --json

sf data query \
  --query "SELECT Id, DeveloperName, ApexCode, ApexProfiling, Callout, Database, System, Workflow FROM DebugLevel" \
  --use-tooling-api --target-org <alias> --json
```

Create or delete these records only with explicit authorization:

```bash
sf data create record --sobject TraceFlag --values "<values>" \
  --use-tooling-api --target-org <alias> --json
sf data delete record --sobject TraceFlag --record-id <7tf-id> \
  --use-tooling-api --target-org <alias> --json
sf data delete record --sobject ApexLog --record-id <07L-id> \
  --use-tooling-api --target-org <alias> --json
```

Use timestamps derived from the current investigation; never copy stale example dates. Keep trace windows short and identify the exact traced entity.

## Query plans

`sf data query --use-tooling-api` does not explain an ordinary SOQL query. Use the REST query-plan endpoint with a URL-encoded SOQL statement and the confirmed API version:

```bash
sf api request rest '/services/data/vXX.X/query/?explain=<url-encoded-soql>' \
  --target-org <alias>
```

## Focused text inspection

```bash
rg -n "EXCEPTION_THROWN|FATAL_ERROR" debug.log
rg -n -A 12 "FATAL_ERROR" debug.log
rg -n "LIMIT_USAGE|CUMULATIVE_LIMIT_USAGE" debug.log
rg -n "SOQL_EXECUTE_(BEGIN|END)|DML_(BEGIN|END)" debug.log
rg -n "CPU_TIME|HEAP_(ALLOCATE|DEALLOCATE|SIZE)" debug.log
rg -n "CALLOUT_|NAMED_CREDENTIAL" debug.log
```

Counts and duplicates are leads, not conclusions. Read surrounding code-unit, method, line, Flow, and workflow events before attributing the operation to a loop or specific source.

No hook or companion skill automatically analyzes these commands. The agent retrieves the log, reads it, and reports evidence explicitly.
