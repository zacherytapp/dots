# Ticket Template

A ticket must stand alone without the source conversation. Give the implementer known answers, not a research assignment. Keep only facts needed to implement and verify the slice.

## Content Rules

- State observable behavior, scope, and important failure behavior.
- Specify the intended approach, sequence, interfaces, data flow, edge cases, and constraints already decided.
- State applicable project-wide and issue-specific constraints: architecture, conventions, code style, compatibility, security, tooling, and required system boundaries. Cite their source instead of copying lengthy rules.
- Include concise code, types, schemas, signatures, or pseudocode when clearer than prose.
- Cite exact project paths plus symbols or line ranges when useful. Say why each source matters and whether to modify it or follow it as an example.
- Point to project sources instead of copying lengthy or drift-prone content.
- Include focused test commands verified from project configuration. Do not invent commands.
- Separate requirements from optional suggestions. Omit discovery history, generic advice, and obvious implementation steps.
- Use concrete acceptance criteria. Do not use vague checks such as "works correctly" or "tests pass."

Omit optional sections that add no useful information.

```md
## Parent

<Source issue reference; optional>

## What to build

<Current-to-target behavior, user-visible outcome, and scope>

## Implementation

<Specific change sequence, decisions, boundaries, edge cases, and constraints>

<Decision-rich snippet, if useful>

## Constraints

- `<source path, ADR, or issue comment>`: <applicable rule and its implementation effect>

## Project references

- Modify `<path[:line]>` / `<symbol>`: <expected change and why it belongs here>
- Follow `<path[:line]>` / `<symbol>`: <relevant convention or example>
- Test `<path[:line]>` / `<symbol>`: <coverage to add or update>

## Out of scope

- <Nearby work explicitly excluded; optional>

## Acceptance criteria

- [ ] <Concrete observable or testable outcome>
- [ ] <Important error, edge case, or compatibility outcome>

## Verification

- `<focused command>`: <what it proves>

## Blocked by

<Ticket references or `None - can start immediately`>
```
