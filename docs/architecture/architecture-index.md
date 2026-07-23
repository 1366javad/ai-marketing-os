# AI Marketing OS Architecture Index

**Version:** 1.0  
**Status:** Frozen  
**Purpose:** Canonical index, dependency map, and reading order for the AI Marketing OS architecture corpus  
**Architecture state:** Complete; ready for implementation planning and execution

This index does not create new architecture. It records the approved corpus and the order in which it must be interpreted. When documents differ, an approved ADR or ACR takes precedence over the earlier statement it explicitly changes; otherwise implementation must stop and raise an architectural conflict.

## Status Semantics

| Status | Meaning |
|---|---|
| Frozen | Normative architecture or contract; implementation must conform |
| Accepted | Approved architectural decision that constrains Frozen documents |
| Complete | Historical validation or closure evidence |
| Living Status | Operational record that reflects implemented reality |

## Canonical Architecture Documents

| Document | Version | Status | Primary responsibility | Depends on |
|---|---:|---|---|---|
| `marketing-brain-conceptual-model-v1.md` | 1.0 | Frozen | Product-level definition, memory ownership, lifecycle, and safety invariants | Product Mission |
| `ai-marketing-os-architecture-blueprint-v1.md` | 1.0 | Frozen | Whole-system target architecture and phase boundaries | Product Mission, Conceptual Model |
| `implementation-architecture-v1.md` | 1.0 | Frozen | Canonical implementation ownership and runtime boundaries | Blueprint, ADR-004, ADR-005, ACR-001 |
| `execution-roadmap-v1.md` | 1.0 | Frozen | Phase 1 implementation order and exit criteria | Blueprint, Implementation Architecture, approved ACRs |
| `phase-2-knowledge-engine-design-package-v1.md` | 1.0 | Frozen | Complete Knowledge Engine implementation contracts and Phase 2 sprints | Conceptual Model, ADR-006 |
| `market-memory-architecture.md` | 1.0 | Frozen | External market evidence, understanding, lifecycle, governance, and runtime integration | Conceptual Model, Blueprint, ADR-006, Knowledge Engine |
| `learning-memory-architecture.md` | 1.0 | Frozen | Observation-to-validated-learning lifecycle, governance, decay, and runtime integration | Conceptual Model, Blueprint, ADR-006, Knowledge Engine, Campaign Memory |

## Runtime and Memory Contracts

| Document | Version | Status | Primary responsibility | Depends on |
|---|---:|---|---|---|
| `campaign-context-schema.md` | 1.2 | Frozen | Canonical Campaign Context shape | Blueprint, ADR-001 |
| `campaign-memory-v1.md` | 1.x | Frozen | Campaign event approval, conflict, provenance, and visibility | ADR-001, ADR-002, ADR-005 |
| `context-slicing-matrix.md` | 1.2 | Frozen | Writer-to-reader visibility and bounded context rules | Campaign Memory, ACR-003, ACR-004, approved Content-to-Creative boundary recorded in the frozen Matrix |
| `context-slicing-examples.md` | 1.0 | Frozen | Normative examples of Context Slice behavior | Context Slicing Matrix, ACR-003, ACR-004 |
| `orchestrator-design.md` | 2.0 | Frozen | Planning, routing, risk, and canonical execution ownership | Implementation Architecture, ADR-003, ACR-001 |
| `marketing-input-guard.md` | 1.1 | Frozen | Runtime input validation and normalization | Implementation Architecture |
| `creative-image-pipeline.md` | 1.0 | Frozen | Provider-aware creative image flow under central execution ownership | Orchestrator, Campaign Memory |
| `analytics-v1-contract.md` | 1.0 | Frozen | Canonical Analytics capability contract | Campaign Memory, Orchestrator |
| `analytics-metrics-contract.md` | 1.0 | Frozen | Analytics metric definitions | Analytics Contract |
| `usage-v1-contract.md` | 1.0 | Frozen | Canonical usage capability contract | Canonical Runtime |
| `usage-metrics-contract.md` | 1.0 | Frozen | Usage metric definitions | Usage Contract |
| `campaign-starter-library-v1.md` | 1.0 | Frozen | Canonical starter campaign definitions | Campaign Context, Campaign Memory |

## Architectural Decisions

