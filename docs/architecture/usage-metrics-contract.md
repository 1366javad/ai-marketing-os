# Usage Metrics Contract V1

Usage metrics are deterministic and must be calculated only from recorded
`ai_usage` events.

## Requests

One immutable usage event equals one recorded request.

## Tokens

```text
total_tokens = input_tokens + output_tokens
```

When a provider does not return token usage, token values remain `0`. Usage V1
does not invent token estimates.

## Credits

Credits are product consumption units, not currency.

- Text generation: 1 credit
- Image generation: 4 credits
- Video generation: 10 credits

Subscription allowances and renewal dates require a separate billing source.
Until that source exists, the UI may show consumed credits but must not invent
remaining credits, plan names, or renewal dates.

## Status

- `completed`: the requested provider completed the generation
- `fallback`: a fallback provider completed the generation
- `failed`: no provider completed the generation

## Aggregations

- Daily consumption groups events by calendar date.
- Module usage groups by `module`.
- Provider usage groups by final `provider`.
- Recent activity is ordered by `created_at` descending.

