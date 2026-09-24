---
name: grilling
description: Grill the user relentlessly about a plan or design. Use when the user wants to stress-test a plan before building, or uses any 'grill' trigger phrases.
---

# Grilling

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask one question at a time and wait for feedback before continuing. Multiple questions at once are bewildering.

If a _fact_ can be found by exploring the codebase, look it up rather than asking me. The _decisions_, though, are mine — put each one to me and wait for my answer.

## Visual companion

Do not offer the visual companion upfront. The first time a pending question would genuinely be clearer shown than described, send only this offer and wait:

> This next part might be easier if I show you — I can put together mockups, diagrams, and comparisons in a browser tab as we go. It can be token-intensive. Want me to? I'll open it for you.

If accepted, read [visual-companion.md](visual-companion.md) and start it with `--open`. Decide per question: use the browser for mockups, layout comparisons, architecture or flow diagrams, and spatial relationships; keep requirements, trade-offs, scope, and other textual decisions in the terminal. If no genuinely visual question arises, never offer it. If declined, do not offer again unless the user asks.

Do not enact the plan until I confirm we have reached a shared understanding.
