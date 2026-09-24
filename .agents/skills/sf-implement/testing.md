# Running Tests

Full Apex regression runs are the most expensive step in Salesforce development — many minutes each, against a daily async quota. **Iterate with the narrowest selector; reserve the full suite for one final gate.** Everything below runs through the `sf` CLI.

## Apex — from narrowest to widest

```bash
sf apex run test --tests AccountService.testCreate --target-org <alias> --json   # one method (fastest)
sf apex run test --tests AccountService.testCreate --tests AccountService.testUpdate --target-org <alias>   # repeat for a set
sf apex run test --class-names AccountServiceTest --target-org <alias>            # one class
sf apex run test --suite-names RegressionSuite --target-org <alias>              # a suite
sf apex run test --test-level RunLocalTests --target-org <alias>                 # FINAL gate only
```

- `--concise` shows only failures while iterating; `--result-format human|json|junit|tap` (junit for CI, json to read a field).
- Apex test execution is asynchronous by default. `sf apex run test` has no `--async` flag. Use `--wait <minutes>` when the command should wait for results; otherwise capture the returned `707…` run ID and poll with `sf apex get test --test-run-id 707… --target-org <alias> --json`.

### Coverage — out of a run you already spend

Add `--code-coverage --output-dir ./test-results` to any run; no separate coverage run is ever needed.

```bash
sf apex run test --test-level RunLocalTests --code-coverage --output-dir ./test-results --target-org <alias> --json
```

- Org-wide percentage is in the JSON at `result.summary.orgWideCoverage` (a `"NN%"` string). Per-class detail is `result.coverage.coverage[]` (`numLinesCovered`, `numLinesUncovered`, `uncoveredLines`). `--detailed-coverage` adds per-line data.
- `--output-dir` writes the results JSON plus a `*-codecoverage.json`. Read the field from `--json`; don't hand-parse the file.
- Note: `sf apex` has **no** `--coverage-formatters`/`--results-dir` and no `total.lines.pct` — that's the Jest/nyc shape, not Apex.
- Production release requires **≥75%**; follow the repo's documented threshold when it's higher.

## Assertions

Prefer the modern **`System.Assert`** class (API 55.0+) for new or edited assertions when repository conventions allow it. Both modern and legacy equality assertions use expected-first ordering. Always pass a message so a failure explains itself.

| Legacy                                            | Modern (`System.Assert`)                                                            |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `System.assert(cond, msg)`                        | `Assert.isTrue(cond, msg)` / `Assert.isFalse(cond, msg)`                            |
| `System.assertEquals(expected, actual, msg)`      | `Assert.areEqual(expected, actual, msg)`                                            |
| `System.assertNotEquals(unexpected, actual, msg)` | `Assert.areNotEqual(unexpected, actual, msg)`                                       |
| null checks via `assertEquals(null, x)`           | `Assert.isNull(x, msg)` / `Assert.isNotNull(x, msg)`                                |
| type checks (none)                                | `Assert.isInstanceOfType(obj, Type.class, msg)` / `Assert.isNotInstanceOfType(...)` |
| force a failure                                   | `Assert.fail(msg)`                                                                  |

- Argument order is **expected first, then actual**, matching legacy `System.assertEquals` and `System.assertNotEquals`.
- Failures still surface as `System.AssertException`, so the fix-loop table below is unchanged.
- Follow the repository's assertion convention. Do not perform an unrelated migration of untouched tests.

## The fix loop (max 3 attempts)

Run → read the failure (type + location) → open the test **and** the class under test → root-cause → fix → re-run only the failing `--tests` selector → stop on green or after 3 attempts. Widen to `RunLocalTests` only to confirm once the fix is stable.

Failure signal → likely cause:

| Exception                | Usual root cause                         |
| ------------------------ | ---------------------------------------- |
| `System.AssertException` | wrong expected value or logic            |
| `NullPointerException`   | missing null guard or unseeded test data |
| `DmlException`           | validation rule or required field        |
| `LimitException`         | not bulkified — query/DML in a loop      |
| `QueryException`         | test data the query expects isn't there  |
| `TypeException`          | cast / format mismatch                   |

## Jest (LWC / Aura) — cheap, unrationed

```bash
npm run test:unit                          # whole suite
npm run test:unit -- path/to/file.test.js  # one file
npm run test:unit -- -t "renders header"   # one test by name
```

Prioritize critical paths and complex logic. Jest, linting, and static analysis are cheap — lean on them so the expensive Apex runs stay rare.
