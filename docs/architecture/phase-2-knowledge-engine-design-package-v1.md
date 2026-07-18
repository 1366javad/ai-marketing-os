# Phase 2 Knowledge Engine Design Package v1.0

**Status:** Frozen — Approved for Implementation  
**Phase:** Phase 2 — Business Knowledge Engine  
**Sources of truth:**

1. `marketing-brain-conceptual-model-v1.md`
2. `adr-006-knowledge-engine-responsibility.md`

**Package role:** Final architecture, implementation contracts, and execution
roadmap for Phase 2. No additional Knowledge Engine architecture or design
document is required before implementation.

---

## 1. Freeze Declaration

Phase 2 Knowledge Engine design is frozen by this package.

Implementation must conform to this document and its two source documents. If
implementation exposes a genuine contradiction, work stops and the conflict is
raised explicitly. New ideas that are not required to satisfy this package are
Future Design Notes and do not expand Phase 2 scope.

No implementation may weaken this invariant:

> **No runtime execution can directly modify durable business knowledge.**

---

## 2. Phase 2 Objective

Build the Business Knowledge Engine that transforms business-owned sources into
approved, versioned, traceable Business Understanding and supplies bounded
Knowledge Slices to the existing canonical runtime.

Phase 2 completes this path:

```text
Business Source
  → Ingestion
  → Normalization
  → Claim Extraction
  → Conflict Detection
  → Synthesis
  → Validation
  → Human Approval
  → Versioned Business Knowledge
  → Knowledge Slice
  → Orchestrator-owned Runtime
```

Phase 2 does not replace Campaign Context, Campaign Memory, Orchestrator, Brief
Builder, specialized Agents, Quality, Risk, or approval rules established in
Phase 1.

---

## 3. Goals and Non-Goals

### 3.1 Goals

1. Accept business-owned source material with immutable provenance.
2. Normalize source content without treating it as approved knowledge.
3. Extract structured candidate claims in the approved knowledge domains.
4. Detect agreement, duplication, and conflict across sources.
5. Synthesize a Unified Business Understanding without hiding disagreement.
6. Require controlled validation and approval before runtime visibility.
7. Preserve append-only versions and supersession history.
8. Build bounded, explainable Knowledge Slices for canonical runtime requests.
9. Permit Runtime to create Candidate Updates without modifying durable truth.
10. Enforce organization and business isolation, auditability, and deletion
    boundaries.

### 3.2 Non-Goals

- Market Intelligence or continuous competitor tracking (Phase 3)
- Automatic Learning Memory propagation (Phase 4)
- Autonomous promotion of observations or hypotheses
- Agent Loop or implicit multi-agent execution
- A replacement for Campaign Memory
- UI/UX redesign or approval-mode implementation
- Publishing, budget spending, CRM, n8n, NotebookLM, or external automation
- Custom model training
- Final Video Generation
- Silent conflict resolution

---

## 4. Canonical Component Model

Phase 2 adds one bounded capability under `app/lib/ai/knowledge/`.

```text
knowledge/
  sources/          source registration, provenance, immutable snapshots
  normalization/    normalized source representation
  extraction/       candidate claim extraction
  synthesis/        deduplication, agreement, and conflict detection
  validation/       structural and policy validation
  versions/         approval, supersession, validity, and history
  slicing/          bounded Knowledge Slice construction
  candidates/       runtime Candidate Updates
  adapters/         persistence and source-content adapters
  index.js           public KnowledgeService entry points
```

Folder names are implementation boundaries, not separate engines.

### 4.1 Allowed dependencies

| Component | May call | Must not call |
|---|---|---|
| Knowledge source intake | source adapters, persistence adapter | Orchestrator, Agents, Campaign Memory |
| Extraction and synthesis | approved text provider adapter, knowledge persistence | Agents, Campaign Memory writes |
| Validation and versioning | knowledge persistence | Orchestrator execution, external publishing |
| Knowledge Slice | knowledge persistence | provider generation, Campaign Memory mutation |
| Candidate Update | knowledge persistence | direct approval or durable overwrite |
| Orchestrator | Knowledge Slice public service | knowledge persistence tables directly |
| Specialized Agents | Brief only | Knowledge Engine and durable memories directly |

---

## 5. Canonical Knowledge Domains

Phase 2 supports these durable business domains only:

