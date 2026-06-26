# ADR-004

# Canonical Architecture

## Status

Accepted

---

## Context

During development, AI Marketing OS accumulated two parallel architectures inside `app/lib/`:

**Legacy** (`app/lib/ai/legacy/`):
- Built before Campaign-Centric decision (ADR-001)
- Agents call providers directly — no Campaign Memory, no Context Slicing, no Risk Gate
- `runCampaign()` runs all agents in parallel without campaign context
- Brief validation checks only 4 fields (campaignId, campaignName, goal, targetAudience)
- Quality layer operates on raw strings, not structured output with event types

**New** (`app/lib/ai/` — everything outside `legacy/`):
- Built after ADR-001, ADR-002, ADR-003
- Campaign Memory, Context Slicing Matrix, Risk Classification enforced
- Every module accesses memory only through `getCampaignContextSlice()`
- Brief Builder enriches from approved campaign context, not raw prompt alone
- Quality Layer validates structured agent output against MarketingBrief

These two cannot coexist as equals — they represent fundamentally different philosophies. Running both in production would mean two different answers to "what is the audience for this campaign?" depending on which path a request took.

---

## Decision

**`app/lib/ai/` is the canonical architecture.** All new code goes here.

**`app/lib/ai/legacy/` is archived**, not deleted. It remains runnable because current production features (Research, SEO, Content, Creative, Video, Ads tabs) still depend on it. It is not extended — only read when migration requires understanding the old behavior.

### Canonical structure (locked)

```
app/lib/ai/
├── campaign/          ← CampaignContextObject + CampaignMemoryEvent + getCampaignContextSlice()
├── orchestrator/      ← detectMode, resolveModule, resolveTask, resolveRiskGate, buildExecutionPlan
├── input-guard/       ← validateInput (task-aware, rule-based, no LLM)
├── brief-builder/     ← extractSignals + enrichBrief → MarketingBrief
├── quality/           ← runQualityChecks (rule-based, no LLM)
├── agents/            ← one sub-folder per module: research, seo, content, creative, ads, analytics
├── providers/         ← LLM/API adapters (Claude, Gemini, Groq, Pollinations, etc.)
└── legacy/            ← archived pre-ADR-001 code — read-only, not extended
```

### What "canonical" means in practice

- Every new agent goes in `app/lib/ai/agents/`
- Every new agent receives a `MarketingBrief` (not raw prompt, not full Campaign Context)
- Every agent output goes through `runQualityChecks()` before memory write
- No code outside `legacy/` calls `runCampaign()`, `runAndCollect()`, or any `legacy/` function directly
- If a legacy function is needed in new code, it must be migrated and re-implemented under the canonical structure first

---

## Migration Path (not in scope for this ADR — separate work)

Legacy agents will be migrated to canonical one at a time, module by module, as each canonical Agent (step 10) is completed and smoke-tested. Migration is done when:
1. The canonical agent passes its smoke test
2. The corresponding legacy agent folder is removed (not just ignored)
3. All API routes that previously called the legacy agent are updated to use the canonical pipeline

Until a module is fully migrated, the legacy version remains the production path for that module.

---

## Consequences

- New team members have one answer to "where does code go": `app/lib/ai/` (outside `legacy/`)
- `legacy/` is clearly marked as temporary — not a valid reference for new patterns
- No silent dual-path execution: a request is either on the canonical pipeline or the legacy pipeline, never both
- ADR-001 (Campaign-Centric), ADR-002 (Memory Rules), ADR-003 (Risk Classification) are all enforced exclusively in the canonical path

## Rejected Alternatives

**Keep both equal, decide later:** rejected — creates permanent ambiguity about which path is authoritative. Three months later nobody knows which `agents/` folder to trust.

**Delete legacy immediately:** rejected — current production depends on it. Deleting without migrating would break running features.
