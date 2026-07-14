# ACR-002 — Migration Map Update Order

## Status

Approved

## Context

The Migration Map checklist previously updated a Tab to Canonical before
deleting its legacy path. That allowed the status map to claim completion
while two implementation paths still existed.

## Decision

The required migration completion order is:

```
Implementation
  → Automated tests
  → Staging smoke test
  → Remove legacy path
  → Verify every Exit Criterion
  → Update migration-map.md
  → Close the sprint
```

The Migration Map records completed reality. It must not be marked Canonical
while the corresponding legacy path exists or any Exit Criterion remains
unverified.

## Consequences

- Removing the legacy path is mandatory and precedes the status update.
- The Migration Map update is the final repository change before sprint
  closure.
- A failed or unavailable staging smoke test prevents the status update.
