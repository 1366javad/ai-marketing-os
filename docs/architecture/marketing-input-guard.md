# Marketing Input Guard v1.1

## Purpose

Prevent invalid, irrelevant, or low-quality prompts from reaching providers.

---

## Relationship to Campaign Context

**Decision:** Input Guard is context-independent by design. It validates structural and topical quality of the raw prompt only (Is this readable text? Is this marketing-related? Is this spam?) — it does not read Campaign Context Object and does not change behavior based on Tool Mode vs Campaign Mode.

Rationale: Input Guard runs *before* `detectMode()` in the canonical flow (see `orchestrator-design.md`, Section 2). At the point Input Guard runs, the system doesn't yet need to know which mode the request belongs to — it only needs to know whether the prompt is usable at all. The Orchestrator then determines the execution plan and required context scope; after that, Brief Builder combines the validated input, execution plan, and context slice. This keeps Input Guard a simple, fast, stateless filter rather than a context-aware component — it should be the cheapest, fastest step in the pipeline.

This is a v1 scope decision, not a permanent constraint — if Brief Builder later proves insufficient at reducing redundant clarification questions in Campaign Mode, this boundary should be revisited explicitly (not silently blurred).

---

## Status Types

### valid

Input can be processed.

Example:

Create an Instagram campaign for QuestApply.

---

### needs_clarification

Input is understandable but lacks enough context.

Example:

QuestApply

Response:

Please specify what you would like to create:

- Blog Post
- Ad
- Carousel
- Reel
- Image

---

### invalid

Input contains mostly random characters.

Example:

%%##@@@3322

---

### blocked

Input is unrelated to marketing.

Example:

What is the capital of France?

---

## Validation Rules

Check:

- minimum length
- readable text
- marketing relevance
- special character ratio
- spam patterns

---

## Output Format

```js
{
  status: "valid",
  reason: "",
  userMessage: "",
  normalizedPrompt: ""
}
```
