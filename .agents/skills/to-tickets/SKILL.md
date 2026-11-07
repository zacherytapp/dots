---
name: to-tickets
description: Breaks a spec into the fewest, largest implementation-ready tickets with explicit blocking edges, using a fixed template, saved under docs/specs/ or to the project's tracker. Use when the user wants a spec, plan, or issue turned into tickets for agents to implement.
disable-model-invocation: true
---

# To Tickets

Workflow: `grill-with-docs` → `to-spec` → **`to-tickets`** → `implement`. Suggest `review-issue` when the tickets need a readiness gate.

A ticket is the largest vertical slice one agent can build, verify, and commit in a single fresh session. Prefer fewer, bigger tickets: every split adds a handoff, a merge, and a blocking edge to get wrong.

## Sizing

Start from one ticket for the whole spec. Split only when:

1. it won't fit one agent session;
2. part of it is a genuine prerequisite, such as a prefactor or a schema or contract that other work builds on; or
3. independent parts can run in parallel and each is still substantial.

Each ticket delivers working, verifiable behavior through every layer it touches. Never create a ticket for one layer alone ("the schema", "the UI") or for tests, docs, or cleanup alone; fold those into the ticket whose behavior they serve. "Make the change easy, then make the easy change": prefactoring goes first, in its own ticket only when other tickets block on it.

**Wide refactors** are the exception. When one mechanical change (renaming a column, retyping a shared symbol) breaks too many call sites to land green, use expand–contract: one ticket adds the new form beside the old; migration tickets, each blocked by the expand, move callers in batches sized by blast radius; a final contract ticket, blocked by every batch, deletes the old form. If batches can't stay green alone, they share an integration branch and block a final integrate-and-verify ticket.

## Blocking

- Ticket B is blocked by A only when B cannot start without A's merged output. Give the reason with each edge ("needs the `Invoice` table from 01"). Touching the same files or a preferred order is not a blocker.
- No cycles. Number tickets in dependency order, blockers first, from `01`.
- Every ticket states **Blocked by** and **Blocks** at the top, with `None` when empty.

## Process

1. **Read the source.** The spec (path, issue, or conversation), including issue comments. If its open questions change the breakdown, stop, list them, and suggest `grill-with-docs`.
2. **Explore the code** the spec touches. Tickets ship next, so unlike the spec they name exact paths, symbols, conventions, and test commands verified from project config.
3. **Propose the breakdown** as a table and name the frontier (tickets that can start now):

   | #   | Title | Blocked by | Delivers (user stories) |
   | --- | ----- | ---------- | ----------------------- |

   Ask whether any tickets should merge, split, or be re-wired. Revise until approved.

4. **Write** each ticket with [TICKET_TEMPLATE.md](TICKET_TEMPLATE.md).
5. **Publish in dependency order**, where the spec lives:
   - **Tracker:** one issue per ticket, as sub-issues of the spec issue when supported. Use native blocking links when the tracker has them and keep the text lines too. Apply the project's ready label only if it exists.
   - **Docs:** `docs/specs/<feature-slug>/tickets/NN-<slug>.md`, one file per ticket.

   Set the spec's **Tickets** line. Don't otherwise modify or close the spec.

6. **Report** the tickets and the frontier, then suggest `implement`.
