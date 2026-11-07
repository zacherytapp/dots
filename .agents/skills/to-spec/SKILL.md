---
name: to-spec
description: Synthesizes the conversation and codebase into one large, implementation-ready spec using a fixed template, saved under docs/specs/ or to the project's tracker. Use when the user wants a spec or PRD written up after discussing or grilling a feature.
disable-model-invocation: true
---

# To Spec

Workflow: `grill-with-docs` → **`to-spec`** → `to-tickets` → `implement`. Suggest `review-issue` when the spec needs a readiness gate.

Synthesize what is already known: the conversation, the codebase, the glossary, and ADRs. Don't interview the user. Record a missing decision under **Open questions** instead of inventing an answer; if many core decisions are missing, stop and suggest `grill-with-docs` first.

## Process

1. **Gather.** Reread the conversation. Explore the code the feature touches, the glossary (`docs/glossary.md` or the project's equivalent), and ADRs. Use glossary terms throughout; respect ADRs or call out the conflict.
2. **Size it big.** One spec covers the whole feature or coherent change, across every surface it touches. Split into separate specs only when the parts ship and deliver value independently.
3. **Pick the test seam.** Prefer the highest existing seam that exercises the feature through its public behavior; the ideal is one. List only the behaviors that prove the user stories work.
4. **Write** with [SPEC_TEMPLATE.md](SPEC_TEMPLATE.md). Keep every section; write `None` where a section has nothing.
5. **Publish.**
   - When the user or the project's agent instructions name an issue tracker, create one issue: the spec title as the issue title, the rest as its body. Apply the project's ready label only if it exists.
   - Otherwise write `docs/specs/<feature-slug>/spec.md`, creating `docs/` if needed. Don't infer a tracker from a git remote alone.
6. **Report** the spec's location and any open questions, then suggest `to-tickets`.
