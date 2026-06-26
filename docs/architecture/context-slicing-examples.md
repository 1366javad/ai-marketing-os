# Context Slicing Examples v1.0

## Purpose

This document is the concrete companion to `context-slicing-matrix.md`. The matrix lists *which* fields and event types each module reads — this document traces *actual* `getCampaignContextSlice()` calls with realistic input/output, so every ambiguous edge case is resolved here, in writing, before `getCampaignContextSlice.js` is implemented.

If a question comes up while coding that isn't answered by an example here, **stop and add the example first** — don't resolve it inline in the implementation.

---

## Research

**Call:**
```js
getCampaignContextSlice("camp_123", "research", "find audience pain points")
```

**Returns:**
```js
{
  context: {
    industry: "EdTech",
    competitors: ["Shorelight", "Studocu"],
    audience: "International students 18-24",
    goal: "Lead generation"
  },
  relevantEvents: [],  // Research is typically first; no prior events to read
  contextVersion: 3
}
```

No edge case here — Research has no event-type dependencies (per the Matrix), so `relevantEvents` is empty on a fresh campaign and stays empty until something else has run.

---

## SEO

**Call:**
```js
getCampaignContextSlice("camp_123", "seo", "generate keyword list")
```

**Returns:**
```js
{
  context: {
    goal: "Lead generation",
    audience: "International students 18-24",
    offer: "1:1 application coaching",
    competitors: ["Shorelight", "Studocu"],
    industry: "EdTech"
  },
  relevantEvents: [
    {
      id: "evt_001",
      type: "research_insight",
      approvalStatus: "auto_saved",
      summary: "Audience pain point: visa documentation confusion",
      payload: { ... }
    }
  ],
  contextVersion: 3
}
```

**Resolved edge case:** SEO does *not* read `keyword_idea` events from itself or prior SEO runs in this version. Each SEO call is independent; if the campaign needs "don't repeat previous keywords" logic, that's a future enhancement (flag in Open Items, not solved here) — not a silent default behavior.

---

## Content

**Call:**
```js
getCampaignContextSlice("camp_123", "content", "write blog post about visa process")
```

**Returns:**
```js
{
  context: {
    audience: "International students 18-24",
    offer: "1:1 application coaching",
    tone: "Encouraging, plain-language",
    positioning: "The coach that actually answers your questions",
    valueProposition: "Personal guidance, not generic templates"
  },
  relevantEvents: [
    {
      id: "evt_001",
      type: "research_insight",
      approvalStatus: "auto_saved",
      summary: "Audience pain point: visa documentation confusion"
    },
    {
      id: "evt_004",
      type: "keyword_idea",
      approvalStatus: "auto_saved",
      summary: "Primary keyword cluster: 'student visa documents checklist'"
    }
  ],
  contextVersion: 3
}
```

**Resolved edge case:** Content reads `research_insight` AND `keyword_idea` — both, not either/or. This was implicit in the Matrix but is now explicit: a Content call without keyword context would produce SEO-blind drafts, which defeats the point of campaign-mode in the first place.

---

## Creative

**Call:**
```js
getCampaignContextSlice("camp_123", "creative", "design Instagram carousel concept")
```

**Returns:**
```js
{
  context: {
    audience: "International students 18-24",
    offer: "1:1 application coaching",
    tone: "Encouraging, plain-language",
    positioning: "The coach that actually answers your questions",
    platforms: ["Instagram", "TikTok"]
  },
  relevantEvents: [
    {
      id: "evt_001",
      type: "research_insight",
      approvalStatus: "auto_saved",
      summary: "Audience pain point: visa documentation confusion"
    },
    {
      id: "evt_007",
      type: "blog_draft",
      approvalStatus: "approved",
      summary: "Blog: 'Your Visa Document Checklist, Explained'"
    }
  ],
  contextVersion: 3
}
```

**Resolved edge case (your first question):** Creative reads `blog_draft`/`email_draft` (content types) *only when `approvalStatus: "approved"`* — `evt_007` appears here because it was approved; an equivalent pending draft would not appear. This was stated in the Matrix ("only if approved") but is now shown concretely: the filtering isn't a separate step, it's baked into what `relevantEvents` contains by the time it reaches the agent.

**Second resolved point:** when Creative itself later produces *both* `creative_concept` and `image_asset` from the same call, both are written as separate Memory Events (not bundled into one event with two types) — so a future caller reading Creative's output sees two distinct events, each independently approvable. A carousel concept can be approved while its accompanying image asset is sent back for revision, without blocking each other.

