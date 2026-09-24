# Implementation Map — name the exact artifacts

The implementer should never hunt. Turn every vague reference ("the account logic", "the trigger", "the LWC") into a concrete, path-anchored list. Discover with Grep/Read and scoped `sf` commands; request JSON when structured output is useful.

## What to enumerate

For each layer the change touches, name the **exact** artifacts and paths. Split into _Touch_ (exists, will change) and _Create_ (new).

| Layer                    | Name this                                                                 | Find it with                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Apex classes/triggers    | class + specific method(s) + path                                         | `rg` the symbol; `sf data query --query "SELECT Name FROM ApexClass WHERE Name LIKE '…'" --use-tooling-api --target-org <alias> --json` |
| Trigger handlers         | handler class + framework hook (`onAfterUpdate`, …)                       | Read the trigger → its handler                                                                                                          |
| Objects/fields           | object + field **API names** (`Account`, `Discount_Rate__c`) + type       | `sf sobject describe --sobject <obj> --json`                                                                                            |
| LWC / Aura               | component dir + the JS method / `@api` property / wire                    | `force-app/main/default/lwc/<cmp>`                                                                                                      |
| Flows                    | Flow API name + the element to change                                     | `sf data query --query "SELECT DeveloperName FROM FlowDefinition" --use-tooling-api --target-org <alias> --json`                        |
| Permission sets / groups | PS API name + what it grants (FLS, object perms, Apex access)             | `permissionsets/` dir; existing assignments                                                                                             |
| Other deps               | validation rules, layouts, custom labels/metadata types, static resources | Grep the referencing source                                                                                                             |

## Rules

- **API names, not labels** — `Discount_Rate__c`, not "the discount field."
- **Method-level, not class-level** — name the method the change lands in; for a new one, where it goes and what it returns.
- **Confirm existence** — a name no describe/Tooling query finds is a stop-and-ask.
- **Include test artifacts** — the test class/methods covering each touched class ([gotchas.md](gotchas.md)).
- **Flag the blast radius** — callers and anything compiling against a changed method: the regression surface.
- **Map reuse and deletions, not just additions** — name the helper/canonical layer to reuse and the code to delete or simplify (Design bar). A map that only grows code is a review miss.

## Shape it into the ticket

Write the `### Implementation map` section as tight Touch / Create lists:

```text
### Implementation map
**Touch**
- `AccountTriggerHandler.onAfterUpdate` (force-app/main/default/classes/) — add discount recalculation
- `Account.Discount_Rate__c` (Percent) — read only, no schema change
- `AccountTriggerHandlerTest` — extend with bulk + boundary cases

**Create**
- `DiscountCalculator` (force-app/main/default/classes/) — pure calc, no DML
- `DiscountCalculatorTest`
- `Discount_Access` permission set — read on Discount_Rate__c
```
