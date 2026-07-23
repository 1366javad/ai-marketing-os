# Learning Memory Architecture

**Status:** Frozen Architecture Specification  
**Version:** 1.0  
**Scope:** Learning Memory subsystem architecture; implementation is excluded  
**Conformance:** Marketing Brain Conceptual Model v1.0, ADR-006, and the frozen canonical runtime

## 1. Vision

### 1.1 Definition

Learning Memory is the durable, evidence-backed memory of validated marketing learning. It retains scoped hypotheses, validation evidence, and approved patterns derived from outcomes across campaigns without treating metrics, correlations, or Agent interpretations as established learning.

### 1.2 Mission

Enable the Marketing Brain to improve future decisions from governed evidence while protecting Business Truth and runtime behavior from premature or self-reinforcing conclusions.

### 1.3 Objectives

- Preserve the path from observation to validated learning.
- Distinguish measurements, hypotheses, evidence, and approved conclusions.
- Consolidate comparable evidence across campaigns and time.
- Represent confidence, scope, validity, contradiction, and decay explicitly.
- Supply bounded, relevant learning to the canonical runtime.
- Require governed review before learning can influence future execution.

### 1.4 Role inside Marketing Brain

Learning Memory answers **“What has this business reliably learned from prior outcomes, for this scope and time?”** It is governed by the Knowledge Engine and consumed through bounded Knowledge Slices. It does not choose Agents, execute campaigns, optimize autonomously, or redefine strategy.

### 1.5 Relationship with other Memories

| Memory | Owns | Relationship to Learning Memory |
|---|---|---|
| Business Memory | Durable internal business truth | Defines brand, offer, audience, and constraint scope within which learning is valid; learning cannot overwrite it automatically |
| Market Memory | External market evidence and understanding | Supplies environmental context that can explain or bound a hypothesis, but does not prove business-specific performance |
| Campaign Memory | Operational events, artifacts, approvals, and outcomes for one campaign | Supplies observations and evidence; campaign output remains operational until promoted through the learning lifecycle |
| Learning Memory | Hypotheses, validation evidence, and validated reusable patterns | Owns approved performance learning across campaigns and controlled invalidation or decay |

## 2. Purpose

### 2.1 Primary Responsibilities

- Register observations and candidate hypotheses with exact provenance.
- Link comparable evidence across campaigns without erasing campaign identity.
- Evaluate sufficiency, independence, repeatability, and contradictory outcomes.
- Validate learning for explicit audience, offer, channel, message, goal, and time scopes.
- Preserve approved versions, confidence history, decay, and invalidation.
- Provide a bounded Learning Memory projection inside the canonical Knowledge Slice.
- Prevent automatic promotion from Analytics or runtime output.

### 2.2 Supported Use Cases

- Reuse messaging patterns that repeatedly perform for a defined audience.
- Identify channel, format, creative, offer, or timing patterns supported across campaigns.
- Retain validated negative learning and known failure conditions.
- Compare a new campaign result with an existing hypothesis.
- Detect when later evidence weakens, contradicts, or narrows previous learning.
- Give Research, SEO, Content, Creative, Ads, Video, and Analytics approved learning relevant to their task.

### 2.3 Problems Solved

- Treating one metric or campaign outcome as a universal rule.
- Losing useful performance knowledge between campaigns.
- Confusing correlation with causal or reusable learning.
- Repeating failed approaches without retaining validated negative evidence.
- Feeding unbounded analytics history into prompts.
- Allowing runtime output to create self-confirming Business Truth.
- Applying valid learning outside its audience, offer, channel, goal, or time scope.

### 2.4 Success Criteria

- Every runtime-visible learning item has traceable observations and validation evidence.
- Observation, hypothesis, and validated learning remain distinct states and objects.
- No Agent, Analytics run, or runtime request can approve learning directly.
- Contradictory or decayed learning is blocked or explicitly diagnosed.
- Retrieval is scoped, bounded, deterministic, and explainable.
- Cross-business and cross-campaign evidence access follows ownership policy.
- Every promotion, supersession, decay, and invalidation remains auditable.

## 3. Design Principles

### 3.1 Architectural Principles

