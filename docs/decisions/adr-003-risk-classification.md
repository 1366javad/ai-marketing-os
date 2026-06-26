# ADR-003

# Risk Classification

## Status

Accepted (updated v1.2 — risk now based on downstream impact, not output type)

---

## Context

v1.1 assigned risk based on what type of content was produced.
v1.2 assigns risk based on how far downstream the artifact propagates errors.

The chain is:
  Research → SEO → Content → Creative → Ads

An artifact high in the chain that is wrong corrupts everything below it.
An artifact at the end of the chain (meta description, FAQ) only affects itself.
This is why seo_strategy is High even though it is "just a document" —
if the strategy is wrong, Content, Creative, and Ads all go in the wrong direction.

---

## Decision

Risk = f(downstream blast radius), not f(content type).

### Risk Floor Table (v1.2)

| module | artifact | risk | reason |
|---|---|---|---|
| research | market_research | low | Raw data — easy to correct, no agent depends on it yet |
| research | audience_analysis | low | Raw data — feeds SEO but correction is cheap |
| research | competitor_analysis | low | Raw data |
| research | trends_research | low | Raw data |
| research | pain_points_research | low | Raw data |
| research | opportunities_research | low | Raw data |
| seo | keyword_research | low | Initial data, easy to iterate |
| seo | keyword_cluster | low | Grouping only, no content built on it yet |
| seo | topic_cluster | medium | Content is built on this — wrong topics = wrong content |
| seo | seo_strategy | high | Directs Content + Creative + Ads — wrong strategy = wrong campaign |
| seo | meta_description | medium | Final output, independent, does not feed other agents |
| seo | faq_generation | medium | Final output, feeds Content only |
| content | blog_draft | medium | Feeds Creative direction |
| content | email_draft | medium | Independent output |
| creative | creative_concept | medium | Feeds Ads |
| creative | image_asset | medium | Independent output |
| ads | ad_copy | high | Public-facing, budget-spending, irreversible |
| analytics | campaign_learning | low | Observational, no agent acts on it automatically |
| video | video_script | medium | Campaign-facing script requiring review |
| video | storyboard | medium | Visual execution plan requiring review |
| special | retroactive_attach | medium | Generated without context — always needs review |
| special | context_change | medium | Affects all future agent outputs campaign-wide |

---

## Two-Layer Enforcement (unchanged from v1.1)

1. Agent proposes a suggestedRiskLevel (can be MORE cautious than floor, never less)
2. Orchestrator enforces the floor — classifyRisk() returns max(suggested, floor)

---

## Approval Rules by Risk Level

| risk | approvalStatus on creation | Can other agents read it? | Gate |
|---|---|---|---|
| low | auto_saved | Yes, immediately | None |
| medium | pending | Only after human approval | Soft — user must review before other agents build on it |
| high | pending | Only after explicit approval | Hard — blocked until approved |

---

## Repair Threshold

If Quality Layer fails an output:
- low risk → auto-repair (one retry with stronger prompt, no human gate)
- medium risk → repair attempt, then surface to human if still failing
- high risk → surface to human immediately, no auto-repair

---

## Rejected Alternatives

Full agent self-classification: rejected — agents can under-report to skip gates.
Content-type-only risk: rejected (v1.1 approach) — seo_strategy is "just text" but
its blast radius makes it High. Content type is insufficient signal.
