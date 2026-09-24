---
name: sf-review-issue
description: Extends issue review with Salesforce metadata, org setup, limits, security, and test requirements. Use when reviewing Salesforce issues or specs for implementation readiness.
disable-model-invocation: true
---

# Review Issue (Salesforce)

Extend `review-issue`; do not replace its readiness workflow, ambiguity handling, source-of-truth updates, or output. Load that skill first, then apply these Salesforce requirements. Feature code belongs in `sf-implement`.

## Working with the sf CLI

This skill only _reads_ the org. Deploying and testing belong to [sf-implement](../sf-implement/SKILL.md).

- Discover via `sf ... --json`, `sf sobject describe`, Tooling API SOQL, and Read/Grep. Never write throwaway Python/Node or `find`/`locate` to hunt metadata.
- `sf` CLI v2 only; every org command takes `--target-org <alias>`; confirm the org's identity first.
- Keep output small: scope each describe/query to what the ticket touches and read fields from `--json`.
- Confirm unfamiliar Apex/LWC/metadata behavior with `sf-docs` before writing it in. Never rely on memory.

Use these Salesforce readiness references:

- [inventory.md](inventory.md): name exact classes, triggers, LWC, objects, fields, permission sets, and tests with paths.
- [org-setup.md](org-setup.md): capture scratch-org and setup conventions, scripts, permissions, seed data, and validation.
- [gotchas.md](gotchas.md): interrogate the change against relevant platform constraints.
- [ticket-body.md](ticket-body.md): use this Salesforce-specific body structure and consolidate relevant comments into it.

## Workflow

1. **Confirm the org.** Identify the target org and state its alias, username, and type. This skill reads only; do not deploy or test.

2. **Reconcile source and org.** Assume the ticket is stale. Compare named metadata and behavior with the repository and org. Treat missing or conflicting metadata as a finding, not an assumption.

3. **Build the implementation map.** Record exact metadata, paths, entry points, dependencies, permission boundaries, automation, tests, and org setup using the references above.

4. **Apply Salesforce constraints.** Specify bulk cardinality, governor-limit risks, sharing and CRUD/FLS behavior, partial failures, async behavior, coverage, and observable tests where relevant.

5. **Update the ticket.** Follow `review-issue`, but use [ticket-body.md](ticket-body.md) as the readiness structure. The result must be sufficient for `sf-implement` without further org or metadata discovery.

## Design bar

Apply the generic review design bar plus these Salesforce checks:

- Prefer existing repository and Salesforce platform capabilities over new frameworks or wrappers.
- Trace Apex, Flow, triggers, invocables, and downstream automation as one transaction surface.
- Require typed boundaries and bulk entry paths rather than scalar-only APIs or untyped maps.
- Name tests for core behavior, regression, bulk, negative, permission, partial-failure, recursion, and async paths as applicable. Coverage alone is insufficient.

## Stop and ask

- Metadata is absent from both org and source, or they disagree beyond clean reconciliation.
- A design ambiguity would misdirect the implementer; use `grill-with-docs`.
- The org convention is unclear (no definition file, scripts, or Dev Hub) and the repo doesn't reveal it.
- The behavior may already exist or conflicts with in-flight work.

## Red flags

- Vague references ("update the trigger") with no class, method, and path; generic gotchas ("watch limits") instead of the specific limit and where.
- No org-setup block; no named tests or coverage bar; acceptance criteria that aren't observable.
- A plan grows custom code where a repository or platform capability already fits.
- A guessed decision is written as settled, or implementation begins during review.
