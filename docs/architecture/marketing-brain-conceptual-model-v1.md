# Marketing Brain Conceptual Model v1.0

**Status:** Frozen Product Concept  
**Purpose:** Conceptual reference for future Phase 2 ADRs  
**Scope:** Product responsibility boundaries, knowledge ownership, and lifecycle  
**Not included:** Schemas, APIs, storage design, implementation plans, UI/UX, or provider decisions

---

## 1. Canonical Definition

> **Marketing Brain is the decision layer that coordinates knowledge,
> context, memory, orchestration, and specialized execution across the entire
> marketing system.**

Marketing Brain is not one Agent, one database, or a label for a collection of
independent AI tools. It is the coordinated system formed by components with
separate and explicit responsibilities.

The Brain knows what is valid about the business, what is happening in the
current campaign, which information is relevant to the current request, which
specialized capability should execute, and which quality, risk, approval, and
memory contracts apply to the result.

---

## 2. What the Marketing Brain Knows

The Marketing Brain works with four conceptual categories of knowledge.

| Category | Meaning | Examples |
|---|---|---|
| Business Truth | Durable, reusable understanding of the business | Brand, products, offers, business model, positioning, goals, constraints |
| Market Understanding | Evidence about the external environment | Competitors, audience segments, needs, category patterns, market trends |
| Campaign State | Operational truth for one campaign | Brief, context, artifacts, approvals, execution state |
| Validated Learning | Evidence-backed knowledge derived from observed outcomes | A message pattern repeatedly outperforming another for a defined audience |

The Marketing Brain must also know the status of what it knows. Knowledge may
be approved, provisional, conflicting, superseded, expired, or unsupported.

Specialized Agents consume scoped knowledge. They do not own durable Business
Truth.

---

## 3. Component Responsibility Boundaries

| Component | Exclusive conceptual responsibility |
|---|---|
| Knowledge Engine | Produce and serve valid, reusable Business Understanding from durable knowledge sources |
| Business Memory | Retain durable internal facts about the business |
| Market Memory | Retain external market evidence and market-level understanding |
| Learning Memory | Retain hypotheses, supporting evidence, and validated learning |
| Campaign Context | Represent the current campaign's declared operating context |
| Campaign Memory | Record operational events and artifacts produced within one campaign |
| Knowledge Slice | Deliver the relevant, valid, and bounded durable knowledge needed by a runtime request |
| Context Slice | Deliver the relevant, visible, and bounded campaign information needed by a runtime request |
| Orchestrator | Own runtime planning, routing, execution ownership, and enforcement flow |
| Specialized Agent | Perform one specialized marketing task from an approved brief |
| Quality and Risk Layers | Validate output and enforce approval or publication constraints |
| Analytics | Produce observations and candidate hypotheses from available campaign evidence |

These responsibilities must not collapse into one another. The Knowledge
Engine does not execute campaigns. The Orchestrator does not create durable
Business Truth. Agents do not read or write durable knowledge directly.

---

## 4. What the Knowledge Engine Owns

The Knowledge Engine owns the lifecycle of **durable, reusable Business
Understanding**.

Its responsibility is active, not repository-only. It transforms multiple
sources into a coherent, traceable, and runtime-usable understanding of the
business.

### 4.1 Durable knowledge domains

- Brand identity
- Tone and communication rules
- Positioning
- Value propositions
- Product and offer catalog
- Business model
- Stable audience definitions
- Business goals
- Legal, operational, and brand constraints
- Approved facts and claims
- Validated, reusable learning

### 4.2 Engine responsibilities

- Source ingestion
- Normalization
- Entity and concept extraction
- Conflict detection
- Knowledge synthesis
- Confidence assessment
- Scope resolution
- Validity resolution
- Version selection
- Provenance preservation
- Knowledge Slice construction
- Candidate-update review coordination

### 4.3 Knowledge synthesis

Knowledge synthesis converts fragmented sources—such as a Brand Guide, Sales
Deck, Website, Founder Notes, and Product Documentation—into a Unified Business
Understanding.

Synthesis must never hide disagreement between sources. A synthesized result
must preserve its evidence, confidence, validity, version, and unresolved
conflicts. When authority cannot be resolved safely, the conflict remains
explicit and requires review.

### 4.4 What the Knowledge Engine does not own

- Campaign execution
- Agent selection or execution planning
- Content, Creative, Ads, SEO, Research, Analytics, or Video generation
- Publication or budget-spending decisions
- Operational Campaign Events
- Automatic promotion of Agent output into durable knowledge
- Automatic learning propagation into runtime context

---

## 5. Campaign Memory versus Knowledge Engine

| Dimension | Campaign Memory | Knowledge Engine |
|---|---|---|
| Scope | One campaign | The business across campaigns |
| Lifetime | Campaign-operational | Durable and reusable |
| Primary question | What happened in this campaign? | What is valid about this business? |
| Content | Artifacts, execution events, approvals, provenance | Brand, audience, positioning, offers, constraints, approved facts |
| Change pattern | Append-only operational events | Controlled validation, approval, and version creation |
| Runtime use | Context Slice | Knowledge Slice |
| Authority | Campaign history | Durable Business Understanding |

Examples:

