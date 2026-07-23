# Market Memory Architecture

**Status:** Frozen Architecture Specification  
**Version:** 1.0  
**Scope:** Market Memory subsystem architecture; implementation is excluded  
**Conformance:** Marketing Brain Conceptual Model v1.0, ADR-006, and the frozen canonical runtime

## 1. Vision

### 1.1 Definition

Market Memory is the durable, evidence-backed memory of the external market. It retains versioned market observations and approved market understanding about competitors, audiences, categories, channels, and trends without treating transient signals as permanent truth.

### 1.2 Mission

Give the Marketing Brain a current, traceable, scoped, and reusable understanding of the environment in which a business competes.

### 1.3 Objectives

- Preserve external evidence with exact provenance and capture time.
- Convert fragmented signals into governed market understanding.
- distinguish observations, interpretations, and approved market knowledge.
- Detect change, disagreement, staleness, and uncertainty explicitly.
- Supply bounded, task-relevant market context to the canonical runtime.
- Prevent unverified external claims from contaminating Business Truth.

### 1.4 Role inside Marketing Brain

Market Memory answers **“What is evidenced about the external market, for this scope and time?”** It is a knowledge source governed through the Knowledge Engine. The Knowledge Engine validates, resolves, versions, and selects Market Memory; the Orchestrator decides when a runtime plan requires it. Market Memory does not plan or execute campaigns.

### 1.5 Relationship with other Memories

| Memory | Owns | Relationship to Market Memory |
|---|---|---|
| Business Memory | Durable internal business truth | Provides the business scope against which market evidence is interpreted; market evidence cannot overwrite it |
| Campaign Memory | Operational events and artifacts for one campaign | May reference Market Memory versions and may create candidate market updates, but does not become durable market knowledge automatically |
| Learning Memory | Hypotheses, validation evidence, and validated performance learning | May use market context as evidence; it owns learned performance patterns, not external market facts |
| Market Memory | Durable external evidence and market-level understanding | Owns external observations, entities, changes, and approved interpretations |

## 2. Purpose

### 2.1 Primary Responsibilities

- Register immutable snapshots of external sources.
- Normalize and deduplicate market evidence.
- Identify market entities, signals, claims, and relationships.
- Track competitors, audiences, categories, channels, and trends over time.
- Preserve source reliability, temporal validity, scope, and provenance.
- Expose conflicts and material changes instead of silently flattening them.
- Provide a bounded Market Memory projection inside the canonical Knowledge Slice.
- Accept Candidate Updates without direct durable mutation.

### 2.2 Supported Use Cases

- Competitor positioning and offer monitoring.
- Category and demand trend discovery.
- Audience need, language, objection, and behavior analysis.
- Channel and platform pattern monitoring.
- Market opportunity and threat identification.
- Time-aware research, SEO, content, creative, ads, video, and analytics context.
- Comparison of current signals with earlier approved market states.

### 2.3 Problems Solved

- Repeatedly rediscovering the same external market information.
- Using stale, untraceable, or contradictory market claims in runtime work.
- Mixing external evidence with internal Business Truth.
- Loading unbounded raw market history into Agent prompts.
- Treating one observation or one provider output as durable knowledge.
- Losing the time, geography, segment, channel, and source scope of a claim.

### 2.4 Success Criteria

- Every runtime-visible market item is approved, current, scoped, versioned, and traceable to evidence.
- External observations remain non-authoritative until validation and approval.
- Conflicting or expired market knowledge is excluded or explicitly diagnosed.
- Retrieval is bounded and relevant to the execution plan.
- Cross-business access is isolated.
- Runtime and Agents cannot directly approve or mutate Market Memory.
- Material market changes remain auditable across versions.

## 3. Design Principles

### 3.1 Architectural Principles

- Market Memory is a distinct memory domain governed by the Knowledge Engine, not a second Orchestrator.
- Evidence and interpretation are separate objects.
- Temporal scope is mandatory because market truth changes.
- Architecture is provider-neutral and storage-neutral.
- Disagreement is represented explicitly.
- Durable state is append-only and versioned.

