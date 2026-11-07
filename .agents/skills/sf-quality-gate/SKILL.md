---
name: sf-quality-gate
description: Audits changed Salesforce Apex, triggers, LWC, Flow, and metadata for security, governor limits, order of execution, tests, and deploy order, then issues a DEPLOY, FIX REQUIRED, or BLOCKED verdict. Use when a Salesforce change needs a final pre-deploy quality gate, readiness verdict, or go/no-go check.
---

# Salesforce Quality Gate

A read-only final gate: find issues and report them. Do not fix code, commit, or deploy. Use `sf-review-code` for line-by-line PR review; this skill produces the deploy-readiness verdict.

## Inputs

1. **Changed files.** Use `git diff --name-only <base>...HEAD` plus uncommitted changes. Take the base from PR metadata or the user. If neither gives a base, ask.
2. **Related issue.** Look for one the user named, a PR that closes an issue, or an issue number in the branch name or commit messages. Read its acceptance criteria.
3. **Project context.** Read `AGENTS.md`, `sfdx-project.json`, Code Analyzer config, and documented conventions.
4. **Org (optional).** Coverage and test runs need an org. Confirm its alias, username, and type before running anything. With no confirmed org, mark coverage as not verified instead of guessing.

## Workflow

Run the phases in [checks.md](checks.md) against the changed files, including the callers, automation, and metadata needed to trace each finding:

1. Issue compliance: skip it when the issue has no acceptance criteria.
2. Security audit.
3. Performance and metadata-driven compliance.
4. Order of execution.
5. Tests and coverage.
6. Deployment readiness.

Each Detection entry is only a starting point. Trace every hit to its execution context and cite `path:line` before you record it. A grep match alone is not a finding. Record each check you could not run, such as one that needs an org or git history, under **Not verified** rather than passing it.

## Severity

| Severity     | Definition                                                                                                   | Blocks Deploy? |
| ------------ | ------------------------------------------------------------------------------------------------------------ | -------------- |
| **CRITICAL** | Security vulnerability, governor limit violation at scale, data corruption risk, order-of-execution conflict | **YES**        |
| **HIGH**     | Missing error handling, missing bulk test, hardcoded values, unjustified `without sharing`, missing CRUD/FLS | **YES**        |
| **MEDIUM**   | Missing negative test, missing `@testFor`, minor performance concern, missing documentation                  | No             |
| **LOW**      | Style inconsistency, naming deviation, improvement opportunity                                               | No             |

## Verdict

| Condition                                   | Verdict                                 |
| ------------------------------------------- | --------------------------------------- |
| 0 CRITICAL, 0 HIGH                          | **DEPLOY**: safe to proceed             |
| 0 CRITICAL, 1+ HIGH                         | **FIX REQUIRED**: re-review after fixes |
| 1+ CRITICAL                                 | **FIX REQUIRED**: mandatory re-review   |
| Acceptance criteria or deliverables missing | **BLOCKED**: incomplete implementation  |

## Output

Write the report with [report-template.md](report-template.md). Choose its destination in this order:

1. **Related issue.** If you identified exactly one issue with confidence, post the report as an issue comment with the host's CLI, using the same host detection as `file-pr`. On a re-run, edit the comment that carries the `<!-- sf-quality-gate:report -->` marker instead of posting a duplicate.
2. **Markdown file.** If the user asked for a file, or the project has no issue tracker, write `docs/reviews/sf-quality-gate-<branch>.md` or the path the user gave. On a re-run, update that same file.
3. **Ask.** In every other case, ask the user where the report should go and offer the candidate issues and a file path. Examples: several candidate issues, an issue inferred only from a weak signal, or a tracker the CLI can't reach.

Never post to a guessed issue. After writing the report, give the verdict line and the destination in chat.

## Stop and ask

- The base ref, the related issue, or the report destination is ambiguous.
- Running tests needs an org and the target org is unclear.
- A finding depends on business intent the code and issue don't settle, such as whether a hardcoded value is a business rule.
