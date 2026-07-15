# AI Marketing OS — Architecture Blueprint v1

**Status:** Parent Architecture Document (Vision + Why)
**Companion documents:** `implementation-architecture-v1.md` (planned — code structure), `execution-roadmap-v1.md` (planned — build order)

> This document explains *why* the system is shaped the way it is. It does not
> repeat implementation detail already owned by a specialized document — it
> links to it. If you are looking for exact contracts, schemas, or code
> structure, follow the links in each section.

---

## Document Map

| If you need to know... | Read this instead |
|---|---|
| How risk, approval, and memory events work in detail | `campaign-memory-v1.md` |
| Exactly which module reads/writes which artifact | `context-slicing-matrix.md` |
| Worked input/output examples of context slicing | `context-slicing-examples.md` |
| How the Orchestrator routes requests, classifies risk, detects mode | `orchestrator-design.md` |
| How raw prompts are validated before anything else runs | `marketing-input-guard.md` |
| How Creative/Image generation actually works end-to-end | `creative-image-pipeline.md` |
| Folder structure, canonical vs legacy code | `adr-004-canonical-architecture.md` |
| What is actually built vs. still legacy today | `migration-map.md` |
| Risk classification rules | `adr-003-risk-classification.md` |
| Memory rules (why memory is append-only, etc.) | `adr-002-memory-rules.md` |
| Why the product is campaign-centric | `adr-001-campaign-centric.md` |
| Why Marketing Brain is the central decision layer | `adr-005-marketing-brain-architecture.md` |

---

## 1. Product Mission

AI Marketing OS is not an AI writing tool.

AI Marketing OS is designed to become the Marketing Brain of a business.

Its purpose is to help a business plan, create, launch, learn from, and
improve marketing campaigns through a shared intelligence system.

---

## 2. Core Architecture Principle

Marketing Brain is the only strategic decision maker.

Every Agent is a specialized expert that executes tasks, contributes
recommendations, and writes back to shared memory.

Agents do not own the campaign strategy.
Marketing Brain owns the strategy.

Agents may *suggest* — for example, a suggested risk level, or a
recommendation to change direction — but only the Brain (via the
Orchestrator) enforces the final decision. See `orchestrator-design.md`,
Section 3, for a concrete example of this pattern (`suggestedRiskLevel` vs.
enforced `finalRisk`).

---

## 3. High-Level Architecture

```
User
  ↓
AI Assistant
  ↓
Marketing Brain
  ↓
Knowledge Engine
  ↓
Memory System
  ↓
Specialized Agents
  ↓
Campaign Workspace
  ↓
Integrations
```

Today, the parts of this diagram that are actually implemented in code live
under `app/lib/ai/` (canonical) — see `adr-004-canonical-architecture.md` for
the exact folder structure, and Section 13 below (Current Implementation
Status) for what is real vs. planned right now.

---

## 4. Marketing Brain

Marketing Brain is the central intelligence layer. In current implementation,
"Marketing Brain" is not one file — it is the combined behavior of the
Orchestrator, Context Slicing, Risk Gating, and Memory Writing, working
together. This section defines what the Brain is *made of* conceptually, so
future components have an agreed home.

### 4.1 Internal Components (conceptual)

```
Marketing Brain
├── Intent Analyzer        — turns a raw/normalized prompt into a task
│                             (today: Input Guard + Brief Builder)
├── Mode Detector           — decides TOOL_MODE vs CAMPAIGN_MODE
│                             (today: orchestrator-design.md, Section 1)
├── Context Builder         — assembles the relevant memory slice for a task
│                             (today: getCampaignContextSlice())
├── Decision Engine         — selects which agent(s) should act, in what order
│                             (today: orchestrator selectAgent(); single-agent
│                             only — see Section 7, Open Items)
├── Risk / Approval Engine  — classifies and enforces risk, gates output
│                             (today: classifyRisk() + Risk Gate)
├── Memory Coordinator      — the only component allowed to write memory
│                             (today: Orchestrator memory writes)
├── Knowledge Coordinator   — connects Business Memory / Knowledge Engine
│                             into context (Phase 2 — not yet built)
├── Approval / UX Coordinator — applies the user's approval experience
│                             (Guided / Professional / Autonomous — see
│                             Section 9) on top of Risk Engine decisions
│                             (not yet built — Risk Engine currently applies
│                             uniformly, no per-user UX mode yet)
└── Recommendation Engine   — proactive "you should probably..." suggestions
                              (Phase 4 — not yet built)
```