### 3.2 Data Ownership Principles

- Market Memory owns external evidence, market entities, market signals, and approved market claims.
- Business Memory owns internal facts and policies.
- Learning Memory owns validated performance patterns.
- Campaign Memory owns campaign execution history.
- A record has one canonical owner even when other memories reference it.

### 3.3 Runtime Principles

- Orchestrator alone requests runtime knowledge for an approved execution plan.
- Knowledge Engine constructs the bounded Market Memory projection inside the canonical Knowledge Slice; Agents never query Market Memory directly.
- Market context is advisory unless an approved constraint explicitly makes it mandatory.
- Missing optional market knowledge produces diagnostics and reduced context, not fabricated facts.
- Runtime writes Candidate Updates only and cannot change the current request's knowledge.

### 3.4 Consistency Principles

- Canonical identity combines market entity, claim or signal type, and scope.
- Evidence capture is immutable; corrections create new records.
- One current approved version may exist for a canonical identity and scope at a given time.
- Superseded history remains accessible.
- Conflict, expiry, rejection, and review state determine visibility consistently across APIs and runtime.

### 3.5 Evolution Principles

- New sources, signal types, and retrieval policies extend registered contracts rather than bypassing them.
- Confidence models may evolve only with versioned policy identifiers.
- Schema, provider, and storage changes must preserve identity, provenance, validity, and audit semantics.
- Cross-business or industry-shared intelligence is excluded until separately approved.

## 4. Scope

### 4.1 Included Domain

- Competitors and their externally evidenced positioning, offers, messages, products, channels, and activity.
- Market and category trends.
- Audience segments, needs, behaviors, language, objections, and external signals.
- Category structure, alternatives, substitutes, opportunities, and threats.
- Channel, platform, content, and advertising patterns.
- Public news, regulatory, economic, cultural, and technology signals relevant to marketing.

### 4.2 Excluded Domain

- Internal brand rules, product truth, pricing authority, and business constraints.
- Campaign artifacts and execution state.
- Performance-derived learning and cross-campaign causal conclusions.
- Autonomous strategy, planning, publication, spending, or Agent execution.
- Automatic web crawling, provider selection, UI/UX, and integration implementation.
- Personal data collection not explicitly authorized by policy.

### 4.3 Supported Memory Types

| Type | Meaning |
|---|---|
| Market Source | Registered external origin and immutable capture |
| Market Observation | Directly evidenced external fact at a point or interval in time |
| Market Entity | Canonical competitor, audience, category, channel, product, or topic identity |
| Market Signal | Normalized change or activity associated with an entity and scope |
| Market Claim | Interpreted statement supported by one or more observations |
| Market Trend | Time-series pattern supported across observations |
| Market Relationship | Evidence-backed relationship between market entities |
| Market Snapshot | Approved representation of a scoped market state at a time |

### 4.4 Boundary with Business Memory

Market Memory may state, “Competitor X publicly lists a lower entry price as of date Y.” Business Memory states the business's own approved price and pricing rules. An external statement about the business remains market evidence until verified through the Business Memory lifecycle. Market Memory can inform a Candidate Update but cannot overwrite Business Truth.

### 4.5 Boundary with Learning Memory

Market Memory may record that a messaging pattern is prevalent or changing externally. Learning Memory may record that a pattern repeatedly improved this business's performance for a defined audience. Prevalence is not performance learning; correlation is not validated causation. Promotion between these domains requires explicit evidence, scope, validation, and approval.

## 5. Memory Model

### 5.1 Memory Entities

The conceptual entities are `MarketSource`, `SourceCapture`, `MarketEntity`, `MarketObservation`, `MarketSignal`, `MarketClaim`, `MarketTrend`, `MarketRelationship`, `MarketConflict`, `MarketVersion`, and `MarketEvidenceReference`.

### 5.2 Entity Relationships

