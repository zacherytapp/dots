# Quality Gate Checks

Adapt paths and globs to the repository layout. Each Detection is where to start looking. Confirm the execution context before you record a finding.

## Phase 1: Issue Compliance

Run this phase only when the related issue lists acceptance criteria or deliverables. Otherwise report `SKIP`.

### 1a: Completion audit

| Check                        | How                                                                      | Verdict                   |
| ---------------------------- | ------------------------------------------------------------------------ | ------------------------- |
| Deliverables exist?          | Glob for the classes, triggers, flows, LWC, and metadata the issue names | DONE / MISSING            |
| Matches acceptance criteria? | Read each file, verify each criterion                                    | PASS / FAIL per criterion |

### 1b: Scope drift

Trace each file in `git diff --name-only` back to the issue:

- Test class supporting a delivered class: ACCEPTABLE
- Helper or utility the issue doesn't call for: FLAG for review
- Unrelated change: UNRELATED, flag immediately

## Phase 2: Security Audit

Check every changed file. This is the most critical phase.

### 2a: Apex security

| Check                         | Detection                                                                                   | Severity     |
| ----------------------------- | ------------------------------------------------------------------------------------------- | ------------ |
| Missing sharing keyword       | Classes without `with sharing`/`without sharing`/`inherited sharing`                        | **CRITICAL** |
| Unjustified `without sharing` | `grep -rn "without sharing"`: each must have a comment explaining why                       | **HIGH**     |
| Missing CRUD/FLS on SOQL      | `grep -rn "\[SELECT"`: verify `WITH USER_MODE` or `WITH SECURITY_ENFORCED`                  | **CRITICAL** |
| Missing CRUD/FLS on DML       | `grep -rn "insert \|update \|delete \|Database\."`: verify `AccessLevel.USER_MODE`          | **CRITICAL** |
| SOQL injection                | `grep -rn "Database.query\|Database.countQuery"`: verify bind variables or `queryWithBinds` | **CRITICAL** |
| Hardcoded credentials         | `grep -rni "password\|api.key\|secret\|token"` in Apex                                      | **CRITICAL** |
| Hardcoded IDs                 | `grep -rn "'00[0-9a-zA-Z]"` in Apex                                                         | **HIGH**     |
| Hardcoded URLs                | `grep -rn "https://\|http://"` in Apex (excluding test mocks)                               | **HIGH**     |
| Secrets in debug logs         | `grep -rn "System.debug"` containing password/secret/token                                  | **HIGH**     |

### 2b: LWC security

| Check                   | Detection                                        | Severity               |
| ----------------------- | ------------------------------------------------ | ---------------------- |
| innerHTML usage         | `grep -rn "innerHTML"` in LWC JS                 | **CRITICAL**: XSS risk |
| Sensitive data in @api  | Check `@api` properties for PII/credentials      | **HIGH**               |
| Direct DOM manipulation | `grep -rn "document\.\|querySelector"` in LWC JS | **MEDIUM**             |

### 2c: Flow security

| Check                                     | Severity |
| ----------------------------------------- | -------- |
| DML elements missing fault connectors     | **HIGH** |
| Hardcoded Record IDs in Flow elements     | **HIGH** |
| No recursion prevention in entry criteria | **HIGH** |

## Phase 3: Performance Review

### 3a: Governor limit violations

| Anti-Pattern              | Detection                                                | Severity                                         |
| ------------------------- | -------------------------------------------------------- | ------------------------------------------------ |
| SOQL in loop              | `for(` block containing `[SELECT`                        | **CRITICAL**: hits 100 SOQL limit                |
| DML in loop               | `for(` block containing `insert/update/delete/Database.` | **CRITICAL**: hits 150 DML limit                 |
| Callout in loop           | `for(` block containing `Http/callout`                   | **CRITICAL**: hits 100 callout limit             |
| Nested loops for matching | Inner loop iterates full collection                      | **HIGH**: CPU exhaustion, use Map                |
| String concat in loop     | `+=` on String inside loop                               | **MEDIUM**: use `List<String>` + `String.join()` |

