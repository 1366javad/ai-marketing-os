# ACR-004 — Canonical Event Identity

## Status

Approved

## Context

Some frozen examples and roadmap criteria still identified Campaign Memory
Events through legacy compatibility aliases, while the canonical memory schema
and Context Slicing Matrix used artifact-level identities. This created two
possible sources of truth for routing and Exit Criteria.

## Decision

The canonical identity of every Campaign Memory Event is:

```
module + artifact
```

This identity is the only source of truth for Context Slice, filtering,
routing, dependency resolution, Exit Criteria, and cross-agent context
visibility.

The legacy `type` database field is retained only for backward compatibility
with stored legacy data. It must not drive any architectural decision or
canonical Reader behavior.

## Consequences

- Worked examples express both `module` and `artifact`.
- Exit Criteria assert canonical identities rather than compatibility aliases.
- Risk floors are keyed by canonical identity.
- Writers may mirror `artifact` into the compatibility column during migration,
  but Readers never rely on it.
