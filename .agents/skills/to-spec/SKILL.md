---
name: to-spec
description: Turns the current conversation into a spec and publishes it to the project issue tracker. Use when the user wants pure synthesis without another interview.
disable-model-invocation: true
---

# To Spec

Synthesize only from the conversation, codebase, and durable project sources. Do not interview the user. Infer testing seams and record material uncertainty instead of requesting confirmation. Ask only when the publishing target itself is unavailable.

## Process

1. Explore relevant code, ADRs, conventions, and domain language. Distinguish verified facts from assumptions.
2. Choose the highest practical existing test seam. Introduce fewer seams rather than many; explain any proposed new seam and record uncertainty in Further Notes.
3. Write the specification using the template below. Do not include volatile file paths or implementation snippets unless a small prototype-derived shape records a decision more precisely than prose.
4. Publish to the configured issue tracker. Before applying `ready-for-agent`, verify that the label exists. If it does not, use the repository's configured equivalent; if none exists, publish without inventing one and report the omission.

## Specification template

### Problem Statement

Describe the user's problem from the user's perspective.

### Solution

Describe the intended outcome from the user's perspective.

### User Stories

Provide a numbered list in this form:

1. As an `<actor>`, I want `<capability>`, so that `<benefit>`.

Cover the meaningful workflows without manufacturing speculative requirements.

### Implementation Decisions

Record settled module boundaries, interfaces, architecture, schema, API contracts, and interactions. Do not present uncertainty as a decision.

### Testing Decisions

Describe observable behavior, selected test seams, affected modules, relevant prior art, and regression coverage. Prefer behavior tests over implementation-detail tests.

### Out of Scope

State explicit non-goals and adjacent work excluded from the specification.

### Further Notes

Record source links, assumptions, and unresolved uncertainty that does not justify another interview in this synthesis workflow.