| Domain | Examples |
|---|---|
| `brand_identity` | Brand description, category, identity principles |
| `tone_rule` | Voice, vocabulary, prohibited language |
| `positioning` | Market position and differentiators |
| `value_proposition` | Customer value and reasons to believe |
| `product` | Product identity and approved description |
| `offer` | Offer, packaging, pricing statement, eligibility |
| `business_model` | Revenue model and sales motion |
| `audience` | Stable audience or buyer definition |
| `business_goal` | Durable organizational marketing goal |
| `constraint` | Legal, operational, brand, claim, or channel constraint |
| `approved_fact` | Source-backed fact allowed in marketing output |
| `validated_learning` | Approved reusable learning with evidence |

Market-level continuous intelligence remains Phase 3. Runtime-generated
learning remains a Candidate Update until a later approved promotion process is
completed.

---

## 6. State and Identity Contracts

### 6.1 Knowledge Source

A Knowledge Source is an immutable snapshot of material supplied to the
Knowledge Engine.

```ts
type KnowledgeSource = {
  id: string
  businessId: string
  sourceKind: "text" | "document" | "website_snapshot" | "transcript"
  title: string
  originalReference: string | null
  contentHash: string
  authority: "authoritative" | "supporting" | "unverified"
  status: "registered" | "normalized" | "processed" | "failed" | "archived"
  capturedAt: string
  createdAt: string
  createdBy: string
  metadata: object
}
```

Rules:

- Source content is immutable after registration.
- A changed source creates a new source snapshot.
- Duplicate `contentHash` within one business is not processed twice.
- Source registration never creates approved knowledge.
- Raw binary retention is an adapter concern; the canonical source record
  retains the immutable snapshot identity and provenance.

### 6.2 Normalized Source

```ts
type NormalizedKnowledgeSource = {
  sourceId: string
  businessId: string
  normalizedText: string
  language: string
  sections: Array<{ heading: string | null; text: string; ordinal: number }>
  warnings: string[]
  normalizedAt: string
  normalizerVersion: string
}
```

Normalization removes transport and formatting noise. It must not summarize,
approve, or reinterpret the source.

### 6.3 Candidate Claim

```ts
type CandidateKnowledgeClaim = {
  id: string
  businessId: string
  domain: KnowledgeDomain
  subjectKey: string
  claimKey: string
  value: string | object
  sourceEvidence: Array<{
    sourceId: string
    sectionOrdinal: number | null
    excerptHash: string
  }>
  confidence: number
  scope: { businessId: string; brandId?: string; productId?: string }
  validity: { validFrom: string | null; validUntil: string | null }
  status: "candidate" | "needs_review" | "rejected" | "promoted"
  createdAt: string
}
```

Canonical identity is:

```text
businessId + domain + scope + subjectKey + claimKey
```

The legacy `type` compatibility concept from Campaign Memory does not apply.

### 6.4 Knowledge Version

An approved Knowledge Version is the only durable knowledge visible to Runtime.

```ts
type BusinessKnowledgeVersion = {
  id: string
  businessId: string
  identityKey: string
  domain: KnowledgeDomain
  subjectKey: string
  claimKey: string
  value: string | object
  version: number
  status: "approved" | "superseded" | "expired" | "revoked"
  confidence: number
  scope: object
  validity: { validFrom: string | null; validUntil: string | null }
  sourceEvidence: Array<{ sourceId: string; excerptHash: string }>
  conflictIds: string[]
  supersedes: string | null
  approvedAt: string
  approvedBy: string
  createdAt: string
}
```

Rules:

- Versions are append-only.
- Approval creates a new version; it never mutates an earlier version.
- At most one approved, currently valid version exists per identity and scope.
- Superseded, expired, revoked, candidate, and rejected records are invisible
  to Runtime.
- Revocation creates an auditable state transition and removes runtime
  visibility; it does not physically erase history.

### 6.5 Knowledge Conflict

```ts
type KnowledgeConflict = {
  id: string
  businessId: string
  identityKey: string
  candidateIds: string[]
  kind: "value_conflict" | "scope_conflict" | "validity_conflict" | "authority_conflict"
  status: "open" | "resolved" | "dismissed"
  resolution: string | null
  resolvedCandidateId: string | null
  createdAt: string
  resolvedAt: string | null
  resolvedBy: string | null
}
```

An open conflict prevents automatic promotion for that identity.

### 6.6 Candidate Update

