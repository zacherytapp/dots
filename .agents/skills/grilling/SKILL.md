---
name: grilling
description: Grills the user relentlessly about a plan, decision, or idea in rounds of numbered questions with recommended answers. Use when the user wants to stress-test their thinking before building, or uses any 'grill' trigger phrase.
---

<!-- Adapted from https://github.com/mattpocock/skills (MIT), skills/productivity/grilling -->

# Grilling

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Format a round like so:

```md
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Word each question so "yes" accepts your recommended answer.

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (code, docs, tools), dispatch a subagent with a fresh context window to find it, or look it up yourself when subagents aren't available. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.

## Visual companion

Don't offer the visual companion upfront. The first time a frontier question would genuinely be clearer shown than described, send only this offer before that round and wait:

> This next part might be easier if I show you — I can put together mockups, diagrams, and comparisons in a browser tab as we go. It can be token-intensive. Want me to? I'll open it for you.

If accepted, read [visual-companion.md](visual-companion.md) and start it with `--open`. Use the browser only for genuinely visual questions (mockups, layouts, flow or architecture diagrams); keep everything else in the terminal round. If declined, don't offer again unless the user asks.
