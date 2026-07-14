# ACR-003 — SEO Internal Dependency Visibility

## Status

Approved

## Context

The SEO Internal Dependency Chain required later SEO artifacts to benefit from
approved earlier artifacts, while the examples document described every SEO
call as fully independent. Both behaviors could not be implemented together.

## Decision

SEO supports this progressive canonical sequence:

```
keyword_research
  → keyword_cluster
  → topic_cluster
  → seo_strategy
  → meta_description / faq_generation
```

Each SEO task receives only the earlier SEO artifacts explicitly allowed for
that task by `context-slicing-matrix.md`. Visibility is limited to the same
campaign and to approved or `auto_saved` events. Pending, failed, rejected, and
superseded events remain invisible. Later artifacts never flow backward.

`meta_description` and `faq_generation` are parallel and do not depend on each
other. Dependencies are advisory rather than hard blockers. When an allowed
predecessor is missing, execution continues with explicit dependency
diagnostics indicating reduced context.

## Consequences

- Context Slice applies a task-specific SEO allowlist; it never loads all SEO
  history indiscriminately.
- The SEO prompt receives only the bounded `relevantEvents` returned by Context
  Slice.
- Tests must prove forward-only visibility, approval filtering, supersedes
  filtering, parallel-task isolation, and execution with missing predecessors.
- Expanding or changing the sequence requires another approved ACR.
