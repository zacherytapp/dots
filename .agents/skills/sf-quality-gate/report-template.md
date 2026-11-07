<!-- sf-quality-gate:report — one canonical report, updated in place on each run -->

## Salesforce quality gate: `<branch>`

Reviewed `<sha>` against `<base>` | org: `<alias>` or `none`

| Area             | Result             | Detail              |
| ---------------- | ------------------ | ------------------- |
| Issue compliance | PASS / FAIL / SKIP | X/Y criteria        |
| Security         | PASS / FAIL        | X issues            |
| Performance      | PASS / FAIL        | X issues            |
| Metadata-driven  | PASS / FAIL        | X hardcoded values  |
| Order of exec    | PASS / FAIL        | X conflicts         |
| Tests            | PASS / FAIL        | coverage %, quality |
| Deploy order     | PASS / FAIL        | X dependency errors |

**Verdict:** `DEPLOY` | `FIX REQUIRED` | `BLOCKED`

### Critical (must fix)

- `path:line`: description. Fix: specific instruction.

### High (must fix)

- `path:line`: description. Fix: specific instruction.

### Medium (recommended)

- `path:line`: description. Fix: specific instruction.

### Low (optional)

- `path:line`: suggestion.

### Execution order

<Phase 4a inventory per object with changed automation. Omit this section if no automation changed.>

### Deployment order

<Corrected sequence if Phase 6a found errors. Otherwise, "Resolves all dependencies.">

### Pre-deployment checklist

<Phase 6b checklist, filled in.>

### Not verified

<Checks skipped and why, such as no confirmed org, no git history, or no acceptance criteria. "None." if everything ran.>