```ts
type KnowledgeCandidateUpdate = {
  id: string
  businessId: string
  proposedDomain: KnowledgeDomain
  proposedIdentityKey: string
  proposedValue: string | object
  source: {
    kind: "campaign_event" | "analytics_observation" | "human_note"
    referenceId: string
  }
  evidence: object[]
  status: "candidate" | "under_review" | "rejected" | "accepted_for_validation"
  createdAt: string
  createdBy: string
}
```

Candidate Updates cannot enter a Knowledge Slice and cannot directly create an
approved Knowledge Version.

---

## 7. Confidence and Authority Contract

Confidence is a traceability aid, not an approval substitute.

For v1 synthesis:

```text
confidence =
  0.40 × sourceAuthority
  + 0.35 × crossSourceAgreement
  + 0.25 × evidenceCompleteness
```

Each input is normalized to `0..1`; the final value is clamped and rounded to
two decimals.

Default source-authority values:

| Authority | Value |
|---|---:|
| authoritative | 1.00 |
| supporting | 0.70 |
| unverified | 0.40 |

Rules:

- Confidence never auto-approves knowledge.
- An open conflict forces `needs_review` regardless of confidence.
- A claim with no exact evidence reference cannot be approved.
- Authority is explicitly assigned at source registration and remains
  auditable.
- Changing authority produces re-evaluation; it does not rewrite history.

---

## 8. Synthesis and Conflict Contract

Synthesis operates only on Candidate Claims from the same business.

For each canonical identity:

1. Group candidates by identity and compatible scope.
2. Collapse exact duplicates while preserving all evidence references.
3. Detect materially different values.
4. Calculate confidence for each candidate group.
5. Produce one synthesized candidate when evidence agrees.
6. Create a Knowledge Conflict when evidence disagrees materially.
7. Mark unresolved results `needs_review`.
8. Never select a conflicting value solely because a model prefers it.

Provider output is advisory and structurally validated. Deterministic code owns
identity grouping, status, confidence calculation, visibility, and conflict
gating.

---

## 9. Approval and Version Contract

Only an authenticated human with access to the business may approve durable
knowledge in Phase 2.

Approval requires:

- a valid candidate identity;
- at least one evidence reference;
- no unresolved blocking conflict;
- explicit scope;
- explicit validity state;
- recorded approver and timestamp;
- a new append-only version;
- supersession of the previous approved version when one exists.

Rejection and revocation must record actor, time, and reason. Automatic
approval, background promotion, and Agent approval are out of scope.

---

## 10. Knowledge Slice Contract

### 10.1 Request

```ts
type KnowledgeSliceRequest = {
  businessId: string
  module: "research" | "seo" | "content" | "creative" | "ads" | "video" | "analytics"
  task: string
  campaignId?: string | null
  scope?: { brandId?: string; productId?: string }
  asOf?: string
  maxItems?: number
}
```

### 10.2 Response

```ts
type KnowledgeSlice = {
  businessId: string
  items: Array<{
    knowledgeId: string
    identityKey: string
    domain: KnowledgeDomain
    value: string | object
    version: number
    confidence: number
    sourceIds: string[]
    validAt: string
  }>
  diagnostics: {
    excludedByDomain: number
    excludedByScope: number
    excludedByValidity: number
    excludedByStatus: number
    unresolvedConflictCount: number
    truncated: boolean
  }
  generatedAt: string
}
```

### 10.3 Visibility rules

Knowledge Slice includes only items that are:

- owned by the requested business;
- `approved`;
- not superseded, expired, or revoked;
- valid at the requested time;
- compatible with requested scope;
- in the module allowlist;
- free of unresolved blocking conflict.

Default `maxItems` is 30 and hard maximum is 50. Selection is deterministic:
scope specificity, domain relevance, confidence, then newest approved version.

### 10.4 Module domain allowlist

| Runtime module | Allowed durable domains |
|---|---|
| research | brand_identity, product, offer, business_model, audience, business_goal, constraint, approved_fact |
| seo | brand_identity, positioning, value_proposition, product, offer, audience, business_goal, constraint, approved_fact |
| content | brand_identity, tone_rule, positioning, value_proposition, product, offer, audience, constraint, approved_fact |
| creative | brand_identity, tone_rule, positioning, value_proposition, product, offer, audience, constraint, approved_fact |
| ads | brand_identity, tone_rule, positioning, value_proposition, product, offer, audience, constraint, approved_fact |
| video | brand_identity, tone_rule, positioning, value_proposition, product, offer, audience, constraint, approved_fact |
| analytics | all approved Phase 2 domains |