- Learning Memory is governed durable knowledge, not an analytics warehouse or autonomous optimizer.
- Evidence precedes interpretation; interpretation precedes validation.
- Scope is part of learning identity, not optional metadata.
- Learning is versioned, reversible, and explainable.
- Contradiction and uncertainty are first-class states.
- The architecture is metric-provider, model, experiment, and storage neutral.

### 3.2 Data Ownership Principles

- Campaign Memory owns raw campaign events, artifacts, and operational outcomes.
- Analytics owns computed observations and candidate hypotheses for a run.
- Learning Memory owns governed hypotheses, validation evidence sets, and approved reusable learning.
- Business Memory owns internal facts and constraints; Market Memory owns external market evidence.
- References may cross memory boundaries, but canonical ownership never becomes ambiguous.

### 3.3 Runtime Principles

- Orchestrator alone requests approved learning needed by an execution plan.
- Knowledge Engine constructs the bounded Learning Memory projection inside the canonical Knowledge Slice; Agents never query Learning Memory directly.
- Learning is advisory unless an approved policy classifies it as a constraint.
- Missing optional learning yields explicit diagnostics, not guessed conclusions.
- Runtime may create Candidate Updates or observations only; current execution cannot approve or consume its own new learning.

### 3.4 Consistency Principles

- Canonical identity combines learning subject, pattern, outcome, and scope.
- Evidence remains linked to immutable Campaign Memory or authorized external references.
- Only one current approved version exists for a canonical identity and compatible scope at a given time.
- Superseded, expired, revoked, contradicted, or decayed versions remain historical but not runtime-visible.
- The same visibility rules govern APIs, slices, and runtime.

### 3.5 Evolution Principles

- New metric, experiment, hypothesis, and evidence types extend registered contracts.
- Confidence, validation, and decay policies are versioned and reproducible.
- Algorithm changes cannot rewrite historical decisions.
- Autonomous experimentation, automatic promotion, or cross-business learning requires a separate approved architecture change.
- Storage or provider changes must preserve identity, scope, provenance, validity, and audit semantics.

## 4. Scope

### 4.1 Included Domain

- Campaign performance observations and governed hypotheses.
- Messaging, audience, offer, channel, creative, content, timing, funnel, and format learning.
- Positive, negative, neutral, and conditional performance patterns.
- Cross-campaign consolidation within one authorized business.
- Validation evidence, confidence evolution, contradiction, decay, and invalidation.
- Approved learning supplied to future runtime requests.

### 4.2 Excluded Domain

- Raw analytics storage, dashboards, attribution computation, and metric collection implementation.
- Internal business facts and external market facts.
- Campaign execution state and generated artifacts.
- Autonomous optimization, Agent loops, automatic strategy changes, publishing, or budget control.
- Automatic causal inference or promotion from correlation.
- Cross-business, industry-shared, or benchmark learning without separate approval.
- UI/UX, experiment tooling, and provider-specific implementation.

### 4.3 Supported Memory Types

| Type | Meaning |
|---|---|
| Observation | Measured or recorded outcome without durable interpretation |
| Hypothesis | Testable proposed explanation or pattern |
| Validation Evidence | Scoped evidence supporting, weakening, or contradicting a hypothesis |
| Learning Candidate | Hypothesis submitted for governed validation |
| Validated Learning | Approved reusable pattern with explicit scope and validity |
| Negative Learning | Approved evidence-backed pattern describing failure or adverse effect |
| Learning Conflict | Incompatible evidence or conclusions sharing identity and scope |
| Learning Snapshot | Approved view of a scoped learning state at a point in time |

### 4.4 Boundary with Business Memory

Learning Memory may establish that “premium headlines repeatedly outperform discount headlines for enterprise audiences.” Business Memory states the approved brand position, offers, and constraints. Learning can propose a Business Memory Candidate Update, but it cannot automatically change brand identity, audience truth, positioning, pricing, or policy.

### 4.5 Boundary with Learning Memory

This boundary is internal: raw observations and unvalidated hypotheses remain pre-learning records, while only approved, evidence-backed conclusions become durable Learning Memory. Analytics produces observations; Learning Memory governs promotion. Candidate state must never be confused with runtime-visible validated learning.

## 5. Memory Model

### 5.1 Memory Entities

