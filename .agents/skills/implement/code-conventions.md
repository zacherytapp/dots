# Conventions

## Non-Negotiable Standards

1. Be **ambitious about structural simplification**. Assume a "code judo" move usually exists — a reorganization that uses the existing architecture to make the change dramatically simpler. Prefer deleting complexity over rearranging it.
2. Reframe so whole branches, helpers, modes, conditionals, or layers disappear. Aim for the solution that feels inevitable in hindsight, not just "a bit cleaner."
3. Clean the design, don't just accept working code. If structure can get meaningfully cleaner with the same behavior, do it.
4. Don't let new ad-hoc conditionals, scattered special cases, or one-off branches accrete in existing flows.
5. Don't grow a file from under 1k lines to over 1k lines without a very strong reason.
6. Prefer direct, boring, maintainable code over hacky or magical code.
7. Keep types and boundaries clean. Question unnecessary optionality, `unknown`, `any`, or cast-heavy code. Prefer explicit typed models or shared contracts over loosely-shaped ad-hoc objects.
8. Keep comments rare — code should be self-explanatory through naming, structure, and logic. Comment only to explain a non-obvious _why_.

## Branch Naming

Short, descriptive, kebab-case, and always including the issue number(s):

- Intent prefix: `feature/` (new behavior), `fix/` (bugs), `refactor/` (behavior-preserving), `test/`, `docs/`, `chore/`.
- Include the ticket ID: `fix/1234-handle-expired-token`, `feature/PROJ-42-add-export-flow`.
- Name the outcome, not the implementation detail: `fix/search-empty-state`, not `fix/change-if-statement`.
- No vague names (`work`, `wip`, `misc`, `fix-stuff`) and no reusing old branch names for new work.

## Red Flags

- A change adds branching, modes, flags, or optional behavior without making the overall design simpler.
- One concept is spread across many files when it could be one clear module or boundary.
- A helper, abstraction, or service only passes data through without hiding meaningful complexity.
- Many casts, broad `any`/`unknown`, or loosely-shaped objects where a clear type or contract belongs.
- A file nears or passes 1k lines because behavior is appended instead of reorganized.
- Tests couple to private helpers or implementation details instead of observable behavior.
- A fix relies on timing, ordering accidents, global mutable state, or hidden side effects.
- Comments explain confusing code that clearer naming, structure, or types could fix.
- The PR mixes unrelated refactors, features, bug fixes, or formatting.
- It works locally but leaves unclear validation, missing tests for critical paths, or uninvestigated failing checks.