`validated_learning` is not exposed to Runtime in Phase 2. Its promotion and
propagation remain Phase 4.

---

## 11. Canonical Runtime Integration

The Orchestrator remains the only runtime owner.

The Phase 2 request flow is:

```text
Input Guard
  → Orchestrator: execution plan
  → [business scope available] Knowledge Slice
  → [campaign mode] Campaign Context Slice
  → Brief Builder combines validated input, plan, Knowledge Slice, and Context Slice
  → Selected Agent
  → Quality and Risk
  → Campaign Memory
```

Rules:

- API Routes never query Knowledge persistence directly.
- Agents never call Knowledge Engine.
- Knowledge Slice retrieval is read-only.
- Absence of optional knowledge does not block execution; diagnostics record
  reduced knowledge context.
- An unavailable Knowledge Engine may fail open only for tasks where durable
  knowledge is optional; the failure is explicit in diagnostics.
- Constraints and approved claims are never silently dropped by truncation.
- Runtime output can create a Candidate Update only through the dedicated
  candidate service after the canonical execution completes.
- Candidate creation never changes the current request's knowledge.

---

## 12. Public Service Contracts

The canonical `KnowledgeService` exposes these operations:

```ts
registerKnowledgeSource(input): KnowledgeSource
normalizeKnowledgeSource(sourceId): NormalizedKnowledgeSource
extractCandidateClaims(sourceId): CandidateKnowledgeClaim[]
synthesizeKnowledge(businessId, identityKeys?): SynthesisResult
listKnowledgeReviewQueue(businessId, filters?): ReviewItem[]
approveKnowledgeCandidate(candidateId, approval): BusinessKnowledgeVersion
rejectKnowledgeCandidate(candidateId, reason): CandidateKnowledgeClaim
revokeKnowledgeVersion(versionId, reason): BusinessKnowledgeVersion
getKnowledgeHistory(businessId, identityKey): BusinessKnowledgeVersion[]
getKnowledgeSlice(request): KnowledgeSlice
createCandidateUpdate(input): KnowledgeCandidateUpdate
```

Only `getKnowledgeSlice()` may be called by the Orchestrator. Other operations
are management-plane operations and never execute inside an Agent pipeline.

---

## 13. HTTP Contract

HTTP routes are thin authenticated adapters around `KnowledgeService`.

| Method and route | Purpose |
|---|---|
| `POST /api/knowledge/sources` | Register an immutable business source |
| `POST /api/knowledge/sources/:id/process` | Normalize and extract candidates |
| `GET /api/knowledge/sources` | List business sources and processing state |
| `GET /api/knowledge/review` | List candidates and conflicts requiring review |
| `POST /api/knowledge/candidates/:id/approve` | Create an approved version |
| `POST /api/knowledge/candidates/:id/reject` | Reject a candidate |
| `POST /api/knowledge/versions/:id/revoke` | Revoke runtime visibility |
| `GET /api/knowledge/items` | List approved and historical knowledge |
| `GET /api/knowledge/items/:identity/history` | Read append-only version history |
| `POST /api/knowledge/slices/preview` | Preview the bounded slice and diagnostics |
| `POST /api/knowledge/candidate-updates` | Register a runtime or human candidate update |

Routes must not contain extraction, synthesis, confidence, conflict, approval,
or slicing business logic.

---

## 14. Persistence Contract

The implementation uses relational authoritative storage with optional object
storage for raw uploaded files. Vector indexes may be added only as derived
retrieval indexes; they are never the source of truth.

Required logical records:

| Record | Purpose |
|---|---|
| knowledge_sources | Immutable source snapshot and provenance |
| knowledge_normalizations | Normalized source content and warnings |
| knowledge_candidates | Extracted and synthesized candidate claims |
| knowledge_candidate_evidence | Exact source evidence references |
| knowledge_conflicts | Explicit unresolved and resolved conflicts |
| business_knowledge_versions | Append-only durable approved versions |
| knowledge_version_evidence | Evidence attached to durable versions |
| knowledge_candidate_updates | Runtime-proposed changes awaiting review |
| knowledge_audit_events | Append-only management-plane audit trail |

Required persistence properties:

