# ACR-001 — Canonical Pipeline Order

## Status

Approved

## Context

Frozen architecture documents described two incompatible positions for the
Brief Builder. `implementation-architecture-v1.md` and
`orchestrator-design.md` placed it before Orchestrator mode detection, while
the Execution Roadmap, Migration Map, and existing Research route placed it
after the execution plan and Context Slice.

## Decision

The canonical order is:

```
Input Guard
  → Orchestrator
  → Context Slice (CAMPAIGN_MODE only)
  → Brief Builder
  → Agent
  → Quality Layer
  → Risk Gate
  → Memory Write (CAMPAIGN_MODE only)
  → Output Formatter
```

Input Guard validates and normalizes the request. The Orchestrator determines
the module, task, execution plan, and required context scope. Context Slice
retrieves only what that plan requires. Brief Builder then combines the
validated input, execution plan, and context slice into the final agent brief.

## Consequences

- `execution-roadmap-v1.md` and `migration-map.md` remain authoritative for
  this order.
- Application code must not be changed to reproduce the superseded ordering.
- Any document showing Brief Builder before the Orchestrator is inconsistent
  with this approved decision.
