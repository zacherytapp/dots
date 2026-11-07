---
name: grill-with-docs
description: Grills the user about a plan while sharpening the project's domain language and recording the glossary and ADRs under docs/. Use when the user wants a plan stress-tested before writing a spec, or wants design decisions captured as durable docs.
disable-model-invocation: true
---

<!-- Adapted from https://github.com/mattpocock/skills (MIT): grill-with-docs and domain-modeling -->

# Grill With Docs

Workflow: **`grill-with-docs`** → `to-spec` → `to-tickets` → `implement`.

Run the `grilling` skill. While it runs, also build the domain model as below. When the user confirms shared understanding, summarize the decisions and suggest `to-spec`.

## Docs layout

```text
docs/
├── glossary.md          # domain language, created when the first term is resolved
└── adr/
    └── 0001-<slug>.md   # one file per decision, created when the first ADR is needed
```

Follow the project's existing glossary or ADR location instead if it has one. Create files lazily, never empty.

## During the session

- **Challenge against the glossary.** When the user uses a term that conflicts with the glossary, call it out at once: "The glossary defines 'cancellation' as X, but you seem to mean Y. Which is it?"
- **Sharpen fuzzy language.** When a term is vague or overloaded, propose a precise canonical one: "By 'account', do you mean the Customer or the User?"
- **Probe with scenarios.** Invent concrete edge-case scenarios that force precise boundaries between concepts.
- **Cross-reference the code.** When the user states how something works, check whether the code agrees and surface contradictions.
- **Update the glossary inline.** When a term is resolved, write it to the glossary then, following [GLOSSARY-FORMAT.md](GLOSSARY-FORMAT.md). Don't batch.
- **Offer ADRs sparingly.** Only when a decision is hard to reverse, surprising without context, and the result of a real trade-off. Write it on approval, following [ADR-FORMAT.md](ADR-FORMAT.md).

Never record an unresolved option as settled; carry it into the spec's Open questions instead.