- Every record is scoped by `business_id`.
- User access is enforced by business membership and row-level policy.
- Canonical writes use service adapters; Routes and Agents do not write tables.
- Approved versions are append-only.
- Identity uniqueness prevents two simultaneously active approved versions for
  the same business, identity, and scope.
- Physical deletion is restricted to approved privacy/deletion workflows.
- Raw source object deletion does not erase required provenance hashes or audit
  history unless legally required.

Exact SQL is an implementation artifact produced in the owning Sprint, not an
additional design document.

---

## 15. Processing and Failure Contract

Source processing is idempotent by source ID and processor version.

```text
registered → normalized → processed
                  ↘ failed
```

Rules:

- A failed stage records error category and retryability.
- Retry does not duplicate candidates or evidence.
- Provider failure cannot promote partial output.
- Malformed extraction output is rejected by structural validation.
- Synthesis failure leaves existing approved knowledge unchanged.
- Approval and revocation are transactional.
- Knowledge Slice never includes partially processed data.

---

## 16. Security, Privacy, and Audit Contract

1. All records are isolated by business.
2. Every management operation records actor, action, target, and time.
3. Source excerpts in logs are prohibited; logs use IDs, hashes, and counts.
4. Provider prompts receive only source content required for the active stage.
5. Secrets, credentials, and unsupported sensitive data are rejected or
   redacted before provider processing.
6. Raw source access and approved knowledge access are separately authorized.
7. Runtime has read-only access through Knowledge Slice.
8. Candidate Update creation grants no approval capability.
9. Export and deletion operations must preserve required audit evidence.

---

## 17. Observability Contract

Every lifecycle run carries a correlation ID and records:

- business ID
- source or candidate ID
- lifecycle stage
- processor version
- provider and model metadata when applicable
- latency and token usage
- input/output counts, never unrestricted source text
- warning and error category
- resulting candidate, conflict, or version IDs

Required metrics:

- sources registered, processed, failed, and retried
- candidates extracted and rejected structurally
- conflicts opened and resolved
- approval and rejection counts
- slice size, exclusions, truncation, and latency
- candidate updates created and reviewed

---

## 18. Test Contract

### 18.1 Unit tests

- Identity construction and scope isolation
- Source hashing and idempotency
- Normalization determinism
- Candidate structural validation
- Confidence calculation
- Duplicate agreement and conflict detection
- Append-only version and supersession behavior
- Approval, rejection, revocation, and validity filtering
- Module allowlists and slice hard limits
- Candidate Updates never appearing in slices

### 18.2 Integration tests

- Source → normalized source → candidates
- Multiple agreeing sources → synthesized candidate
- Conflicting sources → open conflict and no runtime visibility
- Approval → new version → slice visibility
- Supersession → only latest valid approved version visible
- Revocation → immediate slice invisibility
- Cross-business access denied
- Real provider extraction and synthesis with source-backed evidence

### 18.3 Runtime tests

- Orchestrator owns Knowledge Slice retrieval
- Route and Agent cannot query durable storage
- Knowledge Slice and Campaign Context Slice both reach Brief Builder
- Missing optional knowledge produces explicit diagnostics and execution
  continues
- Constraints and approved claims are preserved
- Runtime creates Candidate Update without durable mutation

### 18.4 Safety tests

- Agent output cannot approve a candidate
- Analytics output cannot become Validated Learning automatically
- Open conflict blocks promotion
- Unapproved, superseded, expired, revoked, and cross-business items remain
  invisible
- Provider output cannot set approval, version, authority, or visibility

---

## 19. Migration and Rollout Contract

Phase 2 introduces new durable knowledge; it does not migrate Campaign Memory
into Business Memory automatically.

Rollout order:

1. Deploy persistence and policies with no runtime reader.
2. Enable source intake and processing for internal validation.
3. Enable review and approved-version creation.
4. Validate Knowledge Slice independently.
5. Integrate read-only slices into Orchestrator behind a disabled-by-default
   runtime flag.
6. Run canonical runtime regression tests.
7. Enable for internal businesses.
8. Validate audit, isolation, latency, and fallback diagnostics.
9. Enable broader use only after Phase 2 completion criteria pass.

Rollback disables runtime slice injection. It must never delete approved
knowledge or version history.

---

## 20. Phase 2 Execution Roadmap

Sprints run in order. No later Sprint may implement work early.

### Sprint P2-A — Durable Knowledge Foundation

**Objective:** Implement authoritative persistence boundaries, identity,
source provenance, audit, and append-only version primitives.