The conceptual entities are `LearningObservation`, `LearningHypothesis`, `EvidenceSet`, `ValidationRun`, `LearningCandidate`, `LearningConflict`, `LearningVersion`, `LearningScope`, `DecayAssessment`, and `EvidenceReference`.

### 5.2 Entity Relationships

- Campaign events and analytics records support Observations.
- One or more Observations may propose or evaluate a Hypothesis.
- An Evidence Set groups supporting, neutral, and contradictory evidence.
- Validation Runs evaluate a Candidate against a versioned policy.
- Conflicts group incompatible candidates or evidence interpretations.
- Approval creates a Learning Version linked to exact evidence.
- Later evidence may confirm, narrow, supersede, decay, revoke, or invalidate a version.

### 5.3 Memory Hierarchy

```text
Business Isolation
  → Learning Domain
    → Audience / Offer / Channel / Goal / Market Scope
      → Learning Subject
        → Observation and Hypothesis
          → Validation Evidence Set
            → Approved Learning Version
```

### 5.4 Memory States

| State | Meaning | Runtime-visible |
|---|---|---:|
| observed | Measurement exists without approved interpretation | No |
| hypothesis | Testable interpretation has been registered | No |
| accumulating | Evidence is being consolidated | No |
| needs_review | Sufficiency, conflict, or policy requires review | No |
| validated | Validation passed but approval is not complete | No |
| approved | Authorized approval created a durable version | Yes, if otherwise valid |
| weakened | New evidence reduced confidence below active policy | No |
| superseded | A newer approved version replaced it | No |
| expired | Validity window ended | No |
| rejected | Review rejected the candidate | No |
| revoked | Approval was withdrawn through governance | No |
| archived | Retained for history but inactive | No |

### 5.5 Memory Organization

Learning is organized by business, canonical learning identity, outcome type, explicit scope, evidence window, effective time, and version. Observations and evidence remain separate from synthesized conclusions. Runtime projections are derived and read-only.

## 6. Sources

### 6.1 Source Categories

- Canonical Campaign Memory events and approved artifacts.
- Analytics observations and metric snapshots.
- Experiment assignments, variants, and outcomes.
- Conversion, revenue, retention, engagement, and funnel evidence.
- Approved customer-response and sales-feedback observations.
- Human research notes with declared evidence.
- Authorized external evidence used only to contextualize validation.

### 6.2 Source Classification

Sources are classified by `origin`, `measurement type`, `collection method`, `attribution quality`, `independence`, `scope`, `time window`, `sample basis`, and `reliability`. Evidence roles are `supporting`, `contradicting`, `neutral`, or `contextual`.

### 6.3 Source Registration

Every source is registered before use with business ownership, canonical reference, measurement definition, collection window, scope, provenance, permission, and reliability class. Source snapshots are immutable; corrections create a new referenced record.

### 6.4 Source Metadata

Required metadata includes source ID, business ID, campaign or experiment reference, metric or observation type, event time, collection window, sample basis, audience, offer, channel, goal, variant, attribution method, provenance hash, and creator. Optional metadata includes cost, statistical metadata, data-quality flags, and declared limitations.

### 6.5 Source Reliability

Reliability considers measurement integrity, attribution quality, sample sufficiency, independence, completeness, instrumentation consistency, contamination, and reproducibility. A large metric does not imply reliable learning; evidence quality and comparability are evaluated separately from effect size.

## 7. Ingestion Pipeline

### 7.1 Collection

Authorized Campaign Memory, Analytics, experiment, or human-note interfaces submit observations and evidence references. Collection preserves original ownership and does not mutate the source record. Failed collection cannot change approved learning.

### 7.2 Normalization

Measurements, dimensions, time windows, variants, outcomes, and scopes are mapped to canonical representations with declared units and policy versions. Normalization does not infer causality or approval.

### 7.3 Deduplication

Event identity, source reference, observation hash, experiment identity, and evidence lineage prevent repeated evidence from being counted twice. Correlated copies from the same underlying dataset do not count as independent corroboration.

### 7.4 Enrichment

Enrichment associates audience, offer, campaign, channel, goal, content pattern, creative attribute, market context, and temporal scope. Derived attributes remain provisional and identify processor and policy versions.

### 7.5 Candidate Creation

