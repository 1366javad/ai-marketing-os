# Creative Image Pipeline

**Version 2.1**

## Contract

```text
Research Agent
  -> SEO Agent
  -> Content Agent
  -> Creative Strategy Agent
  -> Visual Director
  -> Provider-aware Image Prompt Builder
  -> Image Generator
  -> Image Reviewer
  -> Approved Asset
  -> Campaign Memory
```

The Creative Strategy Agent is provider-neutral. It defines the campaign idea,
audience insight, message, desired response, and brand direction. It must not
direct scenes, produce image prompts, or import an image provider.

## Creative Strategy

```json
{
  "campaignType": "",
  "visualGoal": "",
  "marketingAngle": "",
  "audienceInsight": "",
  "keyMessage": "",
  "desiredResponse": "",
  "brandDirection": ""
}
```

## Visual Director

The Visual Director translates abstract strategy into concrete, visible,
photographable evidence. Story is not part of the image contract.

```json
{
  "scene": {
    "primarySubject": "",
    "action": "",
    "setting": ""
  },
  "props": [],
  "state": {},
  "camera": {
    "angle": "",
    "shot": "",
    "focus": ""
  },
  "lighting": {
    "type": "",
    "accent": ""
  },
  "mood": "",
  "hero": "",
  "complexity": "low",
  "brand": {
    "palette": [],
    "negativeSpace": "top-right",
    "logo": false
  },
  "negative": []
}
```

Abstract terms such as roadmap, pathway, readiness, progress, or transformation
must be replaced with physical subjects, actions, props, and visible state.
Pollinations prompt building reduces prop count automatically when complexity
is medium or high.

## Provider-aware Prompt Builders

Prompt length and syntax belong to the provider adapter:

- Pollinations: concise prompt, maximum 80 words.
- Flux: moderately detailed descriptive prompt.
- OpenAI Image: richer instruction prompt.
- Imagen: concise natural-language scene description.

Provider-specific forbidden elements are merged into `negativePrompt`.
Pollinations reserves part of its 80-word budget for forbidden elements so the
avoidance clause cannot be truncated by a long scene description.

## Image Review

The reviewer contract returns:

```json
{
  "score": 0,
  "passed": false,
  "mode": "vision|heuristic",
  "checks": {},
  "issues": [],
  "limitations": [],
  "reviewedAt": ""
}
```

Images scoring below 75 are regenerated once with a retry prompt.

The heuristic reviewer validates generation integrity, prompt limits, and
specification completeness. It must disclose that it cannot inspect faces,
hands, rendered text, visual artifacts, or brand color accuracy. Pixel-level
claims require a configured vision reviewer.

## Memory

One Creative generation writes two independently reviewable events:

- `creative/creative_concept`: provider-neutral Creative Strategy plus Visual Director output.
- `creative/image_asset`: generated asset, provider prompt, and review result.

The legacy `type` column mirrors each artifact during the v1.2 migration.
