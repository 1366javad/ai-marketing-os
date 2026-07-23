# AI Marketing OS — Implementation Architecture v1

**Status:** Parent Implementation Document (Code + Contracts, not Vision)
**Parent:** `ai-marketing-os-architecture-blueprint-v1.md`
**Depends on (locked, not re-derived here):** `adr-004-canonical-architecture.md`
**Child documents (unchanged, still authoritative for their domain):**
`campaign-memory-v1.md`, `context-slicing-matrix.md`,
`context-slicing-examples.md`, `orchestrator-design.md`,
`marketing-input-guard.md`, `creative-image-pipeline.md`

---

## 0. Purpose and Scope

The Blueprint answers *why* the system is shaped this way. This document
answers exactly one question:

> **If we implement or extend Marketing Brain tomorrow, where does each
> class, module, and contract go — precisely?**

This document does **not**:

- Re-derive the folder structure (ADR-004 already locked it — see Section 1)
- Re-explain product vision, phases, or mission (Blueprint owns that)
- Restate memory approval rules, risk floors, or the artifact matrix in full
  (they are linked, not copied — see Section 5)

This document **does**:

- Define Module Boundaries, Service Boundaries, Interface Contracts, Event
  Contracts, API Contracts, Dependency Rules, Folder Ownership, Cross-module
  Communication rules, Coding Rules, and Extension Rules.

If something here conflicts with a child document (`orchestrator-design.md`,
`campaign-memory-v1.md`, etc.), **the child document wins** — this document
is a map of those contracts, not a replacement for them. If a conflict is
found, fix this document, not the other way around.

---

## 1. Folder Ownership

Folder structure is locked by `adr-004-canonical-architecture.md` and is
**not redesigned here**. This section only maps each folder to (a) the
conceptual Brain component it implements (per Blueprint Section 4.1) and (b)
who is allowed to write code there.

| Folder | Owns | Maps to Brain component (Blueprint §4.1) | May be edited when |
|---|---|---|---|
| `campaign/` | `CampaignContextObject`, `CampaignMemoryEvent`, `getCampaignContextSlice()` | Context Builder, Memory Coordinator | Adding a field, artifact type, or slicing rule (Section 11.2) |
| `orchestrator/` | `detectMode`, `resolveModule`, `resolveTask`, `resolveRiskGate`, `buildExecutionPlan` | Mode Detector, Decision Engine, Risk/Approval Engine (enforcement half) | Adding a route to an agent, changing risk floors, changing mode-detection rules |
| `input-guard/` | `validateInput` (rule-based, no LLM) | Intent Analyzer (validation half) | Adding a new invalid/blocked pattern |
| `brief-builder/` | `extractSignals`, `enrichBrief` → `MarketingBrief` | Intent Analyzer (normalization half) | Adding a new signal extracted from raw prompt |
| `quality/` | `runQualityChecks` (rule-based, no LLM) | (not separately named in §4.1 — sits between Agent output and Risk Gate) | Adding a new structural check against `MarketingBrief` |
| `agents/<module>/` | One agent implementation per module | The "Specialized Agents" layer (Blueprint §6) | Building or updating a single agent — never touches another agent's folder |
| `providers/` | LLM/API adapters (Claude, Gemini, Groq, Pollinations, etc.) | Provider Layer (Blueprint §13) | Adding a new provider or changing prompt-building/format for an existing one |
| `legacy/` | Archived pre-ADR-001 code | N/A — not part of the Brain | Never extended; only read for migration reference (ADR-004) |

Components with **no folder yet** (not built — see Blueprint §11, Current
Implementation Status):

| Planned folder | Brain component | Phase |
|---|---|---|
| `app/lib/ai/knowledge/` | Knowledge Coordinator | Phase 2 |
| `app/lib/ai/approval/` (or similar) | Approval / UX Coordinator (Guided/Professional/Autonomous) | Not yet scheduled |
| `app/lib/ai/recommendations/` | Recommendation Engine | Phase 4 |

Do not create these folders speculatively. Create them only when the
corresponding phase begins, and add them to this table at that time.

---

## 2. Module Boundaries

