# Salesforce Review Checklist

Use judgment and trace the complete transaction. A pattern is a finding only when it creates a concrete correctness, scale, security, operability, or maintenance risk.

## Trusted

- **Limits and bulk safety:** No SOQL, SOSL, DML, callout, `System.enqueueJob`, batch scheduling, event publication, email, or costly describe work in per-record loops, including helper methods called by loops. Inputs and outputs remain collection-oriented through every layer. Do not use `Trigger.new[0]` or assume one record. Consolidate IDs with `Set`, query once, index with `Map`, and perform collection DML once per operation. Challenge nested scans and unbounded query rows, heap, CPU, callouts, async jobs, and non-selective queries.
- **Transactions:** Check recursion and re-entry by behavior, not a transaction-wide static Boolean that skips valid later chunks. Check order of execution across Apex and Flow, lock ordering, mixed DML, savepoints, callout-before/after-DML constraints, idempotency, duplicate delivery, and all-or-none versus partial success. Every `SaveResult`, publish result, and async failure path must be handled intentionally.
- **Security:** Entry-point classes declare intentional sharing. User-facing reads and writes enforce record access, CRUD, and FLS with an appropriate platform mechanism such as user mode or `Security.stripInaccessible`; `with sharing` alone is insufficient. Dynamic SOQL/SOSL binds or strictly allowlists input. No credentials, tokens, endpoints, IDs, or permission decisions are hardcoded when Named Credentials, Custom Metadata, Custom Labels, permissions, or schema APIs own them.
- **Reliability:** Choose synchronous, Queueable, Batch, Scheduled, event-driven, or Flow execution based on volume and delivery semantics. Check retries, finalization, monitoring, stale sObjects passed async, queue flooding, row locks, and large-data-volume behavior.

## Easy

- **Platform first:** Search before approving custom infrastructure. Consider `List`/`Set`/`Map`, trigger context maps, relationship queries, aggregate SOQL, `Database` methods and result types, `upsert` with external IDs, `Schema` describe APIs, `Security`, `Test`, `Assert`, `JSON`, `Crypto`, `EncodingUtil`, `HttpCalloutMock`, Queueable/Batch/Schedulable, transaction finalizers, platform events, Named Credentials, Custom Metadata, Custom Labels, and Lightning Data Service/UI API. This is a candidate list, not a command to use every feature.
- **One source of truth:** Reuse existing domain services, selectors, test-data builders, Flow actions, components, metadata, and managed-package features. Reject near-duplicates and generic utility dumping grounds. Also reject a new framework when a direct platform API is clearer.
- **Data and automation:** Prefer before-save mutation for same-record changes where appropriate. Avoid duplicate Apex/Flow automation, hardcoded record type or org IDs, unnecessary dynamic Apex, over-fetched fields, and configuration represented as code.
- **UI:** For LWC, prefer base components, Lightning Data Service/UI API, SLDS, supported modules, reactive state, and accessible semantics over custom reimplementations. Verify cacheability, error handling, permissions, loading/empty states, and subscription cleanup.

## Adaptable

- **Boundaries:** Separate orchestration, domain policy, data access, integration transport, and presentation only where the seam hides real complexity. Check packaging namespace assumptions, API-version behavior, metadata deployability, and integration contracts.
- **Change safety:** Avoid field-name strings and broad `Map<String, Object>` contracts when typed sObjects, wrappers, schema tokens, or generated/platform types fit. Check backward compatibility only for shipped APIs, integrations, packages, or persisted/event payloads.
- **Operations:** Errors need actionable context without leaking sensitive data. Async and integration work needs observable job/correlation state and an explicit recovery path when the business impact warrants it.

## Tests

- Require `Assert` class methods; changed or added `System.assert*` is a blocker. Prefer the most specific assertion and a useful failure message where context is not obvious.
- Tests prove outcomes, not line coverage: single, empty when callable, and bulk inputs; positive and negative paths; all trigger contexts; recursion/re-entry; partial DML; permissions/sharing; async work after `Test.stopTest`; and callouts with mocks.
- Tests create deterministic data and avoid `SeeAllData=true` unless a platform-only dependency makes it unavoidable and the reason is explicit. Use `Test.startTest`/`stopTest` around the action under test, not setup.
- Bulk tests must exercise the risky cardinality and assert every relevant record, not merely that no exception was thrown. Do not require exactly 200 records when a smaller cardinality proves the boundary more directly.