- A Market Source produces many immutable Source Captures.
- A Source Capture supports many Observations.
- An Observation references one or more Market Entities.
- Signals summarize normalized activity without replacing observations.
- Claims and Trends synthesize evidence from observations and signals.
- Conflicts group incompatible claims sharing canonical identity and scope.
- Approval creates a Market Version backed by exact evidence references.
- A newer approved Market Version supersedes an earlier one without deletion.

### 5.3 Memory Hierarchy

```text
Business Isolation
  → Market Domain
    → Geography / Segment / Category / Channel Scope
      → Market Entity
        → Observation and Signal Evidence
          → Claim / Trend / Relationship
            → Approved Market Version
```

### 5.4 Memory States

| State | Meaning | Runtime-visible |
|---|---|---:|
| registered | Source or capture exists but is not processed | No |
| normalized | Evidence is ready for extraction | No |
| candidate | Observation, claim, or trend awaits validation | No |
| needs_review | Conflict, low confidence, or policy condition requires review | No |
| approved | An authorized human reviewer accepted the version | Yes, if otherwise valid |
| superseded | A newer approved version replaced it | No |
| expired | Temporal validity ended | No |
| rejected | Review rejected the candidate | No |
| archived | Retained for history but inactive | No |
| retired | Source or entity is deliberately withdrawn from active use | No |

### 5.5 Memory Organization

Memory is organized by business, canonical market identity, domain, scope, effective time, and version. Evidence storage is logically separate from synthesized market knowledge. Runtime projections are derived views, never a second source of truth.

## 6. Sources

### 6.1 Source Categories

- Official competitor websites, product pages, pricing pages, documentation, and announcements.
- Regulatory, government, academic, and industry publications.
- Search-demand and trend datasets.
- Advertising libraries and public campaign observations.
- News, analyst, category, and trade publications.
- Public social, community, review, video, and forum evidence.
- Business-authorized research datasets and licensed providers.
- Human-submitted market research notes with declared provenance.

### 6.2 Source Classification

Sources are classified by `origin`, `authority`, `access basis`, `capture method`, `market domain`, `geography`, `language`, `temporal cadence`, and `sensitivity`. Authority classes are `primary`, `authoritative_secondary`, `supporting`, and `unverified`.

### 6.3 Source Registration

Registration occurs before processing and assigns source identity, ownership, permitted use, capture policy, expected cadence, and reliability class. Each capture is immutable, content-hashed, timestamped, and linked to the registered source. Changed content creates a new capture rather than modifying history.

### 6.4 Source Metadata

Required metadata includes source ID, business ID, source category, URI or external reference, publisher, capture time, publication time when known, geography, language, access basis, authority, content hash, capture method, and provenance chain. Optional metadata includes author, license, parser version, and declared limitations.

### 6.5 Source Reliability

Reliability is evaluated separately from claim confidence. It considers source authority, directness, recency, independence, historical accuracy, disclosure quality, and corroboration. Self-published competitor information is primary evidence of what the competitor states, but not automatically authoritative evidence of objective performance.

## 7. Ingestion Pipeline

### 7.1 Collection

Authorized connectors or human submission capture source content and metadata. Collection must honor source terms, access policy, privacy requirements, and configured cadence. Collection failure does not alter previously approved knowledge.

### 7.2 Normalization

Content is converted to a deterministic representation with language, sections, timestamps, structured fields, and capture boundaries while preserving exact source references. Normalization does not infer market truth.

### 7.3 Deduplication

Exact hashes remove duplicate captures; canonical source identity and similarity checks identify near-duplicates. Deduplication preserves independent corroborating sources and never collapses conflicting evidence merely because wording is similar.

### 7.4 Enrichment

Enrichment associates candidate entities, scope, geography, category, channel, temporal expressions, and known relationships. Enrichment output is provisional and retains processor and policy versions.

### 7.5 Candidate Creation

Extraction creates candidate observations, signals, claims, trends, and relationships with canonical identity, scope, evidence references, confidence inputs, and validity proposals. Provider output cannot assign approval or runtime visibility.

### 7.6 Validation

Validation checks structural completeness, evidence grounding, source permission, entity identity, scope, temporal coherence, duplicates, contradictions, and policy compliance. Invalid candidates fail safely without affecting approved versions.

