# Requirements and Design Standards

Apply these standards to issues, specs, and the design claims in code reviews.

- **Necessity:** confirm the behavior does not already exist and the problem merits a change.
- **Directness:** prefer the smallest coherent design that uses the project's canonical layers and platform capabilities.
- **Boundaries:** define inputs, outputs, ownership, invariants, failure behavior, security boundaries, and explicit non-goals.
- **Complexity:** challenge new modes, flags, wrappers, duplicate helpers, optional paths, and distributed conditionals. Prefer deleting or consolidating complexity.
- **Terminology:** use established domain language and record genuinely new terms or decisions in the project's durable documentation.
- **Completeness:** cover every affected surface—data, API, UI, operations, migration, security, tests, observability, and documentation—only where applicable.
- **Acceptance:** state externally observable outcomes, relevant edge and failure states, and regression protection without prescribing incidental implementation detail.
- **Sequencing:** identify real blockers, independently green vertical slices, rollout/rollback needs, and compatibility periods.
- **Evidence:** distinguish verified project facts, platform facts, proposals, and unresolved assumptions. Do not turn guesses into requirements.