### 3b: Bulkification check

For every trigger handler:

1. Processes `Trigger.new` as a collection, not as individual records
2. SOQL outside loops, results stored in Maps
3. DML collected and executed once after the loop
4. Works with 200 records

For every Flow:

1. Get Records is NOT inside a Loop element
2. Create/Update/Delete Records is NOT inside a Loop (use collection variables)

### 3c: SOQL selectivity

For queries on objects likely to exceed 100K records (Account, Contact, Opportunity, Lead, Case, or any LDV object):

1. The WHERE clause uses indexed fields (Id, Name, CreatedDate, lookup, External ID, or a custom index)
2. The query has a LIMIT or a selective WHERE filter
3. Only required fields are selected (no SELECT-all equivalent)

### 3d: Metadata-driven compliance

Scan Apex for hardcoded values that belong in Custom Metadata Types.

| Check                       | Detection                                                                                                                                  | Severity                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Hardcoded thresholds/limits | `grep -rn "= [0-9]\{2,\}\|> [0-9]\{2,\}\|< [0-9]\{2,\}"` in Apex: verify business-rule numbers are in CMDT or constants with justification | **MEDIUM**                                             |
| Hardcoded email addresses   | `grep -rn "@.*\.com\|@.*\.org"` in Apex (excluding test classes)                                                                           | **HIGH**: should be CMDT or Custom Label               |
| Hardcoded picklist values   | `grep -rn "== '\|!= '"` in Apex: check whether compared values are business rules that could change                                        | **MEDIUM**                                             |
| Hardcoded feature toggles   | `grep -rn "Boolean.*=.*true\|Boolean.*=.*false"` at class level: check whether these control feature behavior                              | **MEDIUM**: should be CMDT or Hierarchy Custom Setting |

## Phase 4: Order of Execution Review

This phase catches conflicts between automations that were written in isolation.

### 4a: Object automation inventory

For each object with changed automation, build the execution order:

```text
OBJECT: Account
  1. Before-save flows:  [list]
  2. Before triggers:    AccountTrigger → AccountTriggerHandler.beforeUpdate()
  3. Validation rules:   Account_Active_Owner, Account_Required_Industry
  4. After triggers:     AccountTrigger → AccountTriggerHandler.afterUpdate()
  5. After-save flows:   Account_Sync_Contacts (NEW)
```

### 4b: Conflict detection

| Conflict Type              | Detection                                                            | Severity                                            |
| -------------------------- | -------------------------------------------------------------------- | --------------------------------------------------- |
| **Same-field update**      | Two automations (trigger + flow, or flow + flow) updating same field | **HIGH**: last write wins, unpredictable            |
| **Recursion**              | Automation A updates Object X → fires B on X → fires A               | **CRITICAL**: transaction failure                   |
| **Cross-object cascade**   | A on Obj1 updates Obj2 → fires B on Obj2 → updates Obj1              | **HIGH**: recursion risk + governor limits          |
| **Mixed automation types** | Both trigger AND record-triggered flow on same object + event        | **MEDIUM**: shared governor limits, harder to debug |
| **Multiple triggers**      | >1 trigger on same object (no guaranteed order)                      | **CRITICAL**: must be one trigger per object        |

### 4c: One trigger per object

Count triggers per object by reading each trigger's `on <Object>` clause. File names don't reliably identify the object. Any object with more than one trigger is a **CRITICAL** violation: consolidate into a single trigger with handler delegation.

## Phase 5: Tests and Coverage