### 7.7 Approval

Authorized human review evaluates evidence, reliability, confidence, validity, material conflicts, and intended scope. Approval is an explicit human transition and cannot be inferred from confidence or performed automatically. Any future non-human approval authority requires an approved architecture change.

### 7.8 Storage

Approved output is stored as an append-only Market Version with evidence, confidence, validity, approval, policy, and supersession metadata. Candidates and observations remain separate from approved runtime-visible versions.

## 8. Lifecycle

### 8.1 Creation

A memory item begins from registered evidence or an authorized Candidate Update. Creation assigns canonical identity, business ownership, scope, provenance, capture time, and initial non-visible state.

### 8.2 Activation

Activation occurs only when validation and required approval produce an approved version whose validity window has begun and which has no unresolved blocking conflict.

### 8.3 Update

New evidence creates new candidates. It may confirm the current version, refine scope, open a conflict, or propose a successor. Existing approved history is never edited in place.

### 8.4 Versioning

Every approved material change creates the next immutable version. Version metadata identifies predecessor, approval actor, policy version, evidence set, effective interval, and change reason. At most one current approved version exists per canonical identity and compatible scope at a given time.

### 8.5 Archival

Sources, captures, observations, and versions may be archived when inactive but must remain available for authorized history, audit, and reproducibility. Archival removes runtime eligibility, not provenance.

### 8.6 Retirement

Retirement ends active use of a source, entity, or identity because it is discontinued, prohibited, merged, or no longer meaningful. Retirement is audited, cannot erase required history, and does not imply that historical evidence was false.

## 9. Data Model

### 9.1 Core Objects

The high-level model contains Source Registry, Source Capture, Market Entity, Observation, Signal, Claim, Trend, Relationship, Conflict, Candidate, Approved Version, Evidence Reference, Approval Record, and Audit Event. These are conceptual contracts, not database tables.

### 9.2 Object Attributes

All durable objects carry `id`, `businessId`, `canonicalIdentity`, `domain`, `scope`, `status`, `createdAt`, and provenance. Knowledge-bearing objects additionally carry value, confidence, validity interval, freshness class, evidence references, conflict state, and policy version. Actor-controlled transitions carry actor, reason, and correlation ID.

### 9.3 Relationships

Relationships include source-to-capture, capture-to-observation, entity-to-observation, evidence-to-candidate, candidate-to-conflict, candidate-to-version, version-to-evidence, version-to-superseded-version, and entity-to-entity market relationships. Every relationship is business-scoped and auditable.

### 9.4 Indexes

Implementation must support logical access paths for business plus canonical identity, business plus domain and status, entity plus effective time, source plus capture hash, scope plus validity, evidence reference, conflict state, and current approved version. Physical index technology is deferred.

### 9.5 Metadata

Metadata includes provenance, source authority, capture method, geography, language, category, segment, channel, publication and capture times, processor version, policy version, confidence inputs, validation results, approval reason, correlation ID, and sensitivity classification.

### 9.6 Version Information

Version information includes monotonic version number within canonical identity and scope, predecessor or `supersedes`, effective-from, effective-until, approved-at, approved-by, approval policy, change reason, evidence-set digest, and status. Version history is append-only.

## 10. Confidence & Validity Model

### 10.1 Confidence Score

Confidence is a normalized value from `0.0` to `1.0` derived from versioned policy inputs: source reliability, directness, recency, corroboration, evidence coverage, extraction certainty, and conflict. Bands are `low` (`<0.50`), `moderate` (`0.50–0.74`), `high` (`0.75–0.89`), and `very_high` (`≥0.90`). Confidence aids review and ranking; it never grants approval.

### 10.2 Validity Rules

Validity requires approved status, compatible business and market scope, active effective interval, acceptable freshness, no blocking conflict, retained evidence, and compliance eligibility. A fact can be valid for one geography, segment, category, or channel and invalid for another.

### 10.3 Freshness

