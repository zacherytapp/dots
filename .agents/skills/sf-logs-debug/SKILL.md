---
name: sf-logs-debug
description: Diagnoses Salesforce Apex debug logs from concrete execution evidence. Use when a debug log, governor limit, Apex stack trace, slow SOQL, CPU pressure, or heap pressure needs root-cause analysis. Not for running tests or implementing fixes.
metadata:
  version: "3.0"
  cliTools:
    - tool: ["sf"]
      semver: ">=2.0.0"
---

# Diagnose Salesforce Apex Logs

This is an evidence-only diagnostic workflow. Explain remediation direction, but do not generate or apply code fixes. Hand implementation to `sf-implement` and test execution to the caller's testing workflow.

## Gather

Identify the target org, failing transaction or user flow, time window, relevant user/record/request ID, and whether the supplied log is complete. Never change trace flags or delete logs without explicit authorization.

## Workflow

1. **Retrieve** a specific log with the commands in [cli-commands.md](references/cli-commands.md).
2. **Establish context:** entry point, transaction type, user, operation, status, and whether the log reached a normal end or was truncated.
3. **Read failures:** trace `EXCEPTION_THROWN` and `FATAL_ERROR` through stack and code-unit context.
4. **Read limits:** use `LIMIT_USAGE` and cumulative sections; distinguish synchronous from asynchronous limits.
5. **Trace expensive work:** correlate SOQL, DML, method, heap, workflow, Flow, and callout events with source lines and execution context.
6. **Classify:** Critical for runtime failure or hard-limit/corruption risk; Warning for evidence-backed near-limit or slow paths; Info for lower-risk observations.
7. **Report:** what, where, why, evidence, severity, remediation direction, and how a caller can verify after implementing a fix.

## Evidence rules

- Cite exact log events and relevant surrounding context for every finding.
- Repeated SOQL or DML events alone do not prove a loop. Establish the repeated execution path and source location.
- Apex logs do not emit `LOOP_BEGIN`, `LOOP_END`, `ITERATION_BEGIN`, or `ITERATION_END` events.
- Apex debug logs can be up to 20 MB. If a log is truncated, lower noisy categories and recapture the smallest useful transaction.
- Synchronous Apex CPU is 10,000 ms and heap is 6 MB. Asynchronous Apex CPU is 60,000 ms and heap is 12 MB; only heap doubles.
- A zero-row single-record SOQL assignment throws `QueryException`; it is not a null pointer, and safe navigation does not prevent the query exception.
- Confirm version-sensitive limits, event semantics, and retention against current official Salesforce documentation rather than memory.

## References

- [cli-commands.md](references/cli-commands.md) — retrieval and authorized Tooling API operations
- [debug-log-reference.md](references/debug-log-reference.md) — verified event families and analysis cautions
- [log-analysis-tools.md](references/log-analysis-tools.md) — CLI and visual inspection workflows
