---
name: grill-with-docs
description: Sharpen a plan through a relentless interview while producing ADR and glossary artifacts. Use when the user wants both design grilling and durable documentation.
disable-model-invocation: true
---

# Grill With Docs

Run the `/grilling` workflow, preserving its one-question-at-a-time interview and just-in-time visual companion behavior.

During the interview, keep a decision log and a vocabulary list. After the user ends the interview:

1. Update an existing project glossary, or create `docs/glossary.md` when no convention exists. Add only terms whose meaning was clarified; include the preferred term, concise definition, and aliases to avoid.
2. For each durable architectural decision, update the relevant existing ADR or create one in the repository's ADR location. If no convention exists, use `docs/adr/NNNN-<decision>.md` with Context, Decision, Consequences, and Status sections.
3. Do not create an ADR for tentative discussion, ordinary implementation detail, or a choice already covered by an existing decision.
4. Show the proposed artifact changes before writing them unless the user already asked for documentation updates.
5. Report unresolved questions separately; never record an unresolved option as a settled decision.
