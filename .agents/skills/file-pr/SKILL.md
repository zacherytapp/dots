---
name: file-pr
description: Creates clear pull requests on GitHub and Forgejo/Gitea. Use when the user asks to open, create, or file a pull request.
disable-model-invocation: false
user-invocable: true
---

# File a Pull Request

Package committed work into a pull request that is easy to understand, review, and merge.

## 1. Prepare the Branch

- Read the user's request, repository instructions, and pull request template.
- Identify the base repository, its matching remote, and the actual base branch from provider/project context. Fetch that remote, then inspect `<base-remote>/<base>..HEAD`; never assume `origin` owns the base.
- Review the full diff and confirm the branch contains only the intended work.
- Rebase or merge the current base according to project convention. Ask before rewriting shared history.
- Squash fixup commits. Prefer a compact history; retain separate logical commits only when the project benefits from them.
- Determine the host from the remote and project context: use `gh` for GitHub and `tea` for Forgejo/Gitea. Ask if ambiguous.

## 2. Write the Title

Unless the repository requires another format, use `<type>(<scope>): <plain-language outcome>`. Omit the scope only when no concise, recognizable area applies.

| Type       | Use                                                     |
| ---------- | ------------------------------------------------------- |
| `feat`     | New feature                                             |
| `fix`      | Bug fix                                                 |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `docs`     | Documentation only                                      |
| `test`     | Adding or fixing tests                                  |
| `chore`    | Build, CI, dependencies, or tooling                     |
| `perf`     | Performance improvement                                 |

Examples:

- `feat(web): add dark mode toggle to settings`
- `fix(shared): prevent duplicate checkout submissions`
- `refactor(auth): move authentication checks into shared middleware`

Keep the text after the prefix short and understandable. Avoid vague wording, unexplained acronyms, internal identifiers, and implementation details.

## 3. Write the Description

- Explain what changed and why before how it was implemented.
- Copy the user's exact words about what the work resolves or relates to whenever possible. If context is needed, quote those words and add a plain explanation rather than replacing them with jargon.
- Use short sentences and concrete terms. Explain unavoidable technical terms.
- Use `Closes #123` only when the work fully resolves the issue; otherwise use `Related to #123`. Never invent a relationship.
- Use the repository template when present. Otherwise use only the applicable sections below; remove placeholders and empty sections.

```markdown
## Summary

What changed and why, in plain language.

Closes #123

## Changes

- Concrete change and its effect

## Test Plan

- [ ] Check performed and expected result
```

State exactly what was tested. If a check was not run, say so and explain why.

## 4. Self-Review

- Read every line of the diff and compare every description claim with it.
- Remove debug output, stale TODOs, commented-out code, boilerplate, jargon, and repetition.
- Check for secrets, `.env` files, lockfile conflicts, and accidental changes.
- Run applicable tests, type checks, and lint commands, such as `npm test`, `npx tsc --noEmit`, and `npm run lint`. Never claim an unrun check passed.
- Ensure the title and first paragraph make sense without reading the code.

## 5. Create the Pull Request

Resolve the writable head remote separately from the base remote. Push with `git push -u <head-remote> HEAD`, save the reviewed body to `$body_file`, and use the detected host:

```bash
# GitHub
gh pr create --base "$base" --head "$branch" --title "$title" --body-file "$body_file"

# Forgejo or Gitea
tea pulls create --remote <base-or-provider-remote> --base "$base" --head "$branch" \
  --title "$title" --description "$(cat "$body_file")"
```

Always use `tea pulls create` for Forgejo/Gitea; never use `gh` or a browser fallback. Capture the pull request URL.

## 6. Make Review Easier

- Request appropriate code owners or domain reviewers. Add labels only after verifying they exist and match repository workflow; provider approval or requested-changes states are reviews, not labels.
- Note dependencies. For changes over 400 lines, explain the best review order.
- Add screenshots or recordings for visible changes and use a draft for early feedback.
- Aim for fewer than 300 changed lines; split larger work into focused or stacked pull requests when practical.

Return the PR URL, base and head identities, and checks run while preparing it. Do not wait for CI, process review feedback, or resolve conflicts; hand those responsibilities to `babysit-pr` when requested or when the caller composes the full PR lifecycle.
