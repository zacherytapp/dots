---
name: sf-review-issue
description: Extends issue review with Salesforce metadata, org setup, limits, security, and test requirements. Use when reviewing Salesforce specs, tickets, or issues for implementation readiness.
disable-model-invocation: true
---

# Review Issue (Salesforce)

Extend `review-issue`; don't replace its readiness workflow, template checks, sizing and blocking rules, authorization rule for edits, or output. Load that skill first, then apply these Salesforce requirements. Implementation belongs in `sf-implement`.

## Working with the org

This skill only _reads_ the org. Never deploy, run tests, assign permissions, or load data; those belong to `sf-implement`.

- Confirm the org's alias, username, and type before the first query. Production is read-only; keep queries scoped and small.
- Discover with `sf ... --json`, `sf sobject describe`, Tooling API SOQL, and Read/Grep. Never write throwaway Python/Node or `find`/`locate` to hunt metadata.
- Pass `--target-org <alias>` on every org command and read fields from `--json`.
- Confirm unfamiliar Apex, LWC, or metadata behavior with `sf-docs` before writing it in. Never rely on memory.

References:

- [ticket-body.md](ticket-body.md): how Salesforce detail fits the shared spec and ticket templates, and how to update the source.
- [inventory.md](inventory.md): the exact classes, triggers, LWC, objects, fields, permission sets, and tests, with paths.
- [org-setup.md](org-setup.md): scratch-org and setup conventions, scripts, permissions, seed data, and validation.
- [gotchas.md](gotchas.md): the platform constraints to interrogate the change against.

## Workflow

1. **Confirm the org** as above.
2. **Reconcile source and org.** Assume the work item is stale. Compare named metadata and behavior with the repository and org. Treat missing or conflicting metadata as a finding, not an assumption.
3. **Review the spec** for the Salesforce decisions [ticket-body.md](ticket-body.md#specs) requires, without file paths.
4. **Review each ticket.** Build its Touch / Create map, org setup, and applicable constraints using the references above.
5. **Check Salesforce sequencing.** Deploy order lives inside each ticket. Tickets that can run in parallel need separate orgs; when the project has only one, say the frontier runs sequentially.
6. **Prepare updates** following [ticket-body.md](ticket-body.md#updating-the-source). The result must be sufficient for `sf-implement` without further org or metadata discovery.

## Design bar

Apply the generic design bar plus these Salesforce checks:

- Prefer existing repository and Salesforce platform capabilities over new frameworks or wrappers.
- Trace Apex, Flow, triggers, invocables, and downstream automation as one transaction surface.
- Require typed boundaries and bulk entry paths rather than scalar-only APIs or untyped maps.
- Tests prove the acceptance criteria and the risks the change introduces (bulk, permission, partial failure, recursion, async) only where they apply. Coverage alone is insufficient; coverage beyond the bar is not a goal.

## Stop and ask

- Metadata is absent from both org and source, or they disagree beyond clean reconciliation.
- A design ambiguity would misdirect the implementer; use `grill-with-docs`.
- The org convention is unclear (no definition file, scripts, or Dev Hub) and the repo doesn't reveal it.
- The work needs production deployment, packaging, or Dev Hub changes.
- The behavior may already exist or conflicts with in-flight work.

## Red flags

- Vague references ("update the trigger") with no class, method, and path; generic gotchas ("watch limits") instead of the specific limit and where.
- No org setup section; no named tests; acceptance criteria that aren't observable.
- A plan grows custom code where a repository or platform capability already fits.
- A guessed decision is written as settled, or implementation begins during review.
