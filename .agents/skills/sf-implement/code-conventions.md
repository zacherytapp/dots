# Salesforce Code Conventions

## Precedence

Discover and follow the target repository's `AGENTS.md`, contribution guide, ADRs, Code Analyzer/PMD configuration, formatter, and nearby source. Repository conventions supersede this reference.

## Structural defaults

- Prefer direct, maintainable designs that remove branches, modes, wrappers, or duplicate layers.
- Keep behavior in the canonical layer and reuse existing project/platform capabilities.
- Avoid untyped `Object` and `Map<String, Object>` boundaries when a clear DTO or platform type fits.
- Do not grow a file past the repository's size conventions merely by appending behavior.
- Keep tests at observable seams rather than coupling them to private helpers.

## Comments and documentation

Infer conventions from configured rules and representative neighboring files before adding headers or documentation.

- Add ApexDoc only where repository rules or a genuinely non-obvious public contract require it.
- Match the project's existing tags and format. Never inject a personal author name, invent a group, or claim a PMD rule is enabled without reading the active configuration.
- Preserve repository-required copyright or generated headers.
- Use inline comments for a non-obvious reason or platform constraint, not to narrate code.
- Follow the repository's policy for issue, ADR, and documentation references; do not declare a personal preference absolute.
- Avoid metadata comments unless the repository intentionally maintains them and retrieve/deploy round-trips preserve them.

## Apex

- Follow the project's sharing, CRUD/FLS, error, trigger-framework, assertion, and test-data conventions.
- Design bulk behavior from the real entry point and transaction, not from a blanket pattern.
- Add dependency injection, wrappers, recursion tracking, or asynchronous work only when the concrete boundary requires it.
- Prefer idempotent transitions or keyed recursion tracking over a transaction-wide static Boolean.

## LWC and JavaScript

Follow configured ESLint, Prettier, JSDoc, component, accessibility, and testing conventions. Document public contracts only when names and types do not make them clear.

## Branch naming

Use the repository's branch convention. If none exists, choose a short kebab-case outcome name with an intent prefix and include the issue identifier when one exists. Do not assume a specific default branch.
