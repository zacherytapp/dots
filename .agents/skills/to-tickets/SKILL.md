---
name: to-tickets
description: Break a plan, spec, or conversation into implementation-ready tracer-bullet tickets. Use when the user wants dependent work items published to the configured tracker.
disable-model-invocation: true
---

# To Tickets

Create small, implementation-ready tickets that deliver complete, verifiable behavior.

## Process

1. **Read the source.** Use the conversation and any supplied spec, issue, URL, or file. Read issue comments when they may contain decisions or constraints.
2. **Inspect only relevant project context.** Find the code, config, tests, project instructions, ADRs, conventions, and issue-specific constraints needed to remove implementation guesswork. Prefer precise paths and symbols over broad summaries.
3. **Draft using [TICKET_TEMPLATE.md](TICKET_TEMPLATE.md).** Each ticket must:
   - Deliver a narrow, complete path through the affected layers rather than one horizontal layer.
   - Be independently demoable or verifiable and fit one fresh agent context.
   - State only genuine blockers. No blockers means it can start immediately.
   - Put prerequisite prefactoring first when it makes later changes safer or simpler.
4. **Confirm the breakdown.** Show a numbered list with each ticket's title, blockers, and delivered behavior. Ask whether to change granularity, dependencies, or grouping. Revise until approved.
5. **Publish blockers first.** Do not close or modify the source issue.

For a wide mechanical refactor that cannot land green as vertical slices, use expand-contract: add the new form, migrate callers in independently green batches, then remove the old form after all migrations. If batches cannot be green alone, use an integration branch and a final integration-verification ticket.

For local tracking, write one ticket per `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered in dependency order, with `# <NN> - <Title>` and the repository's configured ready status. For a configured issue tracker, create one issue per ticket in dependency order and use native blocking links when available. Before applying `ready-for-agent`, verify that the label exists; otherwise use the configured equivalent or publish without inventing a label and report that choice. Ask if the tracker is unknown.

Work only tickets whose blockers are complete. Implement one at a time with `/implement`, clearing context between tickets.