**Dependencies:** Frozen conceptual model, accepted ADR-006, frozen design
package.

**Deliverables:**

- Knowledge module skeleton and public service boundary
- Persistence records and business-isolation policies
- Source, candidate, conflict, version, evidence, candidate-update, and audit
  adapters
- Identity, scope, status, validity, and append-only enforcement

**Entry criteria:**

- This package is Frozen.
- Existing Phase 1 regression suite passes.

**Exit criteria:**

- Persistence migrations apply and roll back safely in a clean environment.
- Cross-business access tests pass.
- Approved versions are append-only and uniqueness rules are enforced.
- No Route, Agent, or Orchestrator directly accesses knowledge tables.
- Automated tests, lint, and production build pass.

### Sprint P2-B — Source Ingestion and Normalization

**Objective:** Register immutable business sources and normalize supported
content without creating approved knowledge.

**Dependencies:** P2-A complete.

**Deliverables:**

- Source registration service and routes
- Text, document, website-snapshot, and transcript adapters
- Content hashing, duplicate detection, normalization, processing state, and
  retry behavior
- Provenance-safe observability

**Entry criteria:** P2-A Exit Criteria verified.

**Exit criteria:**

- Supported source types produce deterministic Normalized Sources.
- Duplicate snapshots do not duplicate processing.
- Source updates create new immutable snapshots.
- Failures are retryable without duplicate records.
- No source becomes Runtime-visible knowledge.
- Automated tests, real-source integration test, lint, and build pass.

### Sprint P2-C — Extraction, Synthesis, and Conflict Detection

**Objective:** Turn normalized sources into source-backed Candidate Claims and
synthesize agreement without hiding conflict.

**Dependencies:** P2-B complete.

**Deliverables:**

- Provider-backed claim extraction
- Deterministic identity and structural validation
- Confidence calculation
- Deduplication, agreement synthesis, and explicit conflict records
- Review queue service

**Entry criteria:** P2-B Exit Criteria verified with at least two independent
source snapshots for one test business.

**Exit criteria:**

- Every candidate has exact evidence and provenance.
- Agreeing sources synthesize without losing evidence.
- Conflicting sources create an open conflict.
- Open conflicts never auto-promote.
- Provider output cannot set approval or visibility.
- Real-provider synthesis and all automated tests pass.
- Lint and production build pass.

### Sprint P2-D — Validation, Approval, and Versioning

**Objective:** Create the controlled human promotion path from Candidate Claim
to approved, versioned Business Knowledge.

**Dependencies:** P2-C complete.

**Deliverables:**

- Candidate validation
- Approval, rejection, revocation, and conflict-resolution services
- Append-only version creation and supersession
- Version history and audit operations

**Entry criteria:** P2-C Exit Criteria verified; review queue contains valid,
invalid, duplicate, and conflicting cases.

**Exit criteria:**

- Only authorized humans can approve or revoke.
- Approval creates a new immutable version.
- Supersession preserves history and exposes one active version.
- Rejected, conflicted, expired, revoked, and unapproved knowledge is not
  Runtime-visible.
- Audit evidence exists for every state transition.
- Automated tests, integration smoke, lint, and build pass.

### Sprint P2-E — Knowledge Slice

**Objective:** Build the bounded, explainable, read-only Runtime projection of
approved Business Knowledge.

**Dependencies:** P2-D complete.

**Deliverables:**

- Knowledge Slice service
- Module-domain allowlists
- Scope, validity, status, version, and conflict filters
- Deterministic ranking, hard bounds, and diagnostics
- Slice preview route

**Entry criteria:** P2-D complete with multiple approved versions, scopes,
validity states, and conflicts in test data.

**Exit criteria:**

- Only approved, valid, in-scope, allowed-domain knowledge appears.
- Cross-business, candidate, conflicted, superseded, expired, and revoked items
  remain invisible.
- Maximum item bounds and deterministic selection are proven.
- Constraints and approved facts are preserved under truncation.
- Slice provenance and exclusion diagnostics are complete.
- Automated tests, integration smoke, lint, and build pass.

### Sprint P2-F — Canonical Runtime Integration

**Objective:** Add read-only Knowledge Slice consumption to the existing
Orchestrator-owned canonical runtime without changing Agent ownership.

**Dependencies:** P2-E complete; Phase 1 regression suite green.

**Deliverables:**

