# Skill Review Recommendations

Original review scope: the 25 `SKILL.md` files present at review time and the references needed to validate their workflows. The repository now contains 31 skills.

## Implementation status

All 17 findings below have been addressed. The implementation:

- corrected worktree, base-branch, deployment, cleanup, conflict-resolution, Salesforce CLI, and debug-log guidance;
- separated issue, implementation, PR filing, babysitting, review, fix, and merge ownership;
- unified review-ledger markers and made agent orchestration capability-based;
- removed fabricated log integrations, unsupported examples, benchmark claims, fix assets, and personal conventions;
- strengthened `scripts/validate-skills.mjs` for description shape, dependencies, anchors, hooks, hard-coded bases, and ledger markers.

`npm run check` passes with all 31 skills validated. The findings are retained below as the historical rationale for the changes.

## Resolved findings

### 1. Restore or remove the broken `domain-modeling` dependency

`skills/grill-with-docs/SKILL.md` invokes the deleted `/domain-modeling` skill. This also breaks ambiguity handling in `implement-pr-fixes`, `review-issue`, and `sf-review-issue`.

Either restore `domain-modeling` or rewrite `grill-with-docs` to define which artifacts it creates and how. Extend the validator to detect slash-command and plain-text skill references, not only narrow backticked forms.

### 2. Set up worktrees from the resolved base before changing files

`sf-implement` retrieves metadata and asks for a separate commit before creating its worktree. Both implementation skills create a branch from the current `HEAD` before resolving the intended base branch.

The shared order should be:

1. Resolve and fetch the target base and its remote.
2. Confirm the starting SHA.
3. Create the feature branch and worktree from the fetched base ref.
4. Enter the worktree.
5. Retrieve, edit, test, and commit only inside it.

Do not assume the base remote is `origin`; fork and multi-remote workflows need the provider's actual base repository.

### 3. Correct Salesforce deployment validation

`sf-implement` mandates `sf project deploy validate` for scratch orgs and sandboxes. Salesforce CLI documents that command as intended for production and explicitly advises against using it on sandboxes.

For allowed non-production targets, use:

```bash
sf project deploy start --dry-run --source-dir force-app \
  --test-level RunLocalTests --target-org <alias> --json
```

Keep production validation and quick deploy outside `sf-implement` unless a separate release skill is introduced.

### 4. Make scratch-org cleanup conservative

The cleanup rubric currently labels some old orgs safe based on alias matching and the absence of keyword-matched issues. Those signals do not establish that an org is unused. The rubric also refers to `lastUsedDate` and `connectedStatus`, which are not returned as described by the current CLI.

Recommended changes:

- Treat recent use as a keep signal rather than overriding it.
- Never infer non-use solely from a failed issue search.
- Resolve the repository's actual default branch instead of assuming `main`.
- Use fields that the installed CLI actually returns, such as `lastUsed` from `sf org list`.
- Keep user confirmation mandatory for every active-org deletion.

### 5. Make merge-conflict recovery abortable and path-specific

`resolving-merge-conflicts` says to always resolve, never abort, and stage everything. That can preserve an accidental merge or include unrelated changes.

Allow aborting when the operation, base, or intended resolution is wrong. Stage only resolved paths. Finish with `git merge --continue` or `git rebase --continue` as appropriate rather than an unconditional commit.

### 6. Correct Salesforce CLI and Apex facts

Fix the following inaccuracies and contradictions:

- `sf apex run test` has no `--async` flag; asynchronous execution is already the default.
- Legacy and modern equality assertions both use expected-first ordering.
- `sf org open --source-file` supports only ApexPage, FlexiPage, Flow, and Agent metadata in the installed CLI.
- `sf project deploy start --source-file` is not a valid command; deploy the containing source directory or use a metadata selector.
- Tooling API queries must use `--query`, `--use-tooling-api`, `--target-org`, and `--json` where the surrounding workflow requires structured output.
- ApexLog, TraceFlag, and DebugLevel operations must use the Tooling API.
- The installed `sf org create scratch` accepts a 15-character org-shape ID, not the inconsistent 15-or-18-character guidance in the references.
- Partner edition CLI values use hyphens (`partner-developer`), not spaces.
- Async Apex CPU is 60 seconds versus 10 seconds synchronously; only heap doubles. `sf-review-issue/gotchas.md` incorrectly says both limits double.
- `sf org list metadata-types` lists Metadata API types, not valid scratch-org feature names.

Also replace blanket instructions to add `--json` to every `sf` command with “when supported and useful.” Code Analyzer and streaming commands do not uniformly support JSON, and several examples already omit it.

### 7. Remove fabricated log automation

`sf-logs-debug/references/cli-commands.md` claims the skill automatically installs or invokes a hook and integrates with an `sf-apex` skill. Neither exists in this repository.

Delete those claims. Describe only operations the agent actually performs, or add and validate the missing integration explicitly.

### 8. Separate issue review from PR code review

`review-issue` delegates to `review-code`, but `review-code` requires a PR diff, reviewed SHA, PR comments, labels, and a findings ledger. That workflow cannot operate on a standalone issue or Markdown spec.

Extract reusable design and maintainability standards into a shared reference. Keep:

- `review-code` responsible for code diffs and PR ledgers.
- `review-issue` responsible for requirements, readiness, and source-of-truth updates.
- Source edits opt-in or clearly stated in the skill description.

### 9. Resolve the actual base branch everywhere

Replace hard-coded `main` usage in `deslop`, `implement`, `sf-implement`, Salesforce static analysis, and scratch-org cleanup. Use the PR base, configured default branch, ticket target, or merge base as appropriate. This is required for stacked PRs and repositories whose default branch has another name.