A **module** = one folder under `app/lib/ai/` (excluding `legacy/`). Each
module has a single responsibility and a hard boundary on what it may call.

| Module | Responsibility | May call | May NOT call |
|---|---|---|---|
| `input-guard` | Validate raw prompt structurally/topically | Nothing else in `app/lib/ai/` | `campaign/`, `orchestrator/`, any agent, any provider |
| `brief-builder` | Normalize validated input into `MarketingBrief` | Nothing else in `app/lib/ai/` (context enrichment from Campaign Context happens in CAMPAIGN_MODE, but brief-builder does not call `getCampaignContextSlice()` itself — see `marketing-input-guard.md`, "Relationship to Campaign Context") | `campaign/` directly, any agent, any provider |
| `orchestrator` | Mode detection, planning, bounded Knowledge/Context retrieval, Brief construction, routing, risk classification/gating, and Campaign Memory writes | `knowledge/`, `campaign/`, `brief-builder/`, `agents/*`, `quality/` | Providers or persistence directly; never bypasses its own Risk Gate |
| `campaign` | Own `CampaignContextObject` and `CampaignMemoryEvent` storage; expose `getCampaignContextSlice()` and the write path | Nothing else in `app/lib/ai/` (it is a leaf — pure data + slicing logic) | Any agent, any provider, orchestrator internals |
| `agents/<module>` | Produce one structured output from an approved `MarketingBrief` | `providers/` only | `campaign/` or Knowledge Engine (no direct memory read/write), any other `agents/<other-module>`, `orchestrator/` |
| `quality` | Validate agent output structurally against `MarketingBrief` | Nothing else in `app/lib/ai/` | `campaign/`, any agent, any provider |
| `providers` | Adapt to a specific LLM/API vendor | External vendor SDKs/APIs only | `campaign/`, `orchestrator/`, any agent's business logic |

**The one rule every module boundary reduces to:**
an Agent never reads memory, never writes memory, and never calls another
Agent. The Orchestrator is the only module allowed to touch `campaign/` and
the only module allowed to call more than one other module in
`app/lib/ai/`.

---

## 3. Service Boundaries

"Service" here means a stable entry-point function/class other modules (or
API routes) are allowed to call — as opposed to internal implementation
details of a module, which can change freely.

| Service | Entry point | Called by | Defined in |
|---|---|---|---|
| `OrchestratorService` | `runOrchestrator(request)` | API routes only | `orchestrator/` |
| `InputGuardService` | `validateInput(rawPrompt)` | API routes, before `OrchestratorService` (per pipeline order, Section 4) | `input-guard/` |
| `BriefBuilderService` | `buildBrief(validatedInput, executionPlan, knowledgeSlice, contextSlice)` | `OrchestratorService` | `brief-builder/` |
| `CampaignMemoryService` | `getCampaignContextSlice(campaignId, module, task, options)`, `writeMemoryEvent(event)` | `OrchestratorService` only | `campaign/` |
| `KnowledgeService` | Runtime `getKnowledgeSlice(request)` plus governed lifecycle operations defined by the Phase 2 package | `OrchestratorService` for runtime reads; authenticated Knowledge routes for management | `knowledge/` |
| `AgentService` (one per module) | `runAgent(brief)` | `OrchestratorService` only | `agents/<module>/` |
| `QualityService` | `runQualityChecks(agentOutput, brief)` | `OrchestratorService` | `quality/` |
| `ProviderService` (one per vendor) | vendor-specific adapter call, normalized to a common response shape | `AgentService` implementations only | `providers/` |

No API route, UI component, or agent may call `CampaignMemoryService`
directly. `OrchestratorService` is the single choke point — this is what
makes Risk Gating and provenance actually enforceable rather than
aspirational.

---

## 4. Canonical Request Pipeline (Dependency Order)

This is the one sequence every module boundary and service boundary above is
built to support. It is owned in full detail by `orchestrator-design.md`,
Section 2 — reproduced here only as the skeleton other sections reference:

