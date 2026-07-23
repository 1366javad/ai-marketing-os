# Orchestrator Design v2.0

## Purpose

The Orchestrator is the canonical runtime execution owner inside the Marketing Brain. It is not the Marketing Brain by itself. It is the **only** runtime component allowed to retrieve Campaign Context Slice or Knowledge Slice and the **only** component allowed to write Campaign Memory Events. Agents never touch Campaign Memory or durable Knowledge directly (per ADR-002 and ADR-006).

It decides:

- Tool Mode vs Campaign Mode
- Context Injection (which bounded slices Brief Builder may include in the Agent's Brief)
- Agent Routing
- Risk Classification (validation, not just trust)
- Memory Writes
- Risk Gating (who needs to approve what, before output reaches the user)

---

## 1. Mode Detection

Mode is **not** a user setting and **not** inferred from phrasing. It is determined by a single, deterministic check at the start of every request:

```
function detectMode(request):
  if request.campaignId is present AND campaign exists AND campaign.status != "archived":
    return CAMPAIGN_MODE
  else:
    return TOOL_MODE
```

Rules:

- If `campaignId` is provided but the campaign doesn't exist (bad ID, deleted, archived) → falls back to `TOOL_MODE` and surfaces a warning to the user ("Campaign not found — continuing without campaign context"). It does **not** silently fail or block the request.
- A user cannot be in both modes for a single request. A single request is either attached to exactly one campaign, or to none.
- Mode is re-evaluated on every request — it is not "sticky" session state. A user can run a Tool Mode request and a Campaign Mode request back to back without explicitly switching anything.

---

## 2. Main Flow

```
User Input
  ↓
Marketing Input Guard          (validates prompt quality — see marketing-input-guard.md)
  ↓
Orchestrator: detectMode(), resolveModule(), resolveTask()
                              → execution plan + TOOL_MODE | CAMPAIGN_MODE
  ↓
[business scope available]
Orchestrator: getKnowledgeSlice(businessId, module, task, scope)
  ↓
[CAMPAIGN_MODE only]
Orchestrator: getCampaignContextSlice(campaignId, module, task)
  ↓
Brief Builder                  (combines validated input, execution plan,
                                Knowledge Slice, and Campaign Context Slice)
  ↓
Orchestrator: selectAgent(module)
  ↓
Selected Agent                 (receives only the approved MarketingBrief)
  ↓
Provider                       (LLM/API call)
  ↓
Quality Layer                  (format/sanity checks on raw output)
  ↓
Orchestrator: classifyRisk(agentOutput)   → low | medium | high
  ↓
Orchestrator: Risk Gate
  ↓
  ├─ low    → write Memory Event (approvalStatus: "auto_saved") → Output Formatter → User
  ├─ medium → write Memory Event (approvalStatus: "pending") → Output Formatter → User (flagged "needs your review")
  └─ high   → write Memory Event (approvalStatus: "pending") → BLOCKED until explicit human approval
              → Output Formatter → User (flagged "requires approval before publish/spend")
```

The Risk Gate is not optional and not skippable by any agent. Every agent output passes through `classifyRisk()` before it can be written to memory or shown to the user as final.

---

## 3. Risk Classification

Risk is determined in two layers, not trusted blindly from the agent:

```
function classifyRisk(agentOutput):
  baseRisk = agentOutput.suggestedRiskLevel   // agent's own guess, e.g. "content_draft" → medium
  finalRisk = enforceMinimumRisk(agentOutput.module, agentOutput.artifact, baseRisk)
  return finalRisk
```

- Each **Agent** proposes a `suggestedRiskLevel` based on what it produced.
- The **Orchestrator** holds a hard-coded minimum-risk floor per canonical
  `module + artifact` identity and never allows an agent to self-report below
  that floor.

| Canonical module + artifact | Minimum Risk Floor |
| --- | --- |
| `research + market_research/audience_analysis/competitor_analysis/trends_research/pain_points_research/opportunities_research` | low |
| `seo + keyword_research/keyword_cluster` | low |
| `seo + topic_cluster` | medium |
| `seo + seo_strategy` | high |
| `seo + meta_description/faq_generation` | medium |
| `content + email_draft/blog_draft` | medium |
| `creative + creative_concept/image_asset` | medium |
| `ads + ad_copy` | high |
| `analytics + campaign_learning` | low |
| `video + video_script/storyboard` | medium |
| `special + retroactive_attach` | medium (regardless of original content — see Rule 6, campaign-memory-v1.md) |
| any action that spends budget or publishes externally | high |

This floor table lives in the Orchestrator, not in individual agents — so risk policy can be changed in one place without touching every agent's code.

---

## 4. Context Injection

In `CAMPAIGN_MODE`, before routing to an agent, the Orchestrator calls:

```
getCampaignContextSlice(campaignId, module, task, options)
```

- `module` is the target agent (`research`, `seo`, `content`, `creative`, `ads`, `analytics`).
- `options.includePending` is **always `false`** when called by the Orchestrator on behalf of an agent producing new output (per Rule 4, campaign-memory-v1.md). The only caller allowed to pass `includePending: true` is the human-review UI itself, never an agent pipeline.
- The returned Campaign Context Slice (`context` + `relevantEvents`) is passed to Brief Builder. When business scope is available, the Orchestrator also retrieves one bounded Knowledge Slice and passes it to Brief Builder with separate provenance. The Agent receives only the resulting approved `MarketingBrief` and never queries either memory itself.

In `TOOL_MODE`, Campaign Context retrieval is skipped entirely. Optional durable Knowledge retrieval may still occur when an authorized business scope is available. The Agent still receives only the resulting Brief.

---

## 5. Memory Writes

Only the Orchestrator writes to Campaign Memory, and only after Risk Gate classification. The write always includes:

- `module + artifact` (from the agent's output; canonical identity)
- `approvalStatus` (`auto_saved` for low risk, `pending` for medium/high — see Section 2)
- `riskLevel` (the Orchestrator's enforced final value, not the agent's raw suggestion)
- `module`, `task`, `summary`, `payload`
- `supersedes` — populated only if this output is explicitly replacing a prior event (e.g. user regenerates a draft); otherwise `null`

In `TOOL_MODE`, no Memory Event is written at generation time. A write only happens if/when the user explicitly chooses "Save to Campaign" after the fact, at which point the event is created with `module: "special"` and `artifact: "retroactive_attach"` (per Rule 6).

---

## 6. Supported Agents

- Research
- SEO
- Content
- Creative
- Video
- Ads
- Analytics

Each agent is a pure function from the Orchestrator's perspective: `MarketingBrief → output`. Agents do not call Context Slice or Knowledge Slice services themselves, do not write memory themselves, and do not classify their own final risk (they may *suggest* a risk level, per Section 3, but cannot enforce it).

---

## 7. Open Items / Future Work

- **Multi-Agent Routing**: a single user request that requires more than one agent (e.g. "build me a campaign" touching Research → SEO → Content in sequence). Not yet specified — needs its own design doc before implementation, since it changes how Risk Gate applies (gate per-agent-output, or gate once at the end of a chain?).
- **Campaign Learning Loop implementation**: the governing architecture is specified in `learning-memory-architecture.md`. `analytics + campaign_learning` remains a terminal Campaign Memory observation until the governed Learning Memory lifecycle creates approved runtime-visible learning.
- **Context Slicing granularity**: per-module field and artifact maps are
  enforced by `context-slicing-matrix.md`. SEO additionally has an approved
  task-level predecessor allowlist under ACR-003. Task-level slicing for other
  modules remains an open item and must not be added ad hoc.
