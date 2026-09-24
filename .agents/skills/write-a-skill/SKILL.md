---
name: write-a-skill
description: Create agent skills with canonical structure, progressive disclosure, and bundled resources. Use when the user wants to create, write, or revise a skill.
disable-model-invocation: true
---

# Writing Skills

## Process

1. Gather the task, trigger conditions, use cases, and required scripts or references.
2. Draft a concise `SKILL.md`; add references for detail and scripts for deterministic operations.
3. Review the draft with the user for missing cases and excess detail.
4. Run the repository skill validator.

## Structure

```text
skill-name/
├── SKILL.md           # Required instructions
├── REFERENCE.md       # Optional detailed documentation
├── EXAMPLES.md        # Optional examples
└── scripts/           # Optional utilities
    └── helper.js
```

References must be one level deep from `SKILL.md`.

## Template

```md
---
name: skill-name
description: Brief capability. Use when [specific triggers].
---

# Skill Name

## Quick start

[Minimal workflow]

## Workflows

[Steps and checks]

## References

Read the relevant reference file when [condition].
```

## Description requirements

The description is the only text available when an agent decides whether to load a skill.

- Maximum 1024 characters.
- Write in the third person.
- State the capability first.
- Include a second sentence beginning with literal `Use when` and concrete triggers.

Good: `Extract text and tables from PDFs. Use when the user mentions PDFs, forms, or document extraction.`

Bad: `Helps with documents.`

## Scripts and references

Add a script when an operation is deterministic, repeated, or needs explicit error handling. Add a reference when `SKILL.md` would exceed 100 lines, content serves a distinct domain, or advanced material is rarely needed. Do not duplicate reference content in `SKILL.md`.

## Checklist

- [ ] Frontmatter name matches the directory.
- [ ] Description includes literal `Use when` triggers.
- [ ] `SKILL.md` is at most 100 lines.
- [ ] Instructions are concise and not time-sensitive.
- [ ] Terminology is consistent and examples are concrete.
- [ ] Relative links resolve and references are one level deep.
- [ ] Named skill dependencies are installed.