Each market domain declares a freshness class and review cadence. Volatile signals such as price, advertising, or trending topics require shorter windows than structural category definitions. Freshness is calculated from the relevant evidence or effective time, not merely the database update time.

### 10.4 Evidence Quality

Evidence quality combines authority, directness, independence, recency, specificity, completeness, and reproducibility. Multiple copied reports count as one evidence lineage; independent corroboration counts separately. Exact excerpts or structured source locations must remain recoverable.

### 10.5 Conflict Resolution

Conflicting candidates remain separate and retain their evidence. Resolution considers identity, scope, time, authority, reliability, and whether both claims can be valid under different scopes. Unsafe conflicts block activation and require authorized review. Resolution creates an auditable decision or scoped versions; it never deletes the losing evidence.

### 10.6 Expiration

Knowledge expires when its effective interval ends, freshness policy is exceeded, its source is invalidated, or an authorized reviewer revokes it. Expiration removes runtime visibility and may trigger recollection or review; it does not delete history.

## 11. Runtime Integration

### 11.1 Runtime Entry Points

Runtime access begins only after Input Guard and Orchestrator produce an execution plan containing business identity, module, task, required market domains, scope, and bounds. Human preview and administration are separate non-Agent entry points.

### 11.2 Context Builder Integration

The Knowledge Engine constructs one canonical Knowledge Slice containing separately traceable Business, Market, and Learning projections. It supplies that Knowledge Slice to the existing Brief Builder alongside the Campaign Context Slice. Provenance and diagnostics remain separate by memory domain. This does not change Orchestrator ownership or canonical pipeline order.

### 11.3 Memory Retrieval

Retrieval applies explicit module/task allowlists, business isolation, market scope, time, status, validity, conflict, confidence floor, deterministic ranking, and hard item/token bounds. It returns approved values, evidence references, version information, and exclusion diagnostics—not raw unrestricted history.

### 11.4 Runtime Updates

Runtime may submit a Market Candidate Update containing proposed domain, identity, value, scope, source kind, evidence, and correlation ID. It cannot approve the update, expose it in the same request, or directly create a Market Version. Accepted updates re-enter validation and approval.

### 11.5 Runtime Constraints

- Routes and Agents cannot access Market Memory persistence directly.
- Agents receive market knowledge only through the approved Brief.
- Runtime retrieval is read-only and bounded.
- Market evidence cannot silently override Business Memory or Campaign Context.
- Missing or failed optional retrieval is explicit and may fail open only by task policy.
- Sensitive, unapproved, expired, superseded, rejected, or conflicted items remain invisible.

## 12. APIs (High Level)

### 12.1 Read APIs

- All Market Memory operations are exposed through the canonical KnowledgeService boundary; no parallel Market Memory persistence API is allowed.
- Read current approved market items by business, domain, entity, and scope.
- Read one canonical identity and its current version.
- Read append-only version history and evidence lineage.
- Preview the bounded Market Memory projection within a canonical Knowledge Slice, with diagnostics.

### 12.2 Search APIs

- Search approved market entities, observations, claims, trends, and relationships.
- Filter by scope, geography, segment, category, channel, source, status, confidence, validity, and time.
- Search results must preserve business isolation and visibility rules.

### 12.3 Candidate APIs

- Register source-backed market candidates.
- Register runtime or human Candidate Updates.
- List validation queues, conflicts, and missing evidence.
- Retry failed processing without changing approved state.

### 12.4 Approval APIs

- Start review, approve, reject, request evidence, resolve conflict, supersede, revoke, or expire.
- Approval operations require authorized actor, reason, correlation ID, and idempotency protection.
- No API can combine candidate creation and approval into one unreviewed operation.

### 12.5 Administration APIs

- Register, classify, pause, archive, or retire sources.
- Manage permitted source use, collection cadence, authority, freshness, and review policies.
- Export authorized history and audit evidence.
- Manage entity aliases and scoped merges without deleting lineage.

## 13. Security & Governance

### 13.1 Access Control

Every object is isolated by business. Roles distinguish source management, review, approval, read-only runtime retrieval, audit, and administration. Service-level access never weakens row-level ownership controls. Raw evidence and approved summaries may have different permissions.

