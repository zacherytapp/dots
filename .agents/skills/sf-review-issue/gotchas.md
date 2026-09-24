# Salesforce Gotchas — interrogate the change, pin the ones that apply

Salesforce fails at runtime in ways a generic ticket never anticipates. For each risk that _actually_ applies to the change, write a **specific** note into the ticket — the limit at risk and where, not boilerplate — so the implementer knows what will bite and how the design avoids it. Confirm any limit you're unsure of against official docs (**sf-docs**) before asserting it.

## Bulkification — the default failure mode

Trigger/handler/service code runs on batches up to 200; anything that assumes one record breaks in bulk.

- **No SOQL/DML in loops.** Collect Ids into a `Set<Id>`, query once `WHERE Id IN :ids`, build a `Map<Id, SObject>`, DML once on a list.
- If the change adds a query or DML to a per-record path, require the bulk-safe shape — and a **200-record** test to prove it.

## Governor limits — name the one at risk

Per sync transaction: SOQL **100**, query rows **50k**, DML **150**, DML rows **10k**, CPU **10s**, heap **6 MB**, callouts **100**. Async (`@future`/Batch/Queueable) CPU is **60s** and heap is **12 MB**; only heap doubles relative to synchronous Apex.

- Point at the limit _this_ change pressures ("recalc loops over child Opportunities → SOQL-in-loop against the 100 limit"), not "watch limits."
- High-volume or long-running work may need **Batch/Queueable** — say so, and note the async testing needs (`Test.startTest()/stopTest()`).

## Order of execution, recursion, mixed DML

- A trigger/Flow/Process change interacts with the save order — validation rules, other triggers, roll-ups, workflow/Flow updates can re-fire triggers. Name what else runs on the same object event.
- **Recursion:** require an idempotent transition, keyed recursion tracking, or another mechanism justified by the actual order of execution. Do not prescribe a transaction-wide static Boolean; it can skip valid later chunks. Require a test that catches re-entry without suppressing legitimate work.
- **Mixed DML:** DML on a setup object (User, Group, PermSet assignment) and a non-setup object in one transaction throws `MixedDMLException` — require `System.runAs`/async separation.

## Security — CRUD/FLS & sharing

- Apex enforces record/field security only on request. Name the sharing keyword (`with sharing`/`inherited sharing`) and whether reads/writes need `WITH USER_MODE` / `Security.stripInaccessible`.
- New fields need **FLS on a permission set** — tie back to the permset in [inventory.md](inventory.md) and [org-setup.md](org-setup.md). A field the tests see but the running user can't is a classic post-deploy bug.

## Async, callouts, integrations

- Callouts can't follow uncommitted DML, and triggers can't call out synchronously → `@future(callout=true)`/Queueable. Prefer Queueable (chainable, takes sObjects); note which the design uses.
- Callouts need a **Named Credential**, and tests **must** mock via `HttpCalloutMock`/`Test.setMock` — a test hitting the network fails CI. Require the mock.

## Data & queries

- Selective SOQL: indexed `WHERE` + `LIMIT`; avoid leading `LIKE '%x'`, `!=`/`NOT IN`, `= null`, formula fields in `WHERE`. Flag any query the change adds over a large object.
- Validation rules / required fields reject inserts — name the fields the change's DML must populate.

## LWC / Aura

- Apex called from LWC is `@AuraEnabled`; add `(cacheable=true)` for wire reads — cacheable methods can't DML. Note which.
- Errors surface as `ErrorMessage` on the wire/promise; the component must handle the rejected state — require it in acceptance.
- UI changes need their own **Jest** tests; don't let them ride on Apex coverage.

## Tests & coverage — name them

Production deploy requires **≥75%** org-wide (follow a higher repo bar if documented); coverage is the floor, not the goal. Plan only the tests needed to hold that bar and lock core behavior and regressions — not exhaustive permutations.

- **Name the test artifacts** (also in [inventory.md](inventory.md)): which `@IsTest` class/methods to extend, which to create.
- Require the cases the change demands, no more: **bulk (200)**, boundary/null, negative (expected exceptions via `Assert` + `try/catch`), async via `Test.startTest()/stopTest()`.
- `@TestSetup` for shared data; no reliance on org data (`SeeAllData=true` is a red flag). Mock all callouts.
- Assertions use the modern **`System.Assert`** class, expected-first, with a message — never legacy `System.assertEquals`.

> Command-level test/coverage/log detail lives in [sf-implement/testing.md](../sf-implement/testing.md) and [sf-implement/logs-and-data.md](../sf-implement/logs-and-data.md). Here you decide _what must be tested_; the implementer runs it.

## Deploy sequencing

Dependent metadata deploys in order or references fail: **objects/fields → permsets → Apex → Flows (Draft) → activate**. If the change spans layers, put the order in the ticket's sequencing section.
