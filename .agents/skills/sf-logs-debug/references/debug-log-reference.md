# Apex Debug Log Reference

Use current official Salesforce documentation when exact event payloads or limits are material. Event availability and detail depend on category levels and transaction type.

## General shape

Apex log lines commonly contain a timestamp, nanosecond counter, event identifier, source line, and event-specific fields separated by `|`. Do not assume every event has the same payload shape.

## Useful event families

| Purpose             | Events or sections                                                                   |
| ------------------- | ------------------------------------------------------------------------------------ |
| Transaction context | `EXECUTION_STARTED`, `EXECUTION_FINISHED`, `CODE_UNIT_STARTED`, `CODE_UNIT_FINISHED` |
| Apex calls          | `METHOD_ENTRY`, `METHOD_EXIT`, constructor events                                    |
| Queries             | `SOQL_EXECUTE_BEGIN`, `SOQL_EXECUTE_END`, SOSL events                                |
| Data changes        | `DML_BEGIN`, `DML_END`                                                               |
| Exceptions          | `EXCEPTION_THROWN`, `FATAL_ERROR`                                                    |
| Limits              | `LIMIT_USAGE`, `LIMIT_USAGE_FOR_NS`, `CUMULATIVE_LIMIT_USAGE`                        |
| Memory              | `HEAP_ALLOCATE`, `HEAP_DEALLOCATE`, heap entries in limit sections                   |
| Automation          | workflow, validation, Flow, and code-unit events as emitted                          |
| Callouts            | callout and named-credential events available at configured levels                   |

Apex logs do **not** emit `LOOP_BEGIN`, `LOOP_END`, `ITERATION_BEGIN`, or `ITERATION_END`.

## Analysis cautions

- The same SOQL/DML event repeated at one source line suggests repeated execution, but does not prove a loop. Correlate code-unit and method context and inspect the source.
- A large row count does not by itself prove a non-selective query. Use query-plan evidence and object cardinality.
- A source line in a stack trace can be a downstream symptom. Walk the full user-code and automation path.
- A zero-row single-record query assignment raises `QueryException`. A later null dereference is a separate event and diagnosis.
- Limit snapshots can include work consumed before the visible code path. Attribute cost only when surrounding events support it.
- Missing end events can indicate truncation or abrupt termination; do not fabricate the omitted path.

## Limits relevant to common Apex transactions

| Limit     | Synchronous | Asynchronous |
| --------- | ----------- | ------------ |
| CPU time  | 10,000 ms   | 60,000 ms    |
| Heap size | 6 MB        | 12 MB        |

Other limits depend on transaction type and namespace. Read the values emitted in the log and confirm edge cases against current official governor-limit documentation. Only heap doubles between the values above; asynchronous CPU is six times the synchronous value.

## Truncation and retention

Apex debug logs can be up to 20 MB. When the captured log is truncated, reduce noisy categories and reproduce the smallest transaction that retains the needed events. Do not rely on a fixed retention interval from this reference; list available logs in the target org and save evidence needed for the investigation.

## Review order

1. Confirm entry point, transaction type, user, operation, and completeness.
2. Locate fatal errors and exception stacks.
3. Read cumulative and point-in-time limit usage.
4. Correlate repeated queries/DML with source and execution context.
5. Trace CPU, heap, Flow/workflow, and callout hotspots.
6. Separate proven root causes from hypotheses requiring another capture.