Tests must prove the acceptance criteria and the risks the change introduces, with the fewest tests that do so (see `implement`'s minimal-test rules). Flag gaps and bloat alike.

### 5a: Acceptance and risk coverage

| Check                                        | Detection                                                                                 | Severity                                            |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Every acceptance criterion is proven         | Cross-reference the criteria (and the ticket's Tests list) with the test methods          | **HIGH**: criterion unproven                        |
| Changed Apex has executing tests             | Each changed class or trigger is exercised by some test, existing or new                  | **CRITICAL** when coverage would fall below the bar |
| Bulk test where a per-record path changed    | A test at the cardinality that crosses the limit at risk (e.g. 200 records for a trigger) | **HIGH**: governor bugs hidden                      |
| Negative test where failure handling changed | Invalid input or a failing dependency asserts the intended error behavior                 | **MEDIUM**                                          |
| Permission test where access rules changed   | `System.runAs()` with a restricted user                                                   | **MEDIUM**: security untested                       |
| Callouts mocked                              | `Test.setMock` / `HttpCalloutMock` for every callout path                                 | **HIGH**: CI fails on network                       |

A bulk, negative, or permission test is required only when the change introduces that risk. Don't require a test class per production class when existing tests already exercise the change.

### 5b: Test quality

| Check                                     | Detection                                                                  | Severity                                 |
| ----------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------- |
| Assertions prove outcomes                 | Each test asserts business outcomes, not just that no exception was thrown | **HIGH**: always passes                  |
| No `System.assert(true)`                  | `grep -n "assert(true)\|assertEquals(true, true)"`                         | **HIGH**: meaningless                    |
| `Assert` class for new/changed assertions | `grep -nE "System\.assert(Equals\|NotEquals)?\("` on changed lines         | **HIGH**                                 |
| No `SeeAllData=true`                      | `grep -n "SeeAllData"`                                                     | **HIGH**: brittle, environment-dependent |
| No test bloat                             | Duplicate coverage, tests of private helpers, coverage-only tests          | **LOW**                                  |

### 5c: Coverage

If you can run tests against the confirmed org, verify:

- Each changed class meets the repository's bar (75% minimum). Coverage beyond the bar is not a goal; don't ask for filler tests to raise it
- Org-wide coverage is at least 75%

```bash
sf apex run test --target-org <alias> --class-names "TestClass1,TestClass2" --result-format human --code-coverage --wait 10
```

### 5d: LWC Jest tests (if LWC behavior changed)

| Check                                                        | Severity   |
| ------------------------------------------------------------ | ---------- |
| Jest test file exists (`__tests__/componentName.test.js`)    | **HIGH**   |
| Wire mock present (`createApexTestWireAdapter` or `jest.fn`) | **HIGH**   |
| Error state tested, when error handling changed              | **MEDIUM** |
| Changed interactions tested (`dispatchEvent`, `click`)       | **MEDIUM** |

## Phase 6: Deployment Readiness

### 6a: Deployment order

Verify that the deployment sequence resolves every dependency:

| Dependency Rule                             | Violation Example                                     |
| ------------------------------------------- | ----------------------------------------------------- |
| Schema before automation that references it | Flow references Equipment\_\_c field not yet deployed |
| Apex before LWC that imports it             | LWC imports EquipmentController not yet deployed      |
| Objects before permission sets              | PermSet references Equipment\_\_c not yet deployed    |
| Apex handlers before triggers               | Trigger references handler class not yet deployed     |

Document the corrected sequence for any ordering error.

### 6b: Pre-deployment checklist

Fill this in for the report. Leave an item unchecked and list it under **Not verified** if you couldn't confirm it.

- [ ] All changed files compile without errors
- [ ] All local tests pass (`sf apex run test --test-level RunLocalTests`)
- [ ] Org-wide code coverage >= 75%
- [ ] No CRITICAL or HIGH issues in security/performance audit
- [ ] No order-of-execution conflicts
- [ ] Metadata-driven compliance verified (no hardcoded business rules)
- [ ] Deployment order resolves all dependencies
- [ ] Rollback plan documented
- [ ] Permission sets include all new fields/objects
- [ ] Page layouts updated for new fields (if user-facing)
