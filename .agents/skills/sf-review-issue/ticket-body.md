# Salesforce Specs and Tickets

Salesforce work items use the shared templates and every rule they carry. Add the Salesforce detail below; don't invent another structure.

## Specs

A Salesforce spec follows [SPEC_TEMPLATE.md](../to-spec/SPEC_TEMPLATE.md) and, like any spec, names no file paths. Its **Implementation decisions** settle the data model, the automation choice (Apex or Flow, synchronous or asynchronous), the security model (sharing, CRUD/FLS, permission sets), and the org setup convention. The exact artifacts belong in tickets.

## Tickets

A Salesforce ticket follows [TICKET_TEMPLATE.md](../to-tickets/TICKET_TEMPLATE.md): blocking edges at the top, exact references, concrete criteria, and a minimal **Tests** list. Fill its sections like this:

| Template section       | Salesforce content                                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Implementation**     | The approach plus the deploy order for the phases in play: objects and fields → permission sets → Apex → draft Flows → activation  |
| **Project references** | The Touch / Create map from [inventory.md](inventory.md): classes, methods, field API names, LWC, Flows, permission sets           |
| **Tests**              | Test classes and methods to extend or create, with the bulk, permission, and mock cases only where the change introduces that risk |
| **Verification**       | Focused `sf apex run test --tests <Class.method>` and Jest commands, then the final `--dry-run` deploy with `RunLocalTests`        |

Add two sections after **Implementation**:

```md
## Org & setup

<The block from org-setup.md: org, standup commands, permission sets, seed data, validation>

## Salesforce constraints

<Only the risks from gotchas.md that apply, each specific: the limit at risk and where>
```

## Updating the source

Follow [review-issue](../review-issue/SKILL.md#workflow): propose exact replacement text by default, and edit only when the user asked for updates or authorized them. When authorized:

- **Docs:** edit the spec or ticket file under `docs/specs/<feature-slug>/`.
- **GitHub:** `gh issue view <n> --comments`, then `gh issue edit <n> --body-file <file>`.
- **Forgejo/Gitea:** read the body and comments, then replace the body, with the configured Forgejo tools.

Preserve the title, labels, and still-true original content. Fold each comment's durable content (decisions, constraints, links, corrections) into the relevant section rather than dumping it, then add a trailer:

```md
---

_Consolidated from N prior comments during review._
```

Don't delete comment history; add one brief comment noting the body now supersedes the thread. Deleting someone else's comment is a stop-and-ask.

## The self-contained test

Before finishing: could an implementer complete the ticket having opened only the links inside it, with no repo hunting, comment thread, or org guessing? If not, it isn't ready.
