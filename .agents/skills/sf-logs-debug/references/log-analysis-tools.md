# Log Analysis Tools

## SF CLI and ripgrep

Retrieve a raw log, save it, then inspect focused slices:

```bash
sf apex get log --log-id <07L-id> --target-org <alias> --output-dir ./logs
rg -n "EXCEPTION_THROWN|FATAL_ERROR" ./logs/*.log
rg -n "LIMIT_USAGE|CUMULATIVE_LIMIT_USAGE" ./logs/*.log
rg -n "SOQL_EXECUTE_(BEGIN|END)|DML_(BEGIN|END)" ./logs/*.log
```

Use surrounding lines and source inspection. Counts and repeated lines are investigation leads, not proof of loops or causality.

## Apex Log Analyzer

If already available, the Apex Log Analyzer VS Code extension can visualize a saved log as a timeline or call tree. Treat the visualization as a navigation aid and cite the underlying log events in the diagnosis. Do not install extensions without user approval.

Save a log correctly with `--output-dir` or shell redirection:

```bash
sf apex get log --log-id <07L-id> --target-org <alias> > debug.log
```

Do not pass a filename to `-o`; that flag selects the target org.

## Developer Console

The Developer Console log inspector and query-plan UI can provide interactive context when the user prefers browser tools. Confirm that the viewed log matches the failing user, operation, and time window.

## Choosing a tool

| Need                       | Tool                                 |
| -------------------------- | ------------------------------------ |
| Reproducible text evidence | SF CLI + ripgrep                     |
| Call-tree navigation       | Apex Log Analyzer, if present        |
| Interactive org inspection | Developer Console                    |
| Query selectivity          | REST query plan or Developer Console |

No tool replaces transaction tracing. Always connect a conclusion to the raw event, source line, and execution context.
