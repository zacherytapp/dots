---
name: review-and-commit
description: Reviews pending changes and autonomously creates project-appropriate commits scoped to the current directory. Use when the user wants a pre-commit review or asks to review and commit, optionally with branch, issue, scope, or message context.
disable-model-invocation: true
---

# Review and Commit

Review and commit autonomously. A normal invocation authorizes a commit; do not ask for routine approval of the message, staged files, or commit action. Ask only when repository convention is genuinely unclear or a material uncertainty makes the commit unsafe or speculative.

## 1. Establish scope and context

- Operate in the Git repository containing the invocation's current directory.
- Scope changes to the current directory and its descendants. At repository root, this means the whole repository.
- Use invocation details such as branch purpose, issue or ticket, intended change, required scope, files, or message wording as context. Do not require these details when the diff is sufficient.
- Inspect the active branch. Treat a mentioned branch as context unless the user explicitly asks to switch; ask if a material branch mismatch cannot be resolved safely.
- Preserve changes outside scope. Detect pre-staged out-of-scope paths before committing and avoid sweeping them into the commit.
- If there are no in-scope changes, stop and report that without asking for confirmation.

## 2. Inspect repository state

Collect only what is needed:

- `git status` (avoid `-uall`)
- In-scope `git diff` and `git diff --staged`
- `git log -n 10 --oneline` to sample actual commit style
- Relevant repository instructions and commit tooling

## 3. Determine the convention

Prefer, in order:

1. Explicit rules in `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `.gitmessage`, commit templates, or equivalent documentation.
2. Enforced rules from commitlint, hooks, release tooling, package scripts, or CI.
3. Consistent repository precedent from recent history.
4. Conventional Commits 1.0.0 with readable 50/72-style subjects and bodies as the fallback.

Project rules override the fallback. If evidence conflicts and the choice would materially change the commit, ask one focused question; absence of a project-specific rule is not itself ambiguous because the fallback applies.

## 4. Review and validate

Before staging, inspect for:

- Secrets, credentials, keys, certificates, tokens, or sensitive `.env*` files
- Debug leftovers, stray TODO/XXX markers, generated artifacts, editor files, and broad formatting noise
- Unrelated or mixed concerns
- Destructive or behavior-changing work not explained by the diff or invocation context
- Known or newly discovered test, lint, typecheck, or hook failures

Run repository-required or proportionate checks when practical. Fix directly related, mechanical failures autonomously and re-run the check. Ask before a fix that changes behavior, broadens scope, or requires choosing among plausible outcomes.

If multiple commits are clearly warranted and their boundaries are unambiguous, create them autonomously in dependency order. If boundaries or intent are unclear, ask rather than guessing. Leave clearly out-of-scope files untouched and report them.

## 5. Draft and commit

When convention and intent are clear, proceed without presenting a proposal:

- Stage only reviewed, in-scope files by explicit path; avoid `git add .` and `git add -A`.
- Use the repository convention and invocation context for the message.
- Explain why and non-obvious constraints in the body only when useful.
- Include issue, ADR, breaking-change, or other footers only when clearly connected or required.
- Use a heredoc or equivalent for multi-line messages.
- Do not use `--no-verify` unless explicitly requested.
- If hooks fail, diagnose them, make only unambiguous related fixes, and retry. Ask when resolution requires a judgment call.
- Do not amend, switch branches, or push unless explicitly requested.

For the fallback convention, use an appropriate type (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `style`, `build`, `ci`, or `revert`), an evident scope when useful, and a concise imperative subject without a trailing period.

## Ask only for material uncertainty

Ask the minimum focused question needed when:

- Commit conventions conflict or cannot be applied confidently.
- Intended scope, ownership, message meaning, split boundaries, or branch target cannot be inferred reliably.
- Likely secrets, unexplained destructive changes, unrelated staged work, or suspicious artifacts make inclusion unsafe.
- A failing validation or hook requires a non-mechanical fix or an explicit tradeoff.
- A requested history-changing operation has an uncertain target or authorization.

Do not turn review flags into a generic approval gate. If the evidence supports a safe decision, make it and commit.

## Report

Return each commit hash and subject, checks run, and any remaining uncommitted or out-of-scope files.
