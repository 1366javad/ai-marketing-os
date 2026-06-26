# Analytics Metrics Contract V1

All metrics are deterministic and range from 0 to 100.

## Campaign Health

```text
Campaign Health =
  Workflow Completion * 0.45
  + Approval Readiness * 0.25
  + Asset Readiness * 0.20
  + Context Completeness * 0.10
```

Campaign Health is never inferred from provider confidence or generated prose.

## Workflow Completion

Source: `campaign_plan.recommendedWorkflow`.

- Approved or auto-saved artifact: complete
- Pending artifact: generated but incomplete
- Rejected, deleted, or missing artifact: incomplete

If no workflow exists, the canonical core workflow is used:

1. Market Research
2. Keyword Research
3. Blog Post
4. Image Post
5. Google Ads

## Approval Readiness

```text
approved + auto_saved / all active memory events
```

Rejected and tombstoned events do not count as ready.

## Asset Readiness

The percentage of completed workflow steps that have a corresponding readable
memory event, output, or exported campaign asset.

## Context Completeness

Required campaign fields:

- goal
- audience
- industry/category
- offer/product name

## Quality KPIs

- Memory Coverage
- Risk Distribution
- Confidence Distribution
- Provider Health

These are explanatory and do not increase Campaign Health.

## Operational KPIs

- Generated Outputs
- Exported Assets
- Total Assets
- Token Usage when recorded
- Generation Time when recorded
