# Usage V1 Contract

## Definition

Usage V1 is the account-consumption ledger for AI Marketing OS.

It answers:

- How much AI capacity did the account consume?
- Which modules created that consumption?
- Which providers handled the requests?
- When did the activity happen?
- Did the generation complete or fail?

Usage is account-centric. Campaign information is attribution metadata, not a
campaign-health metric.

## Data Source

The canonical source is `ai_usage`.

Every canonical generation route records an immutable usage event after the
provider call. Campaign memory and campaign outputs must not be used as the
primary source for account consumption.

## Canonical Event

```json
{
  "user_id": "uuid",
  "campaign_id": "uuid|null",
  "campaign_name": "string|null",
  "module": "research|seo|content|creative|ads|video",
  "artifact": "string",
  "provider": "string",
  "model": "string",
  "status": "completed|failed|fallback",
  "input_tokens": 0,
  "output_tokens": 0,
  "tokens_used": 0,
  "credits_used": 0,
  "latency_ms": 0,
  "created_at": "ISO-8601"
}
```

## UI Order

1. Current Plan
2. Today, This Week, This Month
3. Daily AI Consumption
4. Module Usage
5. Provider Usage
6. Recent Activity
7. Export CSV

## Non-goals

- Campaign Health
- Workflow Readiness
- Risk Analysis
- Next Action
- Time Saved estimates
- Synthetic cost estimates