- `seo_strategy`, `blog_draft`, `creative_concept`, and `ad_copy` belong to
  Campaign Memory.
- "The brand is premium", "discount language is prohibited", and "the primary
  offer is enterprise onboarding" belong to durable business knowledge.

A campaign may produce a Candidate Update. It may not directly overwrite
durable knowledge.

---

## 6. Knowledge Lifecycle

The canonical conceptual lifecycle is:

```text
Source
  → Ingestion
  → Normalization
  → Extraction
  → Conflict Detection
  → Synthesis
  → Validation
  → Approval
  → Versioned Knowledge
  → Knowledge Slice
  → Runtime Consumption
  → Candidate Update
  → Review
  → New Approved Version
```

A durable knowledge item must conceptually retain:

- Claim
- Scope
- Source and provenance
- Confidence
- Valid-from and validity state
- Version
- Approval state
- Conflicting claims
- Superseded version, when applicable
- Last-review information

The implementation shape of these properties is intentionally not defined in
this conceptual model.

---

## 7. Observation, Hypothesis, and Validated Learning

Learning is not the same as measurement.

```text
Observation
  → Hypothesis
  → Validation Evidence
  → Validated Learning
  → Approved Knowledge
```

### Observation

A measured or recorded fact without a durable causal interpretation.

Example: "Ad A achieved a four-percent click-through rate."

### Hypothesis

A testable interpretation of one or more observations.

Example: "Premium messaging may perform better than discount messaging for
enterprise audiences."

### Validated Learning

An evidence-backed pattern that has survived the required validation and is
valid for a defined scope.

Example: "Premium headlines consistently outperform discount headlines for
enterprise audiences."

Analytics may produce observations and candidate hypotheses. Analytics output
does not become durable learning automatically.

Promotion to Validated Learning requires sufficient evidence, explicit scope,
known validity, conflict review, an approved confidence threshold, and any
required approval.

---

## 8. Runtime Relationship

The conceptual runtime flow is:

```text
Business Memory + Market Memory + Learning Memory
  → Knowledge Engine
      - conflict resolution
      - version selection
      - confidence evaluation
      - scope resolution
      - validity evaluation
  → Knowledge Slice
  → Orchestrator
  → Campaign Context Slice
  → Brief
  → Specialized Agent
  → Quality and Risk
  → Campaign Memory
```

Knowledge Engine is not a passive arrow between storage and runtime. It is the
authority that determines which durable knowledge is valid and relevant for a
specific runtime request.

Campaign-specific overrides may affect that campaign's runtime context. They
must not silently rewrite durable Business Truth.

---

## 9. Frozen Safety Invariants

> **No runtime execution can directly modify durable business knowledge.**

This means:

1. Agent output cannot directly update Business Memory.
2. Analytics output is not automatically Validated Learning.
3. Campaign outcomes cannot directly rewrite positioning, audience, tone, or
   business constraints.
4. Runtime may produce Candidate Updates only.
5. Durable knowledge changes require validation, approval, and a new version.
6. Every durable change must retain provenance and remain auditable.
7. Agents receive bounded slices and never query or mutate durable memories
   directly.
8. Knowledge Engine must not absorb Orchestrator execution responsibilities.

---

## 10. Non-Goals of This Conceptual Model

This document does not decide:

- Database tables or schemas
- Vector stores, graph stores, or retrieval vendors
- Embedding models
- APIs or service boundaries
- Folder structure
- Ingestion integrations
- Approval UI/UX
- Automated conflict-resolution algorithms
- Confidence formulas or thresholds
- Learning validation windows
- Phase 2 sprint sequencing

Those decisions require separate ADRs and implementation documents derived
from this frozen conceptual model.

---

## 11. Future Design Notes

The following ideas remain intentionally unresolved. They are recorded for
future design and must not be treated as approved architecture or current
implementation scope.

1. Source-authority hierarchy when Brand Guide, Website, Founder Notes, Sales
   material, and Product Documentation disagree.
2. Human versus policy-driven approval requirements for different knowledge
   domains.
3. Confidence calculation and minimum thresholds for synthesis and promotion.
4. Temporal validity, expiration, and scheduled knowledge review.
5. Entity identity and deduplication across products, offers, audiences, and
   business units.
6. Knowledge Slice size, ranking, explainability, and token-budget rules.
7. Candidate Update workflow and review experience.
8. Evidence requirements for promoting a Hypothesis into Validated Learning.
9. Isolation and inheritance rules for organizations, workspaces, brands, and
   campaigns.
10. Handling deliberate campaign overrides without contaminating Business
    Truth.
11. Market Memory ingestion sources and evidence reliability.
12. Learning Memory retention, invalidation, and contradiction handling.
13. Whether Knowledge Engine is one service or a coordinated set of internal
    capabilities.
14. Integration boundaries for future external knowledge sources.
15. Observability, audit, privacy, security, and deletion requirements.

---

## 12. Freeze Statement

The Product Workshop represented by this document is complete and frozen at
version 1.0.

Future Phase 2 ADRs must remain consistent with this conceptual model. Any ADR
that changes these ownership boundaries, lifecycle stages, or safety
invariants must explicitly identify the conflict and request a conceptual-model
revision before implementation begins.