**Why this matters:** without this breakdown, "the Brain" was an
unfalsifiable black box — anything could be claimed to be "Brain behavior."
With this breakdown, every piece of Brain behavior has a named owner, and a
concrete file it lives in today (or an explicit note that it doesn't exist
yet). New Brain-related work should say which of these components it
belongs to.

### 4.2 Responsibilities (unchanged from earlier drafts)

- Understand campaign goals
- Decide which agent should act next
- Read from shared memory
- Pass instructions to agents
- Evaluate agent outputs
- Resolve conflicts between agents
- Maintain campaign strategy
- Recommend next actions

Marketing Brain does not directly generate every artifact. It delegates
execution to specialized agents.

---

## 5. Execution Modes: TOOL_MODE vs CAMPAIGN_MODE

This is a foundational, already-implemented behavior of the Orchestrator and
was previously missing from this document. Full detail:
`orchestrator-design.md`, Section 1.

### 5.1 What each mode means

| | TOOL_MODE | CAMPAIGN_MODE |
|---|---|---|
| When it applies | No valid, non-archived `campaignId` on the request | A valid, non-archived `campaignId` is present |
| Context Slicing | Skipped entirely | `getCampaignContextSlice()` is called before routing |
| What the Agent receives | Only the Brief Builder's normalized prompt | Normalized prompt **plus** the campaign context slice + relevant approved events |
| Memory writes at generation time | None | Yes — every output passes through Risk Gate and is written as a Memory Event |
| Later "save to campaign" | Possible — creates a `retroactive_attach` event (still risk-gated, floor: medium regardless of content) | N/A — already attached |

### 5.2 How the Brain behaves differently

- In **CAMPAIGN_MODE**, the Decision Engine and Context Builder are fully
  active: the agent's output is expected to be consistent with everything
  approved so far in the campaign (this is what "Shared Intelligence" means
  in practice — see the worked example in Section 6.1 below).
- In **TOOL_MODE**, the Brain still classifies risk and runs quality checks,
  but has no campaign history to reconcile against — it behaves like a
  single-shot expert tool, not a coordinated system.

### 5.3 Switching

Mode is **not** a sticky session setting and is **not** inferred from
phrasing. It is re-evaluated on every single request, deterministically,
based only on whether a valid `campaignId` is attached. A user can send a
Tool Mode request immediately followed by a Campaign Mode request with no
explicit "switch" step. See `orchestrator-design.md`, Section 1 for the exact
detection function and fallback behavior (bad/deleted `campaignId` → falls
back to TOOL_MODE with a surfaced warning, never a silent failure).

---

## 6. Specialized Agents

Agents are operational experts.

Current agents:

- Research Agent
- SEO Agent
- Content Agent
- Creative Agent
- Video Agent
- Ads Agent
- Analytics Agent

Each agent must:

- Receive instructions (and, in CAMPAIGN_MODE, a context slice) from the
  Orchestrator/Brain
- Never call `getCampaignContextSlice()` itself
- Produce a structured output
- Return a *suggested* risk level, never an enforced one
- Never write to memory itself
- Never overwrite strategic direction without Brain approval

Exact per-agent read/write rules live in `context-slicing-matrix.md`. Worked
examples of real calls and their resolved edge cases live in
`context-slicing-examples.md`.

### 6.1 Worked Example: Shared Intelligence in Practice

This is the concrete scenario that "Shared Intelligence" refers to elsewhere
in this document:

> Research discovers the customer's core fear is pricing.
>
> Marketing Brain propagates this as approved context. Downstream agents
> adjust independently, without being told to individually:
> - **Creative** focuses messaging on trust, not price.
> - **Ads** avoids leading with price in copy.
> - **SEO** targets informational (not price-comparison) keywords.
> - **Content** produces educational articles rather than promotional ones.
>
> The Brain decided the *implication* of the research finding once. Each
> agent executed its own part of that implication independently. No agent
> needed to re-derive the insight itself.