```
Input Guard
  ↓
Orchestrator: detectMode()          → TOOL_MODE | CAMPAIGN_MODE
  ↓
[business scope available] Knowledge Slice
  ↓
[CAMPAIGN_MODE only] getCampaignContextSlice()
  ↓
Brief Builder
  ↓
Orchestrator: selectAgent()
  ↓
Agent (providers/ call happens inside here)
  ↓
Quality Layer
  ↓
Orchestrator: classifyRisk() → Risk Gate
  ↓
[CAMPAIGN_MODE] writeMemoryEvent()
  ↓
Output Formatter → User
```

---

## 5. Interface Contracts

These are the shapes every implementation of a given role must satisfy.
Where a contract already exists in a child document, it is referenced, not
retyped in full — only the signature is repeated here for map purposes.

### 5.1 `IAgent`

```ts
type IAgent = (
  brief: MarketingBrief
) => AgentOutput
```

```ts
type AgentOutput = {
  artifact: string            // e.g. "keyword_cluster" — see Event Contracts, Section 6
  suggestedRiskLevel: "low" | "medium" | "high"   // proposal only — never enforced by the agent itself
  summary: string
  payload: object
}
```

Full risk-floor enforcement rules: `orchestrator-design.md`, Section 3.

### 5.2 `IProvider`

```ts
type IProvider = (
  normalizedRequest: object    // shape is provider-specific, built by the calling Agent
) => {
  raw: string | object
  meta: { vendor: string, model: string, tokensUsed?: number }
}
```

Providers do not know about `MarketingBrief`, Campaign Context, or risk —
they only translate a request into a vendor call and return a normalized
response. Provider-specific prompt-building rules (e.g. Pollinations' 80-word
budget) live in `creative-image-pipeline.md`, "Provider-aware Prompt
Builders" — that section is the template for how any new provider adapter
documents its own constraints.

### 5.3 `IMemory` (implemented by `campaign/`)

```ts
getCampaignContextSlice(
  campaignId: string,
  module: string,
  task: string,
  options?: {
    includePending?: boolean   // default false; only human-review UI may pass true
    minConfidence?: number
    maxRiskLevel?: string
  }
) => {
  context: object
  relevantEvents: CampaignMemoryEvent[]
  contextVersion: number
}
```

```ts
writeMemoryEvent(event: {
  module: string
  artifact: string
  approvalStatus: "auto_saved" | "pending" | "rejected"
  riskLevel: "low" | "medium" | "high"
  task: string
  summary: string
  payload: object
  supersedes?: string | null
}) => CampaignMemoryEvent
```

Full approval/conflict semantics: `campaign-memory-v1.md`.

### 5.4 `IOrchestrator`

Not a callable interface for other modules (nothing calls into
`orchestrator/` except API routes) — defined here so its responsibilities are
explicit and testable in isolation:

```ts
type IOrchestrator = {
  detectMode(request): "TOOL_MODE" | "CAMPAIGN_MODE"
  buildExecutionPlan(request): ExecutionPlan
  executeCanonicalPipeline(validatedInput, executionPlan): CanonicalResult
  selectAgent(module): IAgent
  classifyRisk(agentOutput): "low" | "medium" | "high"   // enforces floor, see 5.1
  runRiskGate(finalRisk, agentOutput): { status, blocked: boolean }
}
```

### 5.5 `IKnowledge` (canonical KnowledgeService boundary)

The former placeholder interface has been superseded by the frozen contracts
in `phase-2-knowledge-engine-design-package-v1.md`. Runtime access is read-only
and Orchestrator-owned through one bounded Knowledge Slice. Source processing,
candidate review, approval, versioning, and administration use the canonical
KnowledgeService boundary; Routes and Agents never access durable persistence
directly. Market Memory and Learning Memory extend this same Knowledge Slice
as separately traceable domain projections rather than parallel runtime paths.

---

## 6. Event Contracts

