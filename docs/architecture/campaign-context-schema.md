# Campaign Context Schema v1.2

## Purpose

Campaign Context Object is the current source of truth for a campaign.
Agents read from Campaign Context Object first.
Memory Events are used for history and explainability.

---

## CampaignContextObject

```js
{
  campaignId: "",
  campaignName: "",
  contextVersion: 1,
  industry: "",
  offer: "",
  goal: "",
  audience: "",
  positioning: "",
  valueProposition: "",
  tone: "",
  platforms: [],
  competitors: [],
  status: "draft",
  createdAt: "",
  updatedAt: ""
}
```

---

## CampaignMemoryEvent (v1.2)

```js
{
  id: "",
  campaignId: "",

  // v1.2: module + artifact replaces the single "type" string.
  // module = which agent produced this (research / seo / content / creative / ads / analytics)
  // artifact = what specifically was produced (keyword_research, topic_cluster, blog_draft ...)
  // Backward compat: old rows in campaign_outputs used type = module_artifact combined string.
  module: "",
  artifact: "",

  approvalStatus: "pending",  // enum: pending | approved | rejected | auto_saved
  confidence: 0.0,
  riskLevel: "low",           // enum: low | medium | high

  task: "",
  summary: "",
  payload: {},
  supersedes: null,
  createdAt: "",
  createdBy: ""
}
```

---

## Artifact Registry

All valid module+artifact combinations. Adding a new artifact requires:
1. Adding it here
2. Adding its risk floor to adr-003-risk-classification.md
3. Adding its Writer/Reader row to context-slicing-matrix.md

### module: research
| artifact | description |
|---|---|
| market_research | Market size, segments, growth drivers |
| audience_analysis | Personas, JTBD, objections, buying triggers |
| competitor_analysis | Competitive landscape, positioning gaps |
| trends_research | Emerging shifts, adoption timing |
| pain_points_research | Friction, blockers, emotional triggers |
| opportunities_research | Market gaps, campaign openings |

### module: seo
| artifact | description |
|---|---|
| keyword_research | Primary/secondary/long-tail keywords with intent + difficulty |
| keyword_cluster | Keywords grouped by topic and search intent |
| topic_cluster | Pillar pages and supporting content map |
| seo_strategy | Full SEO roadmap: pillars, internal linking, content calendar |
| meta_description | Optimized meta titles and descriptions |
| faq_generation | FAQ content structured for featured snippets |

### module: content
| artifact | description |
|---|---|
| blog_draft | Long-form blog post |
| email_draft | Email campaign copy |

### module: creative
| artifact | description |
|---|---|
| creative_concept | Provider-neutral Creative Specification |
| image_asset | Generated image, provider prompt, and image review |

### module: ads
| artifact | description |
|---|---|
| ad_copy | Ad copy for any platform |

### module: analytics
| artifact | description |
|---|---|
| campaign_learning | Performance insight written back to memory |

### module: video
| artifact | description |
|---|---|
| video_script | Campaign-aware narrative video script |
| storyboard | Scene-by-scene visual plan |

### special
| artifact | description |
|---|---|
| retroactive_attach | Tool-mode output attached to campaign after the fact |
| context_change | Explicit update to CampaignContextObject field |

---

## Approval Status (enum)

| Value | Meaning | Visible to other agents? |
|---|---|---|
| pending | Created, not yet reviewed | No (unless riskLevel: "low") |
| approved | Explicitly accepted by human | Yes |
| rejected | Explicitly declined — never resurface | No |
| auto_saved | Low-risk, bypassed manual review | Yes |

Default on creation: pending — except riskLevel: "low" events which are auto_saved.
