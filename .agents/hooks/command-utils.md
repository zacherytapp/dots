# Command parsing utilities

Implemented as functions inside [`safety-hook.ts`](safety-hook.ts).

The local implementation includes helpers for:

- whitespace normalization,
- first-token alias expansion,
- top-level command splitting on shell operators,
- command-substitution extraction for `$()` and backticks,
- recursive command extraction for safety checks.
