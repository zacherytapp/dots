# Logs and Data

Request JSON when structured output is useful. Keep data synthetic and scoped to the confirmed non-production org.

## Inspect data

```bash
sf data query --query "SELECT Id, Name FROM Account LIMIT 10" --target-org <alias>
sf data query --file query.soql --target-org <alias> --result-format csv --output-file out.csv
sf sobject describe --sobject <object> --target-org <alias> --json
```

For Tooling API objects, include every required context flag:

```bash
sf data query --query "SELECT Id FROM ApexClass WHERE Name='Foo'" \
  --use-tooling-api --target-org <alias> --json
```

Use `sf data export bulk` for large exports. Select only needed fields and use an indexed filter and sensible limit when the investigation allows it.

## Seed and clean up

Use recognizable synthetic data, never real PII. Inspect createable fields before insertion. Track created IDs and remove child records before parents. Prefer existing project seed/cleanup commands; otherwise use scoped `sf data` operations or anonymous Apex. Leave the org as you found it.

## Retrieve logs

```bash
sf apex list log --target-org <alias> --json
sf apex get log --log-id 07L… --target-org <alias> --output-dir ./logs
sf apex tail log --target-org <alias> --color
```

Streaming commands are human output and do not need `--json`.

TraceFlag, DebugLevel, and ApexLog are Tooling API objects:

```bash
sf data query --query "SELECT Id, TracedEntityId, ExpirationDate FROM TraceFlag" \
  --use-tooling-api --target-org <alias> --json
sf data create record --sobject TraceFlag --values "<values>" \
  --use-tooling-api --target-org <alias> --json
```

## Analyze evidence

Apex debug logs can be up to 20 MB. Save the log and inspect it without dumping the whole file into context:

1. entry point and transaction type (`EXECUTION_STARTED`, `CODE_UNIT_STARTED`)
2. `EXCEPTION_THROWN` and `FATAL_ERROR`, including stack context
3. `LIMIT_USAGE` and cumulative limit sections
4. repeated SOQL/DML events with surrounding execution context
5. CPU, heap, and callout evidence

Repeated SOQL or DML lines alone do not prove a loop; establish the call path and source location. Do not invent `LOOP_BEGIN` or iteration events—the Apex log format does not emit them.

Synchronous Apex CPU is 10,000 ms and heap is 6 MB; asynchronous Apex CPU is 60,000 ms and heap is 12 MB. Only heap doubles. Confirm the transaction type and current official limit documentation before diagnosing a limit-sensitive edge case.

Use the REST query-plan endpoint when selectivity matters; do not infer selectivity solely from row count.