Mechanically, this happens because all four agents' context slices include
the approved canonical Research event (for example,
`research + audience_analysis`; see `context-slicing-matrix.md`,
Writer→Reader table) — the coordination is a side effect of shared,
approved memory, not a special "broadcast" mechanism.

---

## 7. Memory System

AI Marketing OS uses four memory types. Full mechanics — approval states,
supersedes chains, the context-slicing contract, and the writer/reader
matrix — are owned by `campaign-memory-v1.md` and `context-slicing-matrix.md`.
This section stays conceptual on purpose.

### 7.1 Business Memory

Long-term business knowledge (brand, products, pricing, vision, tone,
customers, sales calls, support tickets, FAQs, previous campaigns).

Purpose: help the Brain understand the business.

Status: Phase 2 — not yet built. See Section 13.

### 7.2 Campaign Memory

Campaign-specific knowledge: brief, research outputs, SEO decisions, content,
creative, ads outputs, campaign status, approved decisions.

Purpose: keep all agents aligned around one campaign context.

→ See `campaign-memory-v1.md` for the full approval/conflict model, and
`context-slicing-matrix.md` for exactly what each module reads and writes.

Status: Built and smoke-tested. See Section 13.

### 7.3 Market Memory

External market intelligence (competitors, trends, news, social signals,
Meta Ads Library, Google Trends, Reddit, YouTube/TikTok patterns).

Purpose: help the Brain understand the outside market.

Status: Not required for Phase 1 (Phase 3).

### 7.4 Learning Memory

Performance-based learning (CTR, CPC, conversions, winning/failed messaging,
audience response).

Purpose: help the Brain improve future decisions.

Status: Not required for Phase 1 (Phase 4).

---

## 8. Knowledge Engine

Knowledge Engine transforms raw sources into usable business knowledge.

Inputs: uploaded documents, website content, brand files, product
descriptions, past campaigns, customer feedback, external research.

Outputs: structured business facts, brand voice rules, audience insights,
positioning insights, messaging constraints, source-backed knowledge.

Knowledge Engine is inspired by NotebookLM, but it is not NotebookLM.
NotebookLM understands documents. AI Marketing OS must understand the
business.

Status: Phase 2 — not yet built. No specialized doc exists yet; one should
be created when this phase starts (do not design it inside this Blueprint).

---

## 9. AI Assistant

AI Assistant is the conversational interface to Marketing Brain.

It is not a separate decision maker.

Responsibilities:

- Understand user intent
- Ask clarification when needed
- Explain what the Brain is doing
- Trigger agent workflows
- Show campaign status
- Answer questions using memory
- Help users navigate the workspace

AI Assistant should not behave like a generic ChatGPT clone.

---

## 10. Approval Experience: UX Modes vs. the Risk Engine

These are two different layers, not competing designs. Neither replaces the
other.

```
User
  ↓
Approval Experience (UX Mode)   ← Guided / Professional / Autonomous
  ↓
Risk-based Approval Engine      ← low / medium / high (already implemented)
  ↓
auto_saved / pending / blocked
```

- The **Risk Engine** (implemented today — see `orchestrator-design.md`
  Sections 2–3, and `campaign-memory-v1.md` Section 3) is a property of the
  *artifact*: every output gets classified low/medium/high and is written as
  `auto_saved`, `pending`, or blocked-pending-approval, regardless of who is
  using the system or how.
- The **UX Mode** (Guided / Professional / Autonomous) is a property of *how
  the user experiences* those same risk decisions. It does not change what
  risk an artifact is assigned — it changes how much friction the user sees
  before/after that classification.

| UX Mode | Behavior on top of the Risk Engine |
|---|---|
| Guided | User is asked to confirm before each major step runs, regardless of risk level |
| Professional | Low/medium risk auto-flows per the Risk Engine as normal; only high-risk (or strategic) decisions surface for explicit approval |
| Autonomous | Full workflow executes; only hard-blocked high-risk artifacts (e.g. spend, publish) stop for approval — everything else is presented as a finished result to review after the fact |

