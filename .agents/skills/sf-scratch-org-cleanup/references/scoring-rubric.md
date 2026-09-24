# Conservative Scratch Org Evaluation

## Evidence to collect

Use `sf org list --json` for each scratch org:

- `orgId`, `alias`, `username`, `status`, `createdDate`, `expirationDate`
- `lastUsed`, `isDefaultUsername`, `devHubUsername`, `namespace`

Use the fields returned by the installed CLI, especially `lastUsed`. Do not invent additional detail fields. Missing `lastUsed` is unknown, not proof that the org is idle.

## Repository context

Resolve the base repository and its default branch from provider metadata or the matching remote's HEAD. Fetch that remote before checking merged branches. Do not assume the remote is `origin` or the branch is `main`.

An alias, namespace, repository name, branch keyword, or Dev Hub match can suggest ownership. It cannot establish that an org is unused. Record weak or ambiguous matches as unknown.

A related branch counts as merged only when its commits are ancestors of the fetched default branch. A branch-name search alone is insufficient.

## Issue context

Search the configured tracker for exact alias, branch, or issue identifiers when available. An open related issue is a keep signal. No search hit, an inaccessible tracker, or an imprecise keyword is neutral evidence—not proof that work is complete.

## Classification

Evaluate from the most conservative applicable row:

| Evidence                                                               | Recommendation             |
| ---------------------------------------------------------------------- | -------------------------- |
| Current default, recently used, recently created, or active work       | **Keep**                   |
| Ownership or feature status is unclear, or evidence conflicts          | **Keep**                   |
| Active, older, no recent-use signal, exact related branch is merged    | **Candidate after review** |
| Active, older, and the user provides independent evidence it is unused | **Candidate after review** |
| Status is `Expired`                                                    | **Expired candidate**      |

No active-org classification means “safe to delete.” Age, alias matching, a merged branch, and no issue hits are never sufficient on their own.

## Tiebreaking and edge cases

- Recent `lastUsed` always lowers deletion confidence; never override it because a branch merged.
- No `lastUsed` value remains unknown.
- No tracker, no remote HEAD, or no clean alias-to-branch mapping remains unknown.
- Empty aliases are displayed and deleted by username only after confirmation.
- A Dev Hub is not a scratch-org deletion target.
- Require explicit confirmation naming every deletion, including expired orgs.
