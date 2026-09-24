# Command parsing utilities

Implemented as bash functions inside [`safety-hook.sh`](safety-hook.sh).

The local implementation includes helpers for:

- whitespace normalization,
- first-token alias expansion,
- top-level command splitting on shell operators,
- command-substitution extraction for `$()` and backticks,
- recursive command extraction for safety checks.
