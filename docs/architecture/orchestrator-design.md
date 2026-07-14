# Orchestrator Design v2.0

## Purpose

The Orchestrator is the brain of AI Marketing OS. It is the **only** component allowed to call `getCampaignContextSlice()` and the **only** component allowed to write Memory Events. Agents never touch Campaign Memory directly (per ADR-002).

It decides:

- Tool Mode vs Campaign Mode
- Context Injection (what slice of memory an agent receives)
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
[CAMPAIGN_MODE only]
Orchestrator: getCampaignContextSlice(campaignId, module, task)
  ↓
Brief Builder                  (combines validated input, execution plan, and context slice)
  ↓
Orchestrator: selectAgent(module)
  ↓
Selected Agent                 (receives task + context slice, if any)
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
  finalRisk = enforceMinimumRisk(agentOutput.type, baseRisk)
  return finalRisk
```

- Each **Agent** proposes a `suggestedRiskLevel` based on what it produced (it knows its own output type best — e.g. SEO Agent knows a keyword list is low-risk, Ads Agent knows a published ad is high-risk).
- The **Orchestrator** holds a hard-coded minimum-risk floor per event `type` (see table below) and never allows an agent to self-report *below* that floor. An agent can over-classify its own output as riskier than the floor, never under-classify it.

| Event Type | Minimum Risk Floor |
| --- | --- |
| `research_insight`, `keyword_idea` | low |
| `content_draft`, `email_draft`, `blog_draft`, `creative_concept` | medium |
| `image_asset` | medium |
| `ad_copy` | high |
| `retroactive_attach` | medium (regardless of original content — see Rule 6, campaign-memory-v1.md) |
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
- The returned slice (`context` + `relevantEvents`) is passed to the agent as part of its task payload. The agent never queries memory itself.

In `TOOL_MODE`, this call is skipped entirely. The agent receives only the Brief Builder's normalized prompt — no campaign context exists to inject.

---

## 5. Memory Writes

Only the Orchestrator writes to Campaign Memory, and only after Risk Gate classification. The write always includes:

- `type` (from the agent's output)
- `approvalStatus` (`auto_saved` for low risk, `pending` for medium/high — see Section 2)
- `riskLevel` (the Orchestrator's enforced final value, not the agent's raw suggestion)
- `module`, `task`, `summary`, `payload`
- `supersedes` — populated only if this output is explicitly replacing a prior event (e.g. user regenerates a draft); otherwise `null`

In `TOOL_MODE`, no Memory Event is written at generation time. A write only happens if/when the user explicitly chooses "Save to Campaign" after the fact, at which point the event is created with `type: "retroactive_attach"` (per Rule 6).

---

## 6. Supported Agents

- Research
- SEO
- Content
- Creative
- Video
- Ads
- Analytics

Each agent is a pure function from the Orchestrator's perspective: `(task, contextSlice | null) → output`. Agents do not call `getCampaignContextSlice()` themselves, do not write memory themselves, and do not classify their own final risk (they may *suggest* a risk level, per Section 3, but cannot enforce it).

---

## 7. Open Items / Future Work

- **Multi-Agent Routing**: a single user request that requires more than one agent (e.g. "build me a campaign" touching Research → SEO → Content in sequence). Not yet specified — needs its own design doc before implementation, since it changes how Risk Gate applies (gate per-agent-output, or gate once at the end of a chain?).
- **Campaign Learning Loop**: how `analytics` module outputs (performance data) feed back into other agents' future context. Not yet specified.
- **Context Slicing granularity**: `getCampaignContextSlice()` is defined to return only fields relevant to `module + task`, but the exact per-module field map (what SEO needs vs. what Creative needs) is defined in `campaign-memory-v1.md` only as illustrative examples, not as an enforced lookup table. Needs a concrete mapping before `getCampaignContextSlice()` is implemented.
