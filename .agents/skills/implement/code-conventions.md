# Code Conventions

The shared bar for `implement` (writing code) and `review-code` (judging it). The project's documented standards take precedence.

## Standards

1. **Ambition.** Assume a "code judo" move exists: a reorganization that uses the existing architecture to make the change dramatically simpler, so whole branches, helpers, modes, or layers disappear. Prefer deleting complexity over rearranging it; aim for the version that feels inevitable in hindsight.
2. **No spaghetti growth.** Don't scatter new ad-hoc conditionals, special cases, or one-off branches through existing flows. Put the logic in a dedicated helper, state machine, policy object, or module.
3. **File size.** Don't push a file from under 1k lines to over 1k without a compelling structural reason.
4. **Direct, boring code.** No hacky or magical mechanisms, thin wrappers, identity functions, or pass-through helpers that add indirection without clarity.
5. **Types and boundaries.** Question optionality, `unknown`, `any`, and casts. Prefer explicit typed models and shared contracts over loosely shaped objects. Don't paper over an unclear invariant with a silent fallback; make the boundary explicit.
6. **Canonical layer.** Put logic in the layer that owns the concept and reuse existing helpers. Don't leak feature logic into shared paths or implementation details through APIs, and don't add near-duplicate helpers.
7. **Concurrency and state.** Parallelize independent work that is serialized for no reason; make related updates atomic so state can't be left half-applied. Don't rely on timing, ordering accidents, global mutable state, or hidden side effects.
8. **Comments.** Rare. Let naming and structure explain the code; comment only a non-obvious _why_.
9. **Tests.** The fewest behavior tests that prove the acceptance criteria, through public interfaces. Flag both missing proof of a criterion and tests coupled to private helpers or duplicating coverage.
10. **Scope.** One concern per change. No unrelated refactors, features, or formatting.

## Design

- **Deep modules.** Small interface, substantial hidden implementation. Ask: can I reduce the methods, simplify the parameters, or hide more complexity inside?
- **Testable interfaces.** Accept dependencies you would otherwise have to fake (I/O, network, clock) instead of constructing them inside; return results instead of mutating shared state. Don't add injection where nothing needs swapping.
- **After it works,** within the ticket's scope: remove duplication, deepen shallow modules, move logic to where its data lives, and fix existing code the change shows is wrong.

## Branch naming

Short, kebab-case, outcome-focused, and including the ticket ID:

- Prefix by intent: `feature/`, `fix/`, `refactor/` (behavior-preserving), `test/`, `docs/`, `chore/`.
- Examples: `fix/1234-handle-expired-token`, `feature/PROJ-42-add-export-flow`.
- Name the outcome, not the mechanism: `fix/search-empty-state`, not `fix/change-if-statement`.
- No vague names (`wip`, `misc`, `fix-stuff`) and no reused branch names.
