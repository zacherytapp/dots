# ADR Format

ADRs live in `docs/adr/` as `NNNN-<slug>.md`. Take the next number after the highest existing one.

```md
# {Short title of the decision}

{1-3 sentences: the context, what we decided, and why.}
```

An ADR can be a single paragraph. The value is recording _that_ a decision was made and _why_. Add these only when they earn their place:

- **Status** (`proposed | accepted | deprecated | superseded by ADR-NNNN`), when decisions get revisited.
- **Considered options**, when the rejected alternatives are worth remembering.
- **Consequences**, when downstream effects are non-obvious.

## When to write one

All three must hold:

1. **Hard to reverse:** changing your mind later is costly.
2. **Surprising without context:** a future reader would ask "why on earth did they do it this way?"
3. **A real trade-off:** there were genuine alternatives and one was picked for specific reasons.

Typical qualifiers: architectural shape, integration patterns between contexts, technology choices with lock-in, ownership and scope boundaries, deliberate deviations from the obvious path, constraints invisible in the code, and non-obvious rejected alternatives.