### 13.2 Approval Authority

Only explicitly authorized human reviewers may approve market knowledge. Runtime, Agents, providers, policies, and confidence scores have no approval authority. Any future non-human approval model requires an approved architecture change.

### 13.3 Audit Trail

Source registration, capture, processing, candidate creation, validation, conflict, approval, rejection, supersession, revocation, archival, retirement, retrieval policy changes, and administrative actions produce append-only audit events with actor, target, action, time, reason, and correlation ID.

### 13.4 Data Retention

Retention distinguishes raw captures, normalized evidence, candidates, approved versions, and audit records. Policies consider license, privacy, contractual limits, regulatory needs, reproducibility, and deletion requests. Deletion or redaction must preserve non-sensitive lineage and required audit evidence where legally permitted.

### 13.5 Compliance

Collection and use must respect applicable privacy law, copyright, licensing, platform terms, robots/access policy, and internal data classification. Sensitive personal data is minimized or rejected. Provenance records the lawful or contractual basis for source use.

### 13.6 Monitoring

Monitoring covers collection health, processing failures, duplicate rate, source drift, freshness breaches, conflicts, approval backlog, confidence distribution, retrieval latency, slice exclusions, cross-business access denials, audit completeness, and rollback readiness. Logs use IDs, hashes, and counts rather than unrestricted raw content.

## 14. Final Architecture Diagram

### 14.1 Component Diagram

```text
External Sources
      │
      ▼
Source Registry ──► Collection & Normalization ──► Evidence Store
                                                    │
                                                    ▼
Entity / Signal / Claim Processing ──► Validation & Conflict
                                                    │
                                                    ▼
                                         Approval & Versioning
                                                    │
                                                    ▼
                                  Market Memory (approved history)
                                                    │
                                                    ▼
                          Knowledge Engine / Knowledge Slice Builder
```

### 14.2 Data Flow Diagram

```text
Source
  → Immutable Capture
  → Normalized Evidence
  → Observation / Signal
  → Candidate Claim / Trend / Relationship
  → Validation and Conflict Detection
  → Approval
  → Versioned Market Knowledge
  → Bounded Market projection in Knowledge Slice
```

### 14.3 Runtime Sequence Diagram

```text
User → Input Guard: request
Input Guard → Orchestrator: validated input
Orchestrator → Knowledge Engine: Knowledge Slice request(plan, market scope, bounds)
Knowledge Engine → Market Memory: approved scoped retrieval
Market Memory → Knowledge Engine: versions + evidence + diagnostics
Orchestrator → Campaign Context: bounded Context Slice request
Knowledge Engine → Brief Builder: Knowledge Slice with Market projection
Campaign Context → Brief Builder: bounded Context Slice
Brief Builder → Agent: approved brief
Agent → Quality / Risk → Campaign Memory: canonical output
Runtime → Candidate Service: optional Market Candidate Update
Candidate Service → Validation Queue: candidate only
```

### 14.4 Memory Lifecycle Diagram

```text
registered
  → normalized
  → candidate
  → validation
  ├─→ rejected
  ├─→ needs_review ─→ conflict resolution
  └─→ approved ─→ active version
                    ├─→ superseded ─→ archived history
                    ├─→ expired ────→ review / recollection
                    └─→ retired ────→ retained audit history
```

### 14.5 Integration Overview

```text
Business Memory ─┐
Market Memory ───┼─► Knowledge Engine ─► one bounded Knowledge Slice ─┐
Learning Memory ─┘                                                    │
                                                                     ├─► Brief Builder
Input Guard ─► Orchestrator ─► bounded Campaign Context Slice ────────┘       │
                                                                             ▼
                                      Agent ─► Quality / Risk ─► Campaign Memory
                                                                             │
                                                                             ▼
                                                                    Candidate Updates
```

Market Memory remains the canonical owner of external market evidence and approved market understanding. Knowledge Engine governs its validity and runtime projection; Orchestrator owns execution; Agents consume bounded context; runtime changes return only as governed candidates.