| Document | Version | Status | Decision |
|---|---:|---|---|
| `../decisions/adr-001-campaign-centric.md` | ADR-001 | Accepted | Campaign-centric system boundary |
| `../decisions/adr-002-memory-rules.md` | ADR-002 | Accepted | Canonical memory rules |
| `../decisions/adr-003-risk-classification.md` | ADR-003 | Accepted | Risk classification and approval behavior |
| `../decisions/adr-004-canonical-architecture.md` | ADR-004 | Accepted | Canonical architecture identity |
| `../decisions/adr-005-marketing-brain-architecture.md` | ADR-005 | Accepted | Marketing Brain architecture and shared intelligence |
| `../decisions/adr-006-knowledge-engine-responsibility.md` | ADR-006 | Accepted | Knowledge Engine responsibility and memory boundaries |
| `../decisions/acr-001-canonical-pipeline-order.md` | ACR-001 | Accepted | Input Guard → Orchestrator → Context Slice → Brief Builder → Agent |
| `../decisions/acr-002-migration-map-update-order.md` | ACR-002 | Accepted | Migration completion and documentation update order |
| `../decisions/acr-003-seo-internal-dependency-visibility.md` | ACR-003 | Accepted | Progressive SEO dependency visibility |
| `../decisions/acr-004-canonical-event-identity.md` | ACR-004 | Accepted | `module + artifact` as canonical event identity |

## Operational Status and Completion Records

| Document | Version | Status | Purpose |
|---|---:|---|---|
| `migration-map.md` | Current | Living Status | Authoritative implemented-state and migration record |
| `phase-1-closure-report.md` | 1.0 | Complete | Phase 1 Definition of Complete evidence |
| `sprint-a-completion-report.md` | A | Complete | Research migration evidence |
| `sprint-b-validation-report.md` | B | Complete | SEO migration evidence |
| `sprint-c-validation-report.md` | C | Complete | Content migration evidence |
| `sprint-d-completion-report.md` | D | Complete | Creative migration evidence |
| `sprint-e-completion-report.md` | E | Complete | Ads migration evidence |
| `sprint-f-completion-report.md` | F | Complete | Analytics migration evidence |
| `sprint-g-completion-report.md` | G | Complete | Video Planning and Phase 1 closure evidence |

Phase 2 closure evidence is recorded in `migration-map.md`, which marks P2-A through P2-G Closed and records verification of all sixteen Phase 2 completion criteria.

## Dependency Map

```text
Product Mission
  → Marketing Brain Conceptual Model v1.0
    → Architecture Blueprint v1
      → ADR-001 through ADR-005
      → Implementation Architecture v1
        → ACR-001 through ACR-004
        → Runtime and Memory Contracts
        → Execution Roadmap v1
          → Phase 1 Runtime Implementation and Closure

Marketing Brain Conceptual Model v1.0
  → ADR-006 Knowledge Engine Responsibility
    → Phase 2 Knowledge Engine Design Package v1.0
      → Phase 2 Knowledge Engine Implementation and Closure
      → Market Memory Architecture v1.0
      → Learning Memory Architecture v1.0

Campaign Memory + Knowledge Engine
  → Market Memory runtime boundary
  → Learning Memory evidence and runtime boundary
```

## Canonical Reading Order for New Team Members

1. Product Mission — **Build the Marketing Brain of a Business.**
2. `marketing-brain-conceptual-model-v1.md`
3. `ai-marketing-os-architecture-blueprint-v1.md`
4. `../decisions/adr-001-campaign-centric.md` through `../decisions/adr-006-knowledge-engine-responsibility.md`
5. `../decisions/acr-001-canonical-pipeline-order.md` through `../decisions/acr-004-canonical-event-identity.md`
6. `implementation-architecture-v1.md`
7. `campaign-context-schema.md`
8. `campaign-memory-v1.md`
9. `context-slicing-matrix.md` and `context-slicing-examples.md`
10. `orchestrator-design.md` and `marketing-input-guard.md`
11. Capability-specific runtime contracts relevant to the work.
12. `execution-roadmap-v1.md` and Phase 1 closure records.
13. `phase-2-knowledge-engine-design-package-v1.md`
14. `market-memory-architecture.md`
15. `learning-memory-architecture.md`
16. `migration-map.md` for current implemented reality.

## Interpretation and Change Rule

- The Product Mission and frozen Conceptual Model define product intent and ownership boundaries.
- Accepted ADRs and ACRs govern the decisions they explicitly address.
- Frozen architecture and contracts govern implementation.
- `migration-map.md` reports what is actually implemented; it does not redefine architecture.
- Completion reports provide evidence and do not create new scope.
- A genuine contradiction requires work to stop and an approved architecture change before implementation continues.
- New implementation details must not introduce new memory responsibilities, automatic learning, autonomous execution, or cross-business intelligence beyond these frozen documents.

## Final Architecture Status

```text
AI Marketing OS

✅ Product Vision
✅ Canonical Architecture
✅ Runtime Foundation
✅ Canonical Runtime
✅ Campaign Memory
✅ Knowledge Engine
✅ Business Memory Foundation
✅ Market Memory Architecture
✅ Learning Memory Architecture

ARCHITECTURE COMPLETE
READY FOR IMPLEMENTATION
```

Architecture completion means the subsystem responsibilities and governing contracts are defined and frozen. It does not claim that Market Memory or Learning Memory application code has been implemented; their implementation status must be recorded only after their future execution criteria are satisfied.
