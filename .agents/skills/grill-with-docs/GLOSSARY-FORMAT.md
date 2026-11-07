# Glossary Format

`docs/glossary.md` holds the project's domain language and nothing else: no implementation details, decisions, or scratch notes.

```md
# Glossary

{One or two sentences on the domain this glossary covers.}

## {Cluster, optional}

**Order**:
A customer's request to buy one or more products.
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request
```

## Rules

- **Be opinionated.** When several words name one concept, pick the best and list the rest under `_Avoid_`.
- **Keep definitions tight.** One or two sentences; define what it is, not what it does.
- **Domain terms only.** Skip general programming concepts (timeouts, error types, utilities) even if the project uses them heavily.
- **Group under subheadings** only when natural clusters emerge.

If the repo has several bounded contexts with separate glossaries, add `docs/glossary-map.md` listing each context, where its glossary lives, and how the contexts relate. Infer which context the current topic belongs to; ask if unclear.
