# Static Analysis, Linting & Formatting

Cheap, unrationed feedback — run it freely while iterating. The repo's config files are strict inputs: honor `code-analyzer.yml` / PMD ruleset, `.prettierrc`, and the ESLint config rather than inventing rules.

## Code Analyzer (PMD, ESLint, CPD, RetireJS, SFGE)

The command is `sf code-analyzer run` — **not** `sf scanner run` (that CLI is retired, and `--format`/`--engine`/`--category`/`--json` error).

```bash
# scan just what you changed — keeps output small and fast
git diff --name-only <resolved-base>...HEAD | grep -E '\.(cls|trigger|js|ts|html|xml)$'
sf code-analyzer run --rule-selector Recommended --target "<comma,separated,files>" --view table

# whole workspace
sf code-analyzer run --rule-selector Recommended --workspace force-app --target force-app --view table
```

- Engines/severity via `--rule-selector`: `pmd`, `eslint`, `cpd`, `retire-js`, `sfge`; `:` = AND, `,` = OR. e.g. `pmd:Security`, `(pmd,eslint):Security`, `pmd:ApexCRUDViolation`, severity `1`–`5` (1 = Critical).
- CI/quality gate: `--severity-threshold 2` exits non-zero when anything at severity ≤ 2 is found.
- SFGE (data-flow rules) compiles **every** `.cls`/`.trigger` in `--workspace`, not just `--target` — always pass `--workspace force-app`, and expect 10–20 min.
- Look up an exact rule name before configuring it: `sf code-analyzer rules --rule-selector pmd:Security --view detail`.

### Reading results without a script

Keep the run scoped to the diff and use `--view table` (or `--output-file results.html`) so the output is small and human-readable. **Don't** parse the results JSON with Python/Node/`jq` — Code Analyzer output can be 10 MB+, and scoping to the diff avoids the problem entirely. A run that returns 0 violations on a suspicious selector is usually a bad selector — verify with `sf code-analyzer rules --rule-selector <sel>`.

### Config lives in `code-analyzer.yml`

At the project root (auto-discovered in CWD; no `--config-file` needed). The tool works with no config — only add intentional overrides.

- Rule tuning: `rules.pmd.<Rule>.{severity, disabled}`.
- Custom PMD ruleset: `engines.pmd.custom_rulesets: ["./config/custom-pmd-rules.xml"]`.
- ESLint: `engines.eslint.auto_discover_eslint_config: true` (needs `--workspace`) or `eslint_config_file`.
- Gotcha: a misspelled rule name in `code-analyzer.yml` is **silently ignored** — resolve the exact name via `sf code-analyzer rules` first.

## Formatting & lint

```bash
npm run lint                    # ESLint (repo script) — or npx eslint <files>
npx prettier --write <files>    # honors .prettierrc / prettier config
```

Match the repo's configured formatter and lint rules; don't reformat files the change doesn't touch.
