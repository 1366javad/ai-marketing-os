# Context Slicing Matrix v1.2

## Purpose

The enforced lookup table behind getCampaignContextSlice().
Two questions per module: what does it READ, what does it WRITE.

v1.2 upgrade: artifact-level granularity instead of event-type strings.
Query syntax: { module: "seo", artifact: "topic_cluster" }

---

## Writer → Reader Matrix

This table answers: "which agents can read which artifacts from which producers?"
All reads are approved/auto_saved only (Rule 3/4, campaign-memory-v1.md).
Pending artifacts are never visible to other agents.

| Writer module | artifact | Reader modules | notes |
|---|---|---|---|
| research | market_research | seo, content, creative, ads | Foundational — all downstream agents benefit |
| research | audience_analysis | seo, content, creative, ads | All agents need audience context |
| research | competitor_analysis | seo, content, creative, ads | Informs positioning across all modules |
| research | trends_research | seo, content, creative | Less relevant for Ads directly |
| research | pain_points_research | content, creative, ads | Directly informs messaging |
| research | opportunities_research | seo, content | Strategic direction for content and SEO |
| seo | keyword_research | content | Content uses keywords in drafts |
| seo | keyword_cluster | content | Content structures articles around clusters |
| seo | topic_cluster | content, creative | Content uses topics; Creative uses for visual direction |
| seo | seo_strategy | content, creative, ads | High-risk — all downstream agents read this |
| seo | meta_description | (none) | Terminal output — Assets/export only, no agent reads it |
| seo | faq_generation | content | Content may incorporate FAQs into long-form |
| content | blog_draft | creative, ads | Creative takes direction from approved drafts |
| content | email_draft | (none) | Terminal output |
| creative | creative_concept | ads | Ads build on approved creative concepts |
| creative | image_asset | ads | Ads reference approved visuals |
| analytics | campaign_learning | (all) | Analytics feeds learning back to all modules |

---

## Context Object Fields per Module

What getCampaignContextSlice() returns from CampaignContextObject for each module.
Analytics gets the full object (documented exception — it evaluates the whole campaign).

| module | allowed Context Object fields |
|---|---|
| research | industry, competitors, audience, goal |
| seo | goal, audience, offer, competitors, industry |
| content | audience, offer, tone, positioning, valueProposition |
| creative | audience, offer, tone, positioning, platforms |
| ads | audience, offer, positioning, valueProposition, platforms |
| analytics | ALL fields (documented exception) |

---

## SEO Internal Dependency Chain

Within the SEO module, artifacts have a recommended generation order.
Later artifacts benefit from earlier ones being approved first.

```
keyword_research  (low — auto_saved, immediately available)
      ↓
keyword_cluster   (low — auto_saved)
      ↓
topic_cluster     (medium — needs approval before Content reads it)
      ↓
seo_strategy      (high — needs approval before Content/Creative/Ads read it)
      ↓
meta_description  (medium — terminal, no downstream dependency)
faq_generation    (medium — Content may read it)
```

This is a recommendation, not a hard block. A user can generate meta_description
before seo_strategy exists — it will just have less context to work with
(lower confidence score reflects this).

### SEO task-level predecessor allowlist

SEO context is bounded by both module and task. A task may read only the
approved or `auto_saved` predecessor artifacts listed below from the same
campaign; it never receives all historical SEO events.

| SEO task | Visible prior SEO artifacts |
|---|---|
| `keyword_research` | none |
| `keyword_cluster` | `keyword_research` |
| `topic_cluster` | `keyword_research`, `keyword_cluster` |
| `seo_strategy` | `keyword_research`, `keyword_cluster`, `topic_cluster` |
| `meta_description` | `keyword_research`, `keyword_cluster`, `topic_cluster`, `seo_strategy` |
| `faq_generation` | `keyword_research`, `keyword_cluster`, `topic_cluster`, `seo_strategy` |

`meta_description` and `faq_generation` are parallel downstream tasks and do
not read each other. Missing predecessors do not block execution; Context Slice
returns explicit dependency diagnostics so the Agent can proceed with reduced
context. Pending, failed, rejected, and superseded artifacts are not visible.

---

## Cross-Module Rule

Canonical `module + artifact` filter (this matrix) and approval filter (Rule 3/4, campaign-memory-v1.md)
always apply together. This matrix defines WHICH artifacts a module may read.
The approval filter defines WHICH of those are currently visible.
Neither overrides the other.

getCampaignContextSlice(campaignId, module, task, options) enforces both.