- Orchestrator-owned Knowledge Slice retrieval
- Brief Builder enrichment with separate Knowledge and Campaign provenance
- Explicit reduced-knowledge diagnostics
- Disabled-by-default rollout control
- Regression coverage for every Phase 1 Agent

**Entry criteria:** P2-E Exit Criteria verified and runtime integration flag is
off by default.

**Exit criteria:**

- Routes and Agents have no direct Knowledge dependency.
- Orchestrator is the only Runtime caller of Knowledge Slice.
- Knowledge and Campaign context remain separately traceable.
- Every canonical Agent consumes only its allowed Knowledge domains.
- Missing optional knowledge does not silently fail or fabricate context.
- No runtime request can mutate durable knowledge.
- Full Phase 1 regression, real-provider integration smoke, lint, and build
  pass.

### Sprint P2-G — Candidate Updates and Phase 2 Closure

**Objective:** Complete the safe Runtime feedback boundary and validate the
entire Knowledge Lifecycle without implementing automatic learning.

**Dependencies:** P2-F complete.

**Deliverables:**

- Candidate Update service and route
- Campaign Event, Analytics Observation, and human-note candidate provenance
- Review-only transition into the existing validation path
- End-to-end lifecycle, security, audit, and rollback validation
- Phase 2 completion report

**Entry criteria:** P2-F Exit Criteria verified with runtime Knowledge Slice
enabled for internal validation.

**Exit criteria:**

- Runtime can create Candidate Updates but cannot approve or expose them.
- Analytics observations remain observations until reviewed.
- Accepted Candidate Updates re-enter validation and never bypass approval.
- Full lifecycle works from source to Runtime Slice and candidate feedback.
- Cross-business isolation, audit, rollback, and failure tests pass.
- Full automated suite, real-provider smoke, lint, and production build pass.
- Every Phase 2 Definition of Complete criterion is verified.

---

## 21. Sprint Completion Order

Every Phase 2 Sprint follows this order:

```text
Implementation
  → Automated Tests
  → Integration Smoke Test
  → Security and Ownership Verification
  → Production Build
  → Exit Criteria Verification
  → Status and Completion Report
  → Commit
  → Push
  → Next Sprint
```

No deployment, release, or production enablement is implied by Commit or Push.

---

## 22. Definition of Phase 2 Complete

Phase 2 is complete only when all conditions below are true:

1. Sprints P2-A through P2-G are closed in order.
2. Business sources are immutable, traceable, and isolated by business.
3. Normalization and extraction preserve exact provenance.
4. Synthesis combines agreement and exposes unresolved conflict.
5. Durable knowledge is human-approved, append-only, versioned, and auditable.
6. Only approved, valid, in-scope knowledge appears in bounded Knowledge
   Slices.
7. Orchestrator alone owns Runtime Knowledge Slice consumption.
8. Specialized Agents and API Routes cannot read or write durable knowledge
   directly.
9. Runtime can create Candidate Updates but cannot modify Business Truth.
10. Analytics observations and hypotheses are not automatically promoted.
11. All Phase 1 runtime regression tests remain green.
12. Cross-business isolation and security tests pass.
13. Full source-to-slice-to-runtime-to-candidate lifecycle is demonstrated with
    real sources and a real configured provider.
14. Lint and production build pass.
15. Runtime rollout remains reversible without deleting knowledge history.
16. A Phase 2 Completion Report records evidence for every criterion.

Only after all sixteen criteria pass may Phase 2 be declared complete.

---

## 23. Future Design Notes — Outside Frozen Phase 2 Scope

These items are not authorized by this package:

- Continuous Market Memory ingestion and Market Intelligence
- Automatic Learning Memory propagation
- Autonomous hypothesis validation
- Cross-business or industry-shared knowledge
- Knowledge Graph expansion beyond required identity relations
- Personalized approval modes and approval UI redesign
- Agent-driven source discovery
- n8n, NotebookLM, CRM, publishing, or external workflow integrations
- Automatic source-authority reassignment
- Custom model training

They must not be implemented opportunistically during Phase 2.

---

## 24. Final Freeze Statement

**Phase 2 Design is Frozen.**

This package contains the complete Knowledge Engine architecture,
implementation contracts, execution roadmap, Sprint dependencies, acceptance
criteria, rollout rules, and Definition of Complete required before
implementation.

No additional Knowledge Engine architecture or design document may be created.
All remaining Phase 2 work is implementation against this frozen package.

