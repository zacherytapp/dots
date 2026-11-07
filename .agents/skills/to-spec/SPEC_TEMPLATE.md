# Spec Template

A spec describes the whole feature: what and why, every decision already made, and how we'll know it works. Tickets carry the file-level detail, so the spec stays stable while code moves.

## Rules

- Be exhaustive about behavior and decisions; be brief about everything else.
- Use the glossary's terms. Link ADRs instead of restating them.
- No file paths or code: they go stale. Exception: a small type shape, schema, or state machine that pins a decision more precisely than prose. Trim it to the decision.
- Never present an assumption as a decision. Unsettled points go under **Open questions**.
- Testing names the minimum behaviors that prove the feature. It is not a coverage plan.

## Template

```md
# <Feature title>

**Status:** draft | ready | in progress | done
**Tickets:** <tracker links, or `docs/specs/<feature-slug>/tickets/`; set by to-tickets>
**Sources:** <issues, threads, ADRs, and prototypes this spec draws on>

## Problem

<Who is affected, what is wrong today, and why it matters now, from the user's perspective.>

## Solution

<The end state from the user's perspective, in one or two paragraphs.>

## User stories

1. As a <actor>, I want <capability>, so that <benefit>.

<A long list covering every actor, the main flows, edge cases, failures, and admin or operational flows.>

## Implementation decisions

- **Modules:** <modules built or changed, and what each owns>
- **Interfaces:** <public interfaces and contracts added or changed>
- **Data:** <schema, migrations, persistence, compatibility>
- **Behavior:** <rules, state transitions, failure handling, security boundaries>
- **Rejected alternatives:** <only the non-obvious ones, with the reason>

## Testing

- **Seam:** <the one highest-level seam the tests drive, or the few if one can't cover it>
- **Behaviors to prove:** <the minimum list, each mapped to user story numbers>
- **Prior art:** <existing tests in the codebase to imitate>

## Out of scope

- <Adjacent work explicitly excluded>

## Open questions

- <Unresolved decision, and which stories it blocks; `None` when ready>
```
