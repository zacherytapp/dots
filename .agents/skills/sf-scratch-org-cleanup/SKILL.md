---
name: sf-scratch-org-cleanup
description: Evaluates scratch orgs conservatively and deletes only user-confirmed targets. Use when the user asks to clean up, remove, delete, or prune scratch orgs.
metadata:
  version: "1.1"
  minApiVersion: "60.0"
  cliTools:
    - tool: ["sf"]
      semver: ">=2.0.0"
---

# Scratch Org Cleanup

Run the operations directly. Request JSON where supported and useful.

## 1. Gather orgs

```bash
sf org list --json
```

Use `result.scratchOrgs`. Record `orgId`, alias, username, status, `createdDate`, `expirationDate`, `lastUsed`, and `isDefaultUsername`. Exclude entries that are not scratch orgs. If none remain, report that and stop.

## 2. Resolve repository context

Collect the configured Dev Hub, repository remotes, and project namespace. Resolve the repository's actual default branch from provider metadata or the base repository's remote HEAD; never assume a remote name or `main`.

Repository and issue matches are context only. An alias match does not prove ownership, and a failed or unavailable issue search does not prove non-use.

## 3. Evaluate conservatively

Apply [scoring-rubric.md](references/scoring-rubric.md). Treat these as keep signals:

- current default org;
- recent `lastUsed`;
- recent creation;
- active or unmerged related work;
- open related issues;
- unclear ownership or conflicting evidence.

Expired status or a merged branch can make an org a deletion candidate, but never makes an active org safe automatically. Missing data is unknown, not evidence of idleness.

## 4. Present the report

Fill in [report-template.md](references/report-template.md). For every org show the evidence, unknowns, and one recommendation: **keep**, **candidate after review**, or **expired candidate**. Do not label an active org “safe to delete.”

## 5. Confirm and delete

Require explicit user confirmation identifying every org to delete. This applies to active and expired orgs. Before each deletion, recheck its identity, status, and default flag from fresh `sf org list --json` output.

If a selected org is the current default, stop and ask whether the user wants to choose another default or explicitly unset it; never change the default implicitly.

```bash
sf org delete scratch --target-org <alias-or-username> --no-prompt --json
```

Report each result and run one final `sf org list --json` to report the remaining count. Never infer consent from a confidence score or delete an org not named in the confirmation.

## References

- [scoring-rubric.md](references/scoring-rubric.md) — evidence and conservative classification
- [report-template.md](references/report-template.md) — report format