Observations may create or update a candidate hypothesis containing subject, proposed pattern, expected outcome, scope, evidence references, confidence inputs, and validity proposal. Providers and Analytics cannot set approval or runtime visibility.

### 7.6 Validation

Validation checks structure, evidence linkage, measurement comparability, scope compatibility, minimum evidence policy, independence, repeatability, contradiction, temporal ordering, data quality, and prohibited causal claims. Failure leaves approved learning unchanged.

### 7.7 Approval

Authorized human review evaluates evidence sufficiency, business relevance, confidence, conflict, scope, validity, and risk of overgeneralization. Approval is an explicit human transition; confidence, statistical significance, policies, providers, Analytics, or Runtime cannot approve learning automatically. Any future non-human approval authority requires an approved architecture change.

### 7.8 Storage

Approved output is stored as an append-only Learning Version with hypothesis, conclusion, scope, evidence, confidence, validity, approval, policy, decay, and supersession metadata. Observations, candidates, and validation runs remain distinct.

## 8. Lifecycle

### 8.1 Creation

A lifecycle begins with an immutable observation or authorized Candidate Update. Creation assigns business ownership, canonical identity, explicit scope, provenance, evidence window, and a non-visible state.

### 8.2 Activation

Activation occurs only after validation and required approval create an approved version whose effective interval has begun, confidence satisfies active policy, and no unresolved blocking conflict exists.

### 8.3 Update

New outcomes append evidence to an existing hypothesis or create a scoped alternative. They may confirm, weaken, contradict, narrow, or propose a successor to active learning. Approved history is never edited in place.

### 8.4 Versioning

Every approved material change creates a new immutable version. Version metadata identifies predecessor, evidence window, validation and approval actors, policy version, confidence, scope, validity, decay parameters, and change reason.

### 8.5 Archival

Inactive observations, candidates, validation runs, and learning versions may be archived while remaining available for authorized history, audit, and reproducibility. Archival removes runtime eligibility but not evidence lineage.

### 8.6 Retirement

Learning is retired when its subject is discontinued, measurement is invalid, policy prohibits use, scope no longer exists, or governance ends its use. Retirement is audited and preserves history; it does not assert that historical outcomes never occurred.

## 9. Data Model

### 9.1 Core Objects

The high-level model contains Observation, Hypothesis, Evidence Reference, Evidence Set, Candidate, Validation Run, Conflict, Approved Learning Version, Decay Assessment, Approval Record, and Audit Event. These are conceptual contracts rather than physical tables.

### 9.2 Object Attributes

All durable objects carry `id`, `businessId`, `canonicalIdentity`, `domain`, `scope`, `status`, timestamps, and provenance. Learning-bearing objects additionally carry hypothesis, conclusion, outcome definition, evidence window, confidence, validity, decay policy, conflict state, evidence references, and policy version.

### 9.3 Relationships

Relationships include campaign-to-observation, observation-to-hypothesis, evidence-to-candidate, candidate-to-validation-run, candidate-to-conflict, candidate-to-version, version-to-evidence, version-to-superseded-version, and version-to-decay-assessment. Every relationship remains business-scoped and auditable.

### 9.4 Indexes

Implementation must support logical access paths for business plus canonical identity, business plus domain and status, scope plus outcome, source or campaign reference, evidence window, current approved version, conflict state, validity, freshness, and decay review date. Physical indexing is deferred.

### 9.5 Metadata

Metadata includes campaign and experiment references, metric definitions, units, sample basis, audience, offer, channel, goal, variant, attribution method, evidence roles, processor version, policy version, confidence inputs, validation results, approval reason, correlation ID, and sensitivity class.

### 9.6 Version Information

Version information includes monotonic number within canonical identity and scope, predecessor or `supersedes`, evidence-window start and end, effective-from, effective-until, approved-at, approved-by, validation and decay policy versions, change reason, evidence-set digest, and status.

## 10. Confidence & Validity Model

### 10.1 Confidence Score

Confidence is normalized from `0.0` to `1.0` using a versioned policy based on evidence reliability, sufficiency, independence, repeatability, effect consistency, scope fit, recency, and contradiction. Bands are `low` (`<0.50`), `moderate` (`0.50–0.74`), `high` (`0.75–0.89`), and `very_high` (`≥0.90`). Confidence guides review and ranking but never grants approval.

