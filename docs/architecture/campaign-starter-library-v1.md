# Campaign Starter Library V1

## Status

Active

## Definition

A Campaign Starter is a proven campaign playbook.

It is not:

- a prompt template
- a content template
- a generated asset
- an instruction to run every agent automatically

## Contract

```js
{
  id: "",
  name: "",
  bestFor: "",
  description: "",
  goal: "",
  audience: "",
  offer: "",
  industry: "",
  channels: [],
  successMetrics: [],
  recommendedWorkflow: [
    {
      module: "",
      task: "",
      label: ""
    }
  ]
}
```

`recommendedWorkflow` contains user-facing campaign actions such as Market
Research, Keyword Research, Landing Page, and Google Ads. It must not collapse
the playbook into generic module names.

## User Flow

```text
Campaign Starter Library
-> Use Template
-> Preview and Edit
-> Create Campaign
-> Campaign Workspace
```

The preview must allow editing:

- Campaign Name
- Goal
- Audience
- Offer
- Industry
- Channels
- Success Metrics
- Recommended Workflow

## Persistence

Campaign truth is written to the campaign record:

- `goal`
- `target_audience`
- `product_name` as the current offer
- `industry`
- `campaign_plan`

`campaign_plan` is a JSONB field owned by the campaign:

```js
{
  starter: {
    id: "",
    name: "",
    bestFor: ""
  },
  channels: [],
  successMetrics: [],
  recommendedWorkflow: []
}
```

Campaign Memory is not the source of truth for the plan. It remains reserved
for generated outputs, approvals, learnings, and explicit changes.

The selected workflow is a plan. It does not automatically execute agents.
Overview computes progress by comparing workflow tasks with actual generated
campaign outputs.
