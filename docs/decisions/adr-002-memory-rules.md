# ADR-002

# Campaign Memory Rules

## Status

Accepted

---

## Context

Campaign Memory requires strict governance.

Without governance:

- agents may build on unverified outputs
- memory becomes unreliable
- explainability is lost

---

## Decision

Campaign Memory follows:

- Approval Rules
- Conflict Resolution Rules
- Risk Classification Rules
- Context Versioning Rules

Defined in:

campaign-memory-v1.md

---

## Consequences

All modules must access memory through:

getCampaignContextSlice()

Direct memory access is not allowed.
