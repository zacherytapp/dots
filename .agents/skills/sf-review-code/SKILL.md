---
name: sf-review-code
description: Extends strict code review with governor limits, bulk safety, security, tests, and platform-capability checks. Use when reviewing Salesforce PRs, Apex, triggers, LWC, Flow, metadata, integrations, or architecture changes.
---

# Salesforce Code Review

Extend `review-code`; do not weaken or replace any of its standards, mechanics, ledger reconciliation, capability-based orchestration, or approval bar. Load that skill first, then apply this skill.

## Scope

Pin the diff exactly as `review-code` requires. Review only that diff, but inspect callers, automation, metadata, and existing utilities needed to establish transaction-wide behavior. Treat Apex, Flow, triggers, invocable actions, and downstream automation as one governor-limit and order-of-execution surface.

Run three independent axes, in parallel when the harness supports it and otherwise sequentially:

1. **Standards axis** from `review-code`.
2. **Spec axis** from `review-code`.
3. **Salesforce axis** using [checklist.md](checklist.md). Organize reasoning around Well-Architected: Trusted, Easy, Adaptable.

Every finding must cite concrete code and explain the failing cardinality, limit, permission boundary, transaction behavior, or platform capability. Do not flag a keyword from grep without tracing its execution context.

## Mandatory Investigation

1. Read `AGENTS.md`, project conventions, `sfdx-project.json`, Code Analyzer config, and relevant metadata.
2. Search the diff and transitive paths for SOQL, SOSL, DML, callouts, async enqueues, event publication, email, and expensive describe operations inside explicit or hidden loops.
3. Trace entry points with 0, 1, and bulk records. Include trigger batches, Flow collections, API batches, batch scopes, and recursive automation.
4. Search for `System.assert`, `System.assertEquals`, and `System.assertNotEquals`. Any changed or added use is a blocker; require `Assert` methods such as `isTrue`, `areEqual`, `isNull`, or `fail`.
5. Before accepting any new helper, framework, wrapper, parser, iterator, result type, security utility, retry mechanism, or async abstraction, search the repo and the current official Apex/API reference for an existing Salesforce capability. Record the candidates checked. Prefer the platform primitive unless the PR proves a material gap.
6. Run project checks. If Salesforce Code Analyzer is available, scan changed Salesforce files with the repository config and `Recommended` rules. Verify exact rule names before selecting individual PMD/SFGE rules. Treat tools as evidence, not a substitute for transaction tracing.
7. Inspect tests for observable assertions, bulk cardinality, negative paths, permissions, partial failure, recursion, and async completion. Coverage alone is not evidence.

Useful searches (adapt paths to the repo):

```bash
rg -n --glob '*.{cls,trigger}' '\bSystem\s*\.\s*assert(?:Equals|NotEquals)?\s*\('
rg -n --glob '*.{cls,trigger}' '\[(?i:select)\b|Database\.(?:query|countQuery|insert|update|upsert|delete|undelete|merge)|\b(?:insert|update|upsert|delete|undelete|merge)\b'
sf code-analyzer run --rule-selector Recommended --target "<changed-files>" --view table
```

## Verdict

Presumptive blockers include SOQL/SOSL/DML or another limit-consuming operation in a per-record loop; a scalar-only bulk entry path; missing sharing/CRUD/FLS enforcement at a user boundary; injection or secret exposure; `System.assert*`; untested bulk or security behavior; swallowed partial failures; and reinventing a suitable Salesforce or repository capability.

Waive only with code-proven bounded cardinality or a documented platform constraint, not “this normally handles one record.” Avoid demanding needless frameworks, selector layers, recursion flags, or abstractions.

Use [review-comment-template.md](review-comment-template.md) and [ledger-template.md](ledger-template.md). Ground disputed Salesforce guidance in [sources.md](sources.md).
