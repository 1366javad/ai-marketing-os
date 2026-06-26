# Analytics V1 Contract

## Definition

Analytics V1 is an explainable mission-control layer that evaluates campaign
readiness, highlights gaps, and recommends the next deterministic action using
campaign state, memory, approvals, outputs, and assets.

It is not Google Analytics and it does not predict traffic, ROI, revenue, or
campaign success without real performance data.

## Goal

Convert campaign execution data into explainable campaign intelligence.

Every score must include the evidence that produced it.

## Data Sources

- `campaigns`
- Campaign Context fields
- `campaigns.campaign_plan`
- `campaign_memory_events`
- `campaign_outputs`
- `campaign_assets`

## UX Order

1. Campaign Health
2. Recommended Next Action
3. Workflow Progress
4. Approval Queue
5. Risks and Gaps
6. Asset Readiness
7. Technical Details
8. Explainability

## Non-goals

- AI score
- success prediction
- ROI prediction
- traffic forecast
- revenue forecast
- synthetic performance metrics