---

## Ads

**Call:**
```js
getCampaignContextSlice("camp_123", "ads", "write ad copy for carousel")
```

**Returns:**
```js
{
  context: {
    audience: "International students 18-24",
    offer: "1:1 application coaching",
    positioning: "The coach that actually answers your questions",
    valueProposition: "Personal guidance, not generic templates",
    platforms: ["Instagram", "TikTok"]
  },
  relevantEvents: [
    {
      id: "evt_004",
      type: "keyword_idea",
      approvalStatus: "auto_saved",
      summary: "Primary keyword cluster: 'student visa documents checklist'"
    },
    {
      id: "evt_009",
      type: "creative_concept",
      approvalStatus: "approved",
      summary: "Carousel: 5-slide visa checklist walkthrough"
    }
  ],
  contextVersion: 3
}
```

**Resolved edge case (your second question):** Ads does **not** receive `evt_007` (the `blog_draft`) in `relevantEvents`, even though it was approved and visible to Creative one step earlier. This is intentional, not a gap: per the Matrix, Ads' relevant event types are `keyword_idea` and `creative_concept`/`image_asset` only — `blog_draft` is not in Ads' read list. Ad copy is written from positioning + approved creative direction, not from long-form blog content; if blog content needs to inform an ad, that influence should already be reflected in the *approved creative concept* Ads reads, not pulled redundantly from the original blog draft.

If this turns out to be wrong in practice (e.g. Ads copywriters in testing keep needing blog context), that's a Matrix change, not a workaround inside `getCampaignContextSlice()` — update `context-slicing-matrix.md` first, then this examples doc, then the implementation.

---

## Analytics

**Call:**
```js
getCampaignContextSlice("camp_123", "analytics", "evaluate campaign performance")
```

**Returns:**
```js
{
  context: {
    campaignId: "camp_123",
    campaignName: "QuestApply Launch",
    contextVersion: 3,
    industry: "EdTech",
    offer: "1:1 application coaching",
    goal: "Lead generation",
    audience: "International students 18-24",
    positioning: "The coach that actually answers your questions",
    valueProposition: "Personal guidance, not generic templates",
    tone: "Encouraging, plain-language",
    platforms: ["Instagram", "TikTok"],
    competitors: ["Shorelight", "Studocu"],
    status: "active",
    createdAt: "...",
    updatedAt: "..."
  },
  relevantEvents: [
    // every approved/auto_saved event in the campaign, regardless of type —
    // per the documented exception in context-slicing-matrix.md
  ],
  contextVersion: 3
}
```

**Resolved edge case:** Analytics is the only module where `context` is the *full* object, not a subset — already documented as an explicit exception in the Matrix, shown here concretely so the implementation doesn't need to special-case "is this Analytics, return everything" as an undocumented branch. It's one `if (module === "analytics") return fullContext` — expected, not a hack.

---

## Cross-Cutting Edge Case: Pending Event from the Same Module

**Scenario:** Content module has a `blog_draft` it wrote five minutes ago that's still `pending` (not yet approved). The *same* Content module is called again for a related task.

**Call:**
```js
getCampaignContextSlice("camp_123", "content", "write a follow-up email", {
  // no special options — this is a normal call
})
```

**Resolved:** the pending `blog_draft` does **not** appear in `relevantEvents` here either, even though it came from the same module. Per Rule 4 (`campaign-memory-v1.md`), "same module can see its own pending output" applies to the *review/iteration UI*, not to a fresh `getCampaignContextSlice()` call feeding a new generation task. If Content needs to reference its own draft-in-progress, that draft must be passed explicitly in the task payload by the calling UI — not silently surfaced through the memory slice. This keeps `getCampaignContextSlice()`'s behavior identical regardless of caller, which is what makes it safe to be the single enforcement point (Rule 7).

---

## What This Resolves

Both edge cases raised before implementation are now answered, in writing, with a stated rationale:

1. **Creative → `creative_concept` + `image_asset`:** both are read when present and approved; both are written as separate, independently-approvable events.
2. **Ads → `blog_draft`:** explicitly excluded. Ads reads keyword + approved creative only, not raw blog content.

If `getCampaignContextSlice.js` is implemented from this document plus the Matrix, no new architectural decision should be required mid-coding — only normal engineering (error handling, performance, testing).