### 10.2 Validity Rules

Learning is valid only when approved, owned by the requested business, compatible with requested scope, within its effective interval, above active confidence and freshness policy, backed by retained evidence, and free of blocking conflict or revocation. Validity is conditional, not universal.

### 10.3 Freshness

Freshness derives from the newest relevant independent evidence and the domain's review cadence. Fast-changing channel or creative learning decays sooner than stable operational learning. A database write timestamp does not establish freshness.

### 10.4 Evidence Quality

Quality considers measurement validity, attribution, sample sufficiency, independence, comparability, completeness, temporal relevance, repeatability, and reproducibility. Confounded, copied, incomplete, or incomparable evidence is down-weighted or rejected and remains visible to reviewers.

### 10.5 Conflict Resolution

Contradictory conclusions remain separate with exact scope and evidence. Resolution first tests whether both are valid for different audiences, offers, channels, goals, or periods. Unresolved conflict blocks activation. Authorized review may narrow scope, select evidence, preserve parallel scoped versions, or reject a candidate without deleting history.

### 10.6 Expiration

Learning expires when its validity interval ends, evidence exceeds decay policy, measurement or attribution is invalidated, scope disappears, confidence falls below active policy, or an authorized reviewer revokes it. Expiration removes runtime visibility and triggers review or new evidence collection.

## 11. Runtime Integration

### 11.1 Runtime Entry Points

Runtime access begins after Input Guard and Orchestrator produce an execution plan with business identity, module, task, required learning domains, scope, and bounds. Review, preview, and administration remain separate non-Agent entry points.

### 11.2 Context Builder Integration

Knowledge Engine constructs one canonical Knowledge Slice containing separately traceable Business, Market, and Learning projections. It supplies that Knowledge Slice to the existing Brief Builder alongside the Campaign Context Slice. Provenance and diagnostics remain separate by memory domain. Canonical pipeline order and Orchestrator ownership do not change.

### 11.3 Memory Retrieval

Retrieval applies module/task allowlists, business isolation, scope compatibility, time, approved status, confidence, validity, conflict, decay, deterministic ranking, and hard bounds. It returns conclusions, evidence references, version data, conditions, and exclusion diagnostics rather than raw analytics history.

### 11.4 Runtime Updates

Runtime may register an Observation or Learning Candidate Update after canonical execution. It cannot approve, activate, or expose the update in the current request. Accepted candidates re-enter evidence consolidation, validation, and approval; they never directly create an approved Learning Version.

### 11.5 Runtime Constraints

- Routes and Agents cannot access Learning Memory persistence directly.
- Agents consume approved learning only through the Brief.
- Retrieval is read-only, bounded, and separately traceable.
- A current outcome cannot train or alter its own execution context.
- Observations and hypotheses remain invisible until approved as learning.
- Missing optional learning is explicit and must not fabricate guidance.
- Learning cannot override Business Memory constraints or campaign approvals.

## 12. APIs (High Level)

### 12.1 Read APIs

- All Learning Memory operations are exposed through the canonical KnowledgeService boundary; no parallel Learning Memory persistence API is allowed.
- Read current approved learning by business, domain, subject, outcome, and scope.
- Read one canonical learning identity and current version.
- Read append-only history, validation evidence, confidence, and decay state.
- Preview the bounded Learning Memory projection within a canonical Knowledge Slice, with diagnostics.

### 12.2 Search APIs

- Search approved learning, hypotheses, observations, evidence sets, and conflicts.
- Filter by scope, audience, offer, channel, goal, outcome, campaign, status, confidence, validity, and time.
- Search preserves business isolation and runtime visibility rules.

### 12.3 Candidate APIs

- Register observations and hypotheses.
- Register runtime, Analytics, or human Candidate Updates.
- Attach supporting, neutral, or contradicting evidence.
- List validation queues, conflicts, evidence gaps, and decay reviews.
- Retry processing without modifying approved state.

### 12.4 Approval APIs

- Start review, validate, approve, reject, request evidence, resolve conflict, narrow scope, supersede, revoke, or expire.
- Every transition requires authorization, reason, correlation ID, and idempotency control.
- Candidate creation and approval cannot be combined into one unreviewed operation.