### 10. Remove the `to-spec` contradiction

`to-spec` says not to interview the user but later requires confirmation of test seams. Choose one contract:

- Pure synthesis: infer the seams, record uncertainty, and publish without questions.
- Confirmed specification: permit one focused approval step and update the description accordingly.

Also fix the process numbering. Both `to-spec` and `to-tickets` should verify that `ready-for-agent` exists before applying it, or use the repository's configured equivalent.

### 11. Give each PR skill one owner responsibility

The current implementation and PR skills overlap in PR creation, review, CI waiting, and fixes. Use one composition path:

1. `implement` or `sf-implement`: implement, test, and commit.
2. `file-pr`: prepare and create the PR.
3. `babysit-pr`: monitor CI, review feedback, and conflicts.
4. `implement-pr-fixes`: apply findings in the existing branch and environment.
5. `review-code` or `sf-review-code`: review only; maintain the findings ledger.
6. `merge-pr-into-main`: validate final provider gates, merge, and clean up.

Check that labels exist before changing them. Distinguish repository labels from provider review states such as approval or requested changes.

### 12. Repair and strengthen validation

Current skill-specific validation is not green:

- `node scripts/validate-skills.mjs` fails because `skills/file-pr/SKILL.md` is 101 lines.
- That file also has Prettier differences. No Markdownlint defect was found in the reviewed Markdown.

After fixing `file-pr`, extend `scripts/validate-skills.mjs` to check:

- Slash-command and unquoted skill dependencies.
- Required description shape, not merely the presence of `Use when`; `review-issue` currently has no capability sentence.
- Relative Markdown anchors where practical. `sf-implement/orgs-and-deploy.md` currently links to the nonexistent `SKILL.md#boundaries--what-this-skill-is-allowed-to-produce` anchor.
- Unsupported hard-coded default branches in reusable skills.
- References to absent hooks, tools, integrations, and incompatible ledger markers.

### 13. Use one review-ledger identity

`sf-review-code` says it inherits `review-code` mechanics but its templates use `sf-review-code:ledger` and `sf-review-code:review` markers. Generic review looks only for `review-code:ledger` and `review-code:review`, so a Salesforce re-review can miss its previous fixed point, repeat the full review, or create duplicate canonical comments.

Use the generic markers and extend the schema with a Salesforce axis, or teach every caller and reviewer to recognize one explicitly shared marker set. Keep one canonical ledger and one canonical review comment per PR.

### 14. Remove personal and repository-specific rules from reusable skills

`sf-implement/code-conventions.md` requires every Apex class to use `@author Zakk Tapp`, mandates ApexDoc on every public/global symbol regardless of the repository's PMD configuration, and declares several comment rules “absolute.” This conflicts with `sf-implement` saying project conventions supersede the skill and would inject one user's identity into unrelated repositories.

Remove the personal author value and unconditional PMD claims. Discover and follow the target repository's actual ApexDoc, author, group, and metadata-comment conventions; provide defaults only when they are platform facts rather than local preferences.

### 15. Rebuild the debug-log references from real evidence

The `sf-logs-debug` references contain substantive fabricated or stale material beyond the nonexistent hook:

- Apex logs do not emit the documented `LOOP_BEGIN`, `LOOP_END`, `ITERATION_BEGIN`, or `ITERATION_END` events. Repeated SOQL/DML entries alone do not prove a loop without execution context.
- The documented 2 MB log truncation threshold is stale; current Apex debug logs can be up to 20 MB.
- `sf apex get log -o debug.log` treats `debug.log` as the target org. Use `--output-dir` or shell redirection.
- The benchmarking tables claim precise performance results without primary sources or reproducible environment details and then generalize them into coding rules.
- `assets/null-pointer-fix.cls` misdiagnoses a zero-row single-record SOQL assignment as a null pointer; it throws `QueryException`, and the “safe navigation” variant still executes that throwing query.

The skill description also says it does not generate code fixes while the workflow links directly to fix assets. Either make the skill evidence-only and remove the fix/benchmark assets, or update the contract and validate every example in a scratch org. Rebuild event formats, limits, and retention guidance from current official documentation.

### 16. Make agent orchestration portable

`implement` and `review-code` prescribe time-sensitive model names and require particular orchestrator/reviewer tiers. `research` requires an unspecified background-agent facility. These workflows fail or become stale when the harness exposes different models or no subagent controls, contrary to `write-a-skill`'s rule against time-sensitive instructions.

Specify capabilities and roles instead of product-version codenames, detect available orchestration features, and define a same-agent sequential fallback. Keep optional provider mappings in a maintained configuration rather than in the core workflow.

### 17. Reconcile contradictory Salesforce design guidance

`sf-review-issue/gotchas.md` says a same-object update “needs a static guard,” while `sf-review-code/checklist.md` correctly warns that a transaction-wide static Boolean can skip valid later chunks. Require an idempotent transition, keyed recursion tracking, or another design justified by the actual order of execution rather than a blanket static guard.

Audit the remaining prescriptive snippets the same way. Generic implementation guidance should not force dependency injection, wrappers, comments, or async work where repository conventions and the concrete transaction do not justify them.

## Original consolidation priorities

1. Fix the broken dependency and unsafe worktree/deployment workflows.
2. Correct destructive cleanup and merge-conflict guidance.
3. Repair invalid Salesforce commands, log facts, examples, and fabricated integrations.
4. Separate issue review from code review and unify review-ledger mechanics.
5. Remove personal conventions and make orchestration capability-based.
6. Consolidate PR ownership and Salesforce lifecycle instructions.
7. Strengthen validation to prevent recurrence.
