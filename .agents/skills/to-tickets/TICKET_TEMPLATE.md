# Ticket Template

A ticket must stand alone: an agent with only this ticket, the spec, and the repository can implement and verify it without guessing. Give known answers, not research assignments.

## Rules

- Link the spec rather than restating it. Restate only what this ticket narrows or decides.
- Be specific: exact paths, symbols, and line ranges, with why each matters and whether to modify it or follow it as an example. Inline a signature, type, or schema when clearer than prose.
- Cite constraints (`AGENTS.md`, ADRs, conventions) by source with their effect here; don't copy them.
- Acceptance criteria are concrete and observable, never "works correctly" or "tests pass". Each maps to a test or a check.
- **Tests** lists the minimum tests that prove the criteria, at the spec's seam, extending existing test files where possible. `implement` writes these and no more.
- Use only commands verified from project configuration.
- Omit discovery history, generic advice, and obvious steps. Write `None` rather than deleting a section.

On a tracker, the H1 becomes the issue title and **Status** is the issue state; drop both from the body.

## Template

```md
# NN: <Title>

**Blocked by:** <NN: Title — the merged output it needs> | None, can start now
**Blocks:** <NN: Title, ...> | None
**Spec:** <link to the spec>
**Status:** ready | in progress | done

## Goal

<Current → target behavior and the user-visible outcome. User stories covered: <numbers>.>

## Implementation

<Decided approach and sequence: interfaces, data flow, edge and failure cases. Snippets only where they pin a decision.>

## Project references

- Modify `<path[:lines]>` / `<symbol>`: <the change and why it belongs here>
- Follow `<path[:lines]>` / `<symbol>`: <convention or example to copy>
- Constraint `<AGENTS.md | ADR | doc>`: <rule and its effect on this ticket>

## Acceptance criteria

- [ ] <Concrete observable outcome>
- [ ] <Important failure, edge, or compatibility outcome>

## Tests

- `<test file or seam>`: <the behavior it proves; which criteria>

## Verification

- `<command>`: <what it proves>

## Out of scope

- <Nearby work excluded, especially work owned by another ticket>
```