### 12.5 Administration APIs

- Register metric, scope, validation, confidence, and decay policies.
- Manage authorized evidence sources and review authority.
- Archive or retire learning subjects and policies without deleting lineage.
- Export authorized version history and audit evidence.

## 13. Security & Governance

### 13.1 Access Control

Every record is isolated by business. Roles distinguish observation submission, evidence management, validation, approval, runtime read, audit, and administration. Cross-campaign consolidation is allowed only within authorized business scope. Raw evidence and approved conclusions may require different permissions.

### 13.2 Approval Authority

Only explicitly authorized human reviewers may approve learning. Runtime, Agents, Analytics, providers, policies, confidence scores, and statistical results have no approval authority. Any future non-human approval model requires an approved architecture change.

### 13.3 Audit Trail

Observation registration, hypothesis creation, evidence attachment, validation, conflict, approval, rejection, supersession, confidence change, decay, expiration, revocation, archival, retirement, policy change, and administrative access produce append-only audit events with actor, target, action, time, reason, and correlation ID.

### 13.4 Data Retention

Retention distinguishes raw outcomes, normalized observations, hypotheses, validation evidence, approved versions, and audits. Policies account for privacy, measurement reproducibility, contractual limits, business relevance, and deletion requests. Deletion or redaction preserves required non-sensitive lineage where legally permitted.

### 13.5 Compliance

Collection and use must respect privacy, consent, contractual, advertising, employment, consumer, and data-protection requirements. Sensitive personal data is minimized, aggregated, or rejected. Learning must not encode prohibited targeting, discrimination, or unsupported causal claims.

### 13.6 Monitoring

Monitoring covers ingestion health, evidence duplication, validation failures, conflicts, approval backlog, confidence distribution, scope leakage, decay reviews, expired learning, retrieval latency, slice exclusions, access denials, audit completeness, and rollback readiness. Logs use IDs, hashes, and counts instead of unrestricted raw data.

## 14. Final Architecture Diagram

### 14.1 Component Diagram

```text
Campaign Memory / Analytics / Experiments / Human Evidence
                         │
                         ▼
Observation Registry ─► Normalization & Evidence Linking
                         │
                         ▼
Hypothesis & Candidate Processing ─► Validation & Conflict
                         │
                         ▼
                Approval & Versioning
                         │
                         ▼
             Learning Memory (approved history)
                         │
                         ▼
           Knowledge Engine / Knowledge Slice Builder
```

### 14.2 Data Flow Diagram

```text
Campaign Outcome
  → Observation
  → Hypothesis
  → Validation Evidence
  → Conflict and Scope Evaluation
  → Approval
  → Versioned Validated Learning
  → Bounded Learning projection in Knowledge Slice
```

### 14.3 Runtime Sequence Diagram

```text
User → Input Guard: request
Input Guard → Orchestrator: validated input
Orchestrator → Knowledge Engine: Knowledge Slice request(plan, learning scope, bounds)
Knowledge Engine → Learning Memory: approved scoped retrieval
Learning Memory → Knowledge Engine: versions + evidence + diagnostics
Orchestrator → Campaign Context: bounded Context Slice request
Knowledge Engine → Brief Builder: Knowledge Slice with Learning projection
Campaign Context → Brief Builder: bounded Context Slice
Brief Builder → Agent: approved brief
Agent → Quality / Risk → Campaign Memory: canonical output
Analytics / Runtime → Candidate Service: observation or candidate update
Candidate Service → Validation Queue: non-visible candidate only
```

### 14.4 Memory Lifecycle Diagram

```text
observed
  → hypothesis
  → accumulating evidence
  → validation
  ├─→ rejected
  ├─→ needs_review ─→ conflict resolution / more evidence
  └─→ approved ─→ active learning version
                    ├─→ confirmed ─→ new evidence window
                    ├─→ weakened / expired ─→ review
                    ├─→ superseded ─→ archived history
                    └─→ revoked / retired ─→ retained audit history
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
                                                                  Observations / Candidates
```

Learning Memory remains the canonical owner of approved reusable performance learning. Knowledge Engine governs validity and runtime projection; Orchestrator owns execution; Agents consume bounded context; runtime outcomes return only as governed observations or candidates.
