# ADR-006 — Knowledge Engine Responsibility

## Status

Accepted

## Source of Truth

This ADR is derived exclusively from the frozen
`docs/architecture/marketing-brain-conceptual-model-v1.md`.

It may clarify that conceptual model for an architectural decision, but it may
not redefine its component boundaries, lifecycle, or safety invariants. Any
required conflict must first be resolved through an approved revision of the
conceptual model.

## Context

Phase 1 established the canonical runtime foundation: Campaign Context,
Campaign Memory, bounded Context Slices, Orchestrator-owned execution,
specialized Agents, Quality, Risk, approval, provenance, and canonical Memory
Events.

That runtime knows how to execute work inside a campaign. It does not own a
durable, reusable understanding of the business across campaigns.

Business knowledge currently arrives through fragmented sources such as Brand
Guides, Websites, Founder Notes, Sales Decks, Product Documentation, approved
research, and future validated learning. Storing these sources without
synthesis would create a document repository, not a Knowledge Engine.

Phase 2 therefore needs a clear ownership decision before storage, retrieval,
schema, integration, or UI choices are made.

## Decision

The Knowledge Engine owns the lifecycle of **durable, reusable Business
Understanding**.

It is responsible for transforming multiple knowledge sources into coherent,
traceable, versioned, and runtime-usable knowledge while preserving provenance,
confidence, validity, scope, and unresolved conflict.

The Knowledge Engine is an active synthesis and governance capability. It is
not merely a database, file repository, vector search layer, or runtime router.

### Knowledge domains

The Knowledge Engine governs durable knowledge concerning:

- Brand identity
- Tone and communication rules
- Positioning
- Value propositions
- Products and offers
- Business model
- Stable audience definitions
- Business goals
- Legal, operational, and brand constraints
- Approved facts and claims
- Validated, reusable learning

### Lifecycle ownership

The Knowledge Engine owns this conceptual lifecycle:

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

The technical implementation of these stages is deferred to follow-up ADRs.

### Knowledge synthesis

Knowledge synthesis creates a Unified Business Understanding from fragmented
sources.

Synthesis must not silently flatten disagreement. When sources conflict, the
Knowledge Engine must preserve the competing claims and their provenance,
evaluate authority, confidence, scope, version, and validity, and leave an
unresolved conflict explicit when it cannot be resolved safely.

### Runtime output

The Knowledge Engine provides a **Knowledge Slice**: the bounded, relevant,
valid, and traceable durable knowledge required for a specific runtime request.

The conceptual relationship is:

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
```

This ADR does not change the frozen Phase 1 canonical pipeline. The exact point
and contract through which a future Knowledge Slice is composed with the
existing runtime requires a separate implementation ADR.

## Memory Boundaries

### Business Memory

Retains durable internal facts about the business.

### Market Memory

Retains external market evidence and market-level understanding.

### Learning Memory

Retains hypotheses, validation evidence, and validated learning.

### Campaign Memory

Retains operational events, approvals, provenance, and artifacts for one
campaign.

Campaign Memory answers: **What happened in this campaign?**

The Knowledge Engine answers: **What is valid about this business and relevant
to this request?**

The Knowledge Engine governs synthesis and access across durable knowledge
sources. It does not turn all memories into one undifferentiated store.

## Learning Boundary

The following states are distinct:

```text
Observation
  → Hypothesis
  → Validation Evidence
  → Validated Learning
  → Approved Knowledge
```

Analytics may produce observations and candidate hypotheses. Neither is
durable learning by default.

Promotion into Validated Learning requires sufficient evidence, explicit
scope, known validity, conflict review, an approved confidence threshold, and
any required approval. Exact evidence and threshold rules are deferred.

## Safety Invariant

> **No runtime execution can directly modify durable business knowledge.**

Therefore:

1. Specialized Agent output cannot directly update Business Memory.
2. Analytics output cannot automatically become Validated Learning.
3. Campaign outcomes cannot directly rewrite durable positioning, audience,
   tone, offers, claims, or constraints.
4. Runtime execution may create Candidate Updates only.
5. Durable knowledge changes require validation, approval, and a new version.
6. Durable changes must retain provenance and remain auditable.
7. Agents receive bounded slices and do not query or mutate durable memories
   directly.

## Relationship to Existing Responsibilities

- Marketing Brain remains the coordinating decision layer across knowledge,
  context, memory, orchestration, and specialized execution.
- Orchestrator retains runtime planning, routing, execution ownership, and
  enforcement responsibilities.
- Campaign Memory retains campaign-operational history.
- Specialized Agents retain task execution only.
- Knowledge Engine resolves **knowledge conflicts**. This does not transfer
  runtime routing or campaign-strategy conflict ownership from the Marketing
  Brain or Orchestrator.

## Consequences

### Positive

- Business Understanding becomes reusable across campaigns.
- Multiple sources can be synthesized without losing provenance.
- Runtime Agents receive scoped knowledge instead of unbounded documents.
- Durable Business Truth is protected from unreviewed runtime output.
- Business, Market, Campaign, and Learning responsibilities remain distinct.
- Future technical ADRs have a stable product-responsibility boundary.

### Costs and constraints

- Knowledge must carry version, provenance, scope, validity, and confidence.
- Conflicts cannot always be resolved automatically.
- Candidate Updates require a governed review path.
- Retrieval quality alone is insufficient; synthesis and lifecycle governance
  are required.
- Phase 2 implementation cannot begin from a storage-vendor decision alone.

## Rejected Alternatives

### Knowledge Engine as document repository

Rejected because storage and retrieval alone do not create Unified Business
Understanding.

### Knowledge Engine as another runtime Orchestrator

Rejected because it would overlap Phase 1 execution ownership and mix durable
knowledge governance with campaign execution.

### Automatic runtime writes to Business Memory

Rejected because hallucinated, provisional, or campaign-specific output could
silently corrupt durable Business Truth.

### One undifferentiated memory store

Rejected because Business Truth, market evidence, campaign history, and
validated learning have different scopes, authority, lifecycle, and retention
requirements.

## Non-Goals

This ADR does not decide:

- Database or event schemas
- Vector, graph, relational, or document storage
- Embedding models or providers
- API and service contracts
- Folder structure
- Ingestion integrations
- Source-authority rules
- Confidence formulas or thresholds
- Approval UI/UX
- Learning validation windows
- Knowledge Slice ranking or token budgets
- Phase 2 implementation sprints

## Required Implementation Contracts

All unresolved items remain Future Design Notes under the frozen conceptual
model. Before implementation, the frozen Phase 2 Knowledge Engine Design
Package must define at least:

1. Knowledge identity, scope, provenance, version, validity, and conflict
   contracts.
2. Source ingestion and authority rules.
3. Knowledge Synthesis and human-review boundaries.
4. Knowledge Slice construction and integration with the canonical runtime.
5. Candidate Update and promotion workflow.
6. Business Memory, Market Memory, and Learning Memory storage boundaries.
7. Security, privacy, audit, retention, and deletion behavior.

## Approval Gate

This ADR is **Accepted**. Phase 2 application implementation remains gated by
the frozen Phase 2 Knowledge Engine Design Package, including its implementation
contracts and execution roadmap.
