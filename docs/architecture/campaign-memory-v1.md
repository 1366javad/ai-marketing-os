# Campaign Memory - Approval and Conflict Rules

**Version 1.2 - Governs `getCampaignContextSlice()`**

## 1. Two-Tier Model

| Tier | Purpose | Mutability |
|---|---|---|
| Campaign Context Object | Current structured campaign truth | Explicit, versioned updates only |
| Campaign Memory Events | Append-only history of generated artifacts, approvals, and learnings | Never edited or physically deleted; superseded by new events |

## 2. Memory Identity

Every canonical event is identified by a module and artifact:

```js
{
  module: "research",
  artifact: "market_research"
}
```

The legacy `type` database column remains during the v1.2 migration. New
Writers mirror `artifact` into `type` only for backward compatibility.
Canonical Readers do not rely on `type`.

## 3. Approval Rules

1. `approved` and `auto_saved` artifacts are readable by allowed downstream
   modules.
2. `pending` artifacts are invisible to agent generation calls.
3. `rejected` artifacts never resurface.
4. Low-risk artifacts are created as `auto_saved`.
5. Medium- and high-risk artifacts are created as `pending`.
6. Human review may explicitly load pending artifacts with
   `includePending: true`.

## 4. Conflict and Audit Rules

Memory is append-only. Corrections create a new event with:

```js
{
  supersedes: "previous-event-id"
}
```

Approval filtering runs before supersedes resolution. A pending replacement
must not hide the last approved artifact.

Delete actions create rejected tombstones. They do not physically delete
Campaign Memory history.

## 5. Context Updates

Generation never silently changes Campaign Context. Context changes require an
explicit user action and are represented by the special
`artifact: "context_change"`.

Tool-mode outputs attached later use
`artifact: "retroactive_attach"` because they were generated without Campaign
Context.

## 6. Context Slicing Contract

```js
getCampaignContextSlice(
  campaignId,
  module,
  task,
  {
    includePending: false,
    minConfidence: 0,
    maxRiskLevel: null
  }
) => {
  context,
  relevantEvents,
  contextVersion
}
```

The function enforces:

- Writer -> Reader artifact matrix
- approval status
- optional risk ceiling
- optional confidence floor
- supersedes chains
- per-module Campaign Context fields

## 7. Risk Summary

The canonical source is `docs/decisions/adr-003-risk-classification.md`.

| Risk | Examples | Write behavior |
|---|---|---|
| Low | Research artifacts, keyword research, keyword clusters, campaign learning | `auto_saved` |
| Medium | Topic clusters, meta descriptions, FAQs, content drafts, creative artifacts | `pending` |
| High | SEO strategy, ad copy | `pending` with hard approval gate |

## 8. What This Prevents

- Unreviewed artifacts feeding downstream agents
- A coarse event type hiding which asset was actually produced
- Silent context mutation
- Losing provenance during correction or deletion
- Different agents reading incompatible memory slices

