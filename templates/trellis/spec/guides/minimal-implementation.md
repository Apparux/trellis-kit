# Minimal Implementation Rule

When implementing a Trellis task, prefer the smallest correct change that satisfies the accepted PRD, design, implementation plan, and acceptance criteria.

Be lazy about the solution, not about understanding the problem.

Before choosing a simplified solution, inspect the existing implementation, related modules, database usage, API conventions, permissions, tests, and real execution flow. Do not guess a smaller solution without understanding how the current system works.

Before adding new abstractions, commands, compatibility layers, dependencies, framework-like structures, reusable utilities, or new workflow concepts, first check whether existing project patterns already solve the problem.

Prefer reuse in this order:

1. Existing project code and conventions
2. Existing domain models, services, utilities, validators, and configuration patterns
3. Standard library or framework-native capability
4. Already installed dependencies
5. A one-off local implementation
6. A new reusable abstraction only when there are multiple real call sites or the accepted design explicitly requires it

Do not preserve deprecated commands, aliases, compatibility layers, fallback behavior, or old workflows unless the user explicitly asks for compatibility.

Do not turn a small bug fix, cleanup, or scoped feature into a broad refactor.

Do not introduce new dependencies, configuration systems, command namespaces, base classes, extension points, adapters, registries, or plugin-like architecture unless the accepted PRD/design requires them.

When removing complexity, delete obsolete code directly instead of adding wrappers, aliases, compatibility shims, or migration paths, unless backward compatibility is explicitly required.

Simplification must not remove required behavior, permission checks, validation, audit logging, data-scope rules, transaction safety, error handling, tests, acceptance criteria, documented business requirements, or security boundaries.

For review tasks, treat over-engineering as one review dimension only. Correctness, security, regression risk, requirement coverage, data integrity, permissions, and tests have higher priority.

For cleanup tasks, explicitly look for dead code, unused abstractions, duplicate helpers, unnecessary compatibility logic, unnecessary dependencies, and logic that can be replaced by existing project conventions.