**Current status:** the Risk Engine layer is built and enforced uniformly
today. The UX Mode layer (the "Approval / UX Coordinator" component named in
Section 4.1) is **not yet built** — right now, all usage effectively behaves
like "Professional" mode by default. Guided and Autonomous are a planned UX
layer on top of the existing engine, not a redesign of it.

---

## 11. Current Implementation Status

Blueprint describes the target architecture. This section exists so nobody
mistakes the target for what's actually running today.

| Area | Status | Detail |
|---|---|---|
| Campaign Memory | 🟢 Built + smoke-tested | `campaign-memory-v1.md` |
| getCampaignContextSlice() | 🟢 Built + smoke-tested | `context-slicing-matrix.md` |
| Orchestrator | 🟢 Built + smoke-tested | `orchestrator-design.md` |
| Marketing Input Guard | 🟢 Built + smoke-tested | `marketing-input-guard.md` |
| Brief Builder | 🟢 Built + smoke-tested | — |
| Quality Layer | 🟢 Built + smoke-tested | — |
| Research Tab | 🟡 In progress (canonical agent built, route migrating) | `migration-map.md` |
| Content Tab | 🟡 In progress (canonical agent built, route migrating) | `migration-map.md` |
| SEO / Creative / Video / Ads / Analytics Tabs | 🔴 Legacy (canonical agents not yet built) | `migration-map.md` |
| Video planning route | 🟢 Canonical (contract locked, Video Agent V2 not built) | `migration-map.md` |
| Knowledge Engine | 🔴 Not started (Phase 2) | — |
| Market Memory | 🔴 Not started (Phase 3) | — |
| Learning Memory | 🔴 Not started (Phase 4) | — |
| UX Approval Modes (Guided/Prof/Autonomous) | 🔴 Not started | See Section 10 |

For live, authoritative status per Tab/Route, always check `migration-map.md`
directly — this table is a snapshot and will drift.

---

## 12. Integration Philosophy

n8n may be used as an external integration layer.

Allowed n8n use cases: send approved campaign assets to Slack, publish to
external platforms, CRM updates, email notifications, webhook automation.

Not allowed: core Marketing Brain logic, agent orchestration, Campaign
Memory management, strategic decision making.

Core intelligence must remain inside AI Marketing OS.

---

## 13. Provider Philosophy

AI Marketing OS should be provider-independent.

The product value must not depend on one model or vendor. Provider adapters
live under `app/lib/ai/providers/` (see `adr-004-canonical-architecture.md`)
so a provider can be swapped without touching Brain, Memory, or Agent logic.

The durable value is:

- Brain architecture
- Memory
- Workflow
- Knowledge Engine
- Agent coordination
- Learning system

---

## 14. Implementation Foundation (Code Structure)

This Blueprint intentionally does **not** define folder structure, module
boundaries, or dependency rules — that decision is already made and locked in
`adr-004-canonical-architecture.md`:

```
app/lib/ai/
├── campaign/       ← CampaignContextObject + CampaignMemoryEvent + getCampaignContextSlice()
├── orchestrator/    ← detectMode, resolveModule, resolveTask, resolveRiskGate, buildExecutionPlan
├── input-guard/      ← validateInput (rule-based, no LLM)
├── brief-builder/    ← extractSignals + enrichBrief → MarketingBrief
├── quality/          ← runQualityChecks (rule-based, no LLM)
├── agents/           ← one sub-folder per module
├── providers/        ← LLM/API adapters
└── legacy/           ← archived pre-ADR-001 code, read-only, not extended
```

`implementation-architecture-v1.md` (planned next document) does not
redesign this. It extends it — adding Interface Contracts, Service
Contracts, Event Contracts, and API Boundaries on top of the structure
ADR-004 already locked.

---

## 15. Future Phases

### Phase 2 — Business Knowledge Engine
Add uploads, brand docs, product knowledge, and source-backed business
memory.

### Phase 3 — Market Intelligence
Add competitor tracking, trend discovery, social signals, and external
market memory.

### Phase 4 — Active Marketing Advisor
Brain proactively recommends changes, detects risks, and suggests next
actions. Recommendation Engine (Section 4.1) becomes active.

---

## 16. Non-Negotiable Product Rule

Every new feature must answer:

**Does this make the Marketing Brain smarter?**

If yes, consider building it.
If no, defer it.
