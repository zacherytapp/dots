# Writing Agent Briefs

An agent brief is the comment posted when an issue moves to `ready-for-agent`. It is the contract an AFK agent works from: the body and discussion are context, the brief is authoritative. An agent with only the brief and the repository must be able to build and verify the change without guessing or asking.

For a PR, the brief states what's left to do to the existing diff: finish it, close gaps, address review points.

## Principles

- **Decided, not open.** Record every decision settled during triage with its answer. If a decision is still open, the issue isn't ready.
- **Behavioral contracts first.** Describe what the system should do, current versus desired, including edge and failure cases. Leave implementation choices to the agent unless triage decided them.
- **Concrete pointers, verified.** Name the paths, symbols, scripts, and commands the agent needs, each with its role: modify, follow as an example, or run to verify. Take commands from project config (package scripts, task runners, CI), not memory. Prefer symbols and commands over line numbers, which go stale.
- **Cite constraints, don't copy them.** Point to `AGENTS.md`, ADRs, or conventions with their effect on this issue.
- **Testable acceptance criteria.** Each criterion is observable and maps to a test or a command, never "works correctly".
- **Explicit scope.** State what is out of scope, especially work owned by another issue.
- **Consolidated issues** list every absorbed issue so nothing they asked for is lost.

## Template

```markdown
## Agent Brief

**Category:** bug / enhancement
**Summary:** one line on what needs to happen
**Blocked by:** #N (the merged output it needs) | None
**Absorbs:** #N, #M | None

**Current behavior:**
What happens now. For bugs, the broken behavior and how it was reproduced.

**Desired behavior:**
What should happen after the work, including edge and error cases.

**Decisions:**

- Question settled during triage: the answer

**Project references:**

- Modify `path` / `symbol`: the change and why it belongs here
- Follow `path` / `symbol`: the convention or example to copy
- Run `command`: what it sets up, generates, or checks
- Constraint `AGENTS.md | ADR | doc`: the rule and its effect here

**Acceptance criteria:**

- [ ] Concrete observable outcome
- [ ] Important failure, edge, or compatibility outcome

**Verification:**

- `command`: what it proves

**Out of scope:**

- Adjacent work that should not be touched
```

## Example

```markdown
## Agent Brief

**Category:** bug
**Summary:** Skill description truncation cuts mid-word
**Blocked by:** None
**Absorbs:** #58 (same truncation in the skill list view)

**Current behavior:**
Descriptions over 1024 characters are cut at exactly 1024, ending mid-word
("Use when the user wants to confi"). Reproduced with a 1100-character fixture.

**Desired behavior:**
Truncation breaks at the last word boundary before 1024 characters and appends
"...", in both the loader and the list view.

**Decisions:**

- Keep the 1024 limit including the ellipsis: yes
- Warn on truncation: no, truncate silently

**Project references:**

- Modify `parseFrontmatter()`: the single place descriptions are read
- Follow `truncateTitle()`: existing word-boundary helper; reuse it
- Constraint `AGENTS.md`: tests run under `pnpm test`, no new test runner

**Acceptance criteria:**

- [ ] Descriptions of 1024 characters or fewer are unchanged
- [ ] Longer descriptions end at a word boundary with "...", total at most 1024
- [ ] The list view shows the same truncated text as the loader

**Verification:**

- `pnpm test`: covers both criteria with one new fixture
- `pnpm check`: lint and typecheck stay green

**Out of scope:**

- Changing the 1024 limit
- Multi-line descriptions
```

A bad brief says "the triage thing is broken, look around line 150": no category, no current versus desired behavior, unverified pointers, no decisions, no acceptance criteria, and no scope.