The canonical set of `artifact` values currently defined in
`context-slicing-matrix.md`, reproduced here as a single flat catalog for
quick reference. **This table is not the source of truth — the Matrix is.**
Update the Matrix first, then this table, per the rule in
`context-slicing-examples.md` ("update Matrix first, then examples doc, then
implementation").

| Module | Artifacts |
|---|---|
| `research` | `market_research`, `audience_analysis`, `competitor_analysis`, `trends_research`, `pain_points_research`, `opportunities_research` |
| `seo` | `keyword_research`, `keyword_cluster`, `topic_cluster`, `seo_strategy`, `meta_description`, `faq_generation` |
| `content` | `blog_draft`, `email_draft` |
| `creative` | `creative_concept`, `image_asset` |
| `ads` | `ad_copy` |
| `analytics` | `campaign_learning` |
| system-level (not tied to one agent) | `context_change`, `retroactive_attach` |

Every event, regardless of artifact, carries the same envelope defined in
`IMemory.writeMemoryEvent` (Section 5.3). There is no per-artifact schema
variant at the envelope level — only `payload` differs by artifact, and that
payload shape is owned by the producing agent, not by this document.

---

## 7. API Contracts

### 7.1 Route Contract Pattern (applies to every module route)

Every Tab/Route, canonical or being migrated to canonical, follows the same
shape end to end (see `migration-map.md`, "Migration checklist"):

```
Route handler
  → validateInput()
  → runOrchestrator()
      → getCampaignContextSlice()   [CAMPAIGN_MODE only]
      → buildBrief()
      → runAgent()
      → runQualityChecks()
      → writeMemoryEvent()          [CAMPAIGN_MODE only]
  → response to client
```

A route is not "canonical" if it deviates from this shape — per ADR-004, a
route that imports from both `legacy/` and the canonical structure indicates
an incomplete migration, not a valid hybrid state.

### 7.2 Current Routes

This document does not track live route status — that drifts constantly and
`migration-map.md` is the single source of truth for it. As of this
writing, module routes exist at `/api/research/generate`, `/api/ai/seo`,
`/api/content/generate`, `/api/ai/creative`, `/api/ai/video`, `/api/ai/ads`,
and a canonical-only planning route at `/api/video/planning/generate`. See
`migration-map.md` for exact status per route.

### 7.3 Response Envelope

Regardless of module, a canonical route response should let the client
distinguish artifact from approval state without re-deriving it:

```ts
{
  artifact: string
  approvalStatus: "auto_saved" | "pending" | "blocked"
  riskLevel: "low" | "medium" | "high"
  summary: string
  payload: object
  contextVersion?: number   // present only in CAMPAIGN_MODE
}
```

This is not yet formally specified in any child document — flagging it here
as new, so it gets reviewed rather than silently assumed consistent across
agents.

---

## 8. Dependency Rules

```
Orchestrator
  ↓ (may call)
Agent
  ↓ (may call)
Provider
```

Enforced, non-negotiable rules:

- ❌ Agent cannot call another Agent directly.
- ❌ Agent cannot call `getCampaignContextSlice()` or `writeMemoryEvent()`.
- ❌ Agent cannot modify Campaign Strategy (i.e., cannot write to
  `CampaignContextObject` — only explicit user action can, via
  `context_change`, per `campaign-memory-v1.md` Section 5).
- ❌ Agent cannot enforce its own risk level — it may only suggest one.
- ❌ Provider cannot be called by anything other than the Agent that owns
  the call (no shared/global provider client bypassing an Agent).
- ❌ No canonical module (`app/lib/ai/*` outside `legacy/`) may import from
  `legacy/`, and no `legacy/`-served route may import from canonical modules
  (ADR-004).
- ❌ Input Guard and Quality Layer never call an LLM (both are explicitly
  rule-based — `marketing-input-guard.md`, and ADR-004 context).
- ✅ Only the Orchestrator may call `campaign/` (both read and write).
- ✅ Only the human-review UI may pass `includePending: true` — no agent
  pipeline may ever do so (`orchestrator-design.md`, Section 4).

---

## 9. Cross-Module Communication Rules

There is no direct agent-to-agent communication channel today or planned.
All cross-module "communication" happens exclusively through approved
Campaign Memory Events read back via `getCampaignContextSlice()`:

- Agent A never invokes Agent B.
- Agent A's output becomes visible to Agent B only after: (1) the
  Orchestrator writes it as a Memory Event, (2) it reaches `approved` or
  `auto_saved` status, and (3) `context-slicing-matrix.md` lists Agent B as
  an allowed reader of that artifact.
- This is deliberate: it means the Writer→Reader Matrix is the *entire*
  cross-module communication topology of the system. There is no
  out-of-band path.

**Known open gap (carried forward, not solved here):** a single user request
that should span multiple agents in sequence (e.g. "build me a campaign" →
Research → SEO → Content) has no defined orchestration pattern yet. Per
`orchestrator-design.md` Section 7, this needs its own design doc before
implementation — including whether Risk Gate applies per-agent-output or
once at the end of a chain. Until that doc exists, no code should attempt
implicit multi-agent chaining.

---

## 10. Coding Rules

- **Risk floors live in one place only** — the Orchestrator's floor table
  (`orchestrator-design.md`, Section 3). Never hard-code a risk level or
  floor inside an Agent.
- **New artifact types are declared in the Matrix first.** Code should never
  introduce an `artifact` value that isn't already in
  `context-slicing-matrix.md`.
- **No module reaches outside its folder** except via the calls explicitly
  allowed in Section 2. If a module "needs" something outside its allowed
  calls, that is a signal the boundary needs revisiting — raise it as a
  question, don't route around it silently.
- **Input Guard and Quality Layer stay LLM-free.** If a check ever seems to
  require model judgment, that's a signal it belongs in an Agent or a new
  explicit component, not a quiet exception bolted onto these two.
- **No dual-path execution.** A given route is either fully on the
  canonical pipeline or fully on `legacy/` — never a mix (ADR-004).
- **Memory is never mutated in place.** Corrections are new events with
  `supersedes`; deletions are `rejected` tombstones. No code should ever
  issue a physical `UPDATE`/`DELETE` against a Campaign Memory Event row.

---

## 11. Extension Rules

### 11.1 Adding a new Agent (module)

1. Confirm the module is listed in Blueprint Section 6 (Specialized
   Agents). If not, that's a product decision (Blueprint), not an
   implementation one — resolve there first.
2. Add its Writer→Reader entries to `context-slicing-matrix.md` before
   writing any code.
3. Add worked-example calls to `context-slicing-examples.md` for at least
   one representative task.
4. Add the module's allowed Context Object fields to the Matrix's "Context
   Object Fields per Module" table.
5. Implement `agents/<module>/` satisfying `IAgent` (Section 5.1).
6. Add the module's risk floor(s) to the Orchestrator's floor table
   (Section 3, `orchestrator-design.md`).
7. Add/verify a `providers/` adapter if a new vendor is required.
8. Wire the route per the Route Contract Pattern (Section 7.1).
9. Complete automated tests and the staging smoke test.
10. Remove the corresponding legacy path.
11. Verify every sprint Exit Criterion.
12. Update `migration-map.md` status for that Tab/Route only after the
    completed state is true.

### 11.2 Adding a new artifact type to an existing Agent

1. Add it to `context-slicing-matrix.md` (Writer→Reader row).
2. Add a worked example to `context-slicing-examples.md` if any edge case
   around approval/visibility is non-obvious.
3. Add its risk floor to the Orchestrator's floor table.
4. Only then implement it in the Agent.

### 11.3 Adding a new Provider

1. Implement the adapter in `providers/` satisfying `IProvider` (Section
   5.2).
2. Document its own prompt-length/format constraints in its own section,
   following the pattern in `creative-image-pipeline.md`, "Provider-aware
   Prompt Builders."
3. Do not let Agent business logic branch on which provider is in use —
   provider differences stay inside the adapter.

### 11.4 Migrating a Tab from Legacy to Canonical

This is already fully specified — do not redefine it here. Follow the
checklist in `migration-map.md`, "Migration checklist (per Tab)" exactly,
including removal of the legacy path before the final status update.

---

## 12. Explicitly Out of Scope for This Document

- Product vision, phases, and mission → Blueprint
- Why memory is append-only, why campaign-centric, why risk-classified →
  ADR-001, ADR-002, ADR-003
- Folder structure decision itself → ADR-004 (only mapped here, not
  re-argued)
- Build order / sprint sequencing → `execution-roadmap-v1.md` (next
  document)
- Knowledge Engine internal design → `phase-2-knowledge-engine-design-package-v1.md`
- Market Memory internal design → `market-memory-architecture.md`
- Learning Memory internal design → `learning-memory-architecture.md`
