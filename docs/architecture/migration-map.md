# Migration Map

**Last updated:** June 2026  
**Purpose:** Single source of truth for which parts of AI Marketing OS are running on Legacy architecture vs Canonical architecture. Anyone touching a Tab or Route must check this file first.

---

## How to read this map

| Status | Meaning |
|---|---|
| 🔴 Legacy | Running on `app/lib/ai/legacy/` — old direct-provider pipeline, no Campaign Memory |
| 🟡 In Progress | Migration started, not yet complete |
| 🟢 Canonical | Running on `app/lib/ai/` new architecture — Input Guard → Orchestrator → Context Slice → Brief Builder → Agent → Quality Layer → Memory Write |

---

## Tab / Route Status

| Tab | Route (approximate) | Status | Legacy entry point | Canonical agent |
|---|---|---|---|---|
| Research | `/api/research/generate` | 🟡 In Progress | `legacy/agents/research/index.js` (kept archived during Sprint 11A) | `agents/research/` — Research Agent V2 built |
| SEO | `/api/ai/seo` | 🔴 Legacy | `legacy/agents/seo/index.js` | `agents/seo/` — not yet built |
| Content | `/api/content/generate` | 🟡 In Progress | `legacy/agents/content/index.js` (kept archived during Sprint 10A) | `agents/content/` — Content Agent V2 built |
| Creative | `/api/ai/creative` | 🔴 Legacy | `legacy/agents/creative/index.js` | `agents/creative/` — not yet built |
| Video | `/api/ai/video` | 🔴 Legacy | `legacy/agents/video/index.js` | `agents/video/` — not yet built |
| Ads | `/api/ai/ads` | 🔴 Legacy | `legacy/agents/ads/index.js` | `agents/ads/` — not yet built |
| Analytics | `/api/ai/analytics` | 🔴 Legacy | (not yet implemented) | `agents/analytics/` — not yet built |

---

## Canonical infrastructure status (built, not yet wired to any Route)

These modules exist and are tested but no UI Route calls them yet:

| Module | Location | Status |
|---|---|---|
| Campaign Memory | `app/lib/ai/campaign/` | ✅ Built + smoke-tested |
| getCampaignContextSlice() | `app/lib/ai/campaign/getCampaignContextSlice.js` | ✅ Built + smoke-tested |
| Orchestrator | `app/lib/ai/orchestrator/` | ✅ Built + smoke-tested |
| Marketing Input Guard | `app/lib/ai/input-guard/` | ✅ Built + smoke-tested |
| Brief Builder | `app/lib/ai/brief-builder/` | ✅ Built + smoke-tested |
| Quality Layer | `app/lib/ai/quality/` | ✅ Built + smoke-tested |
| Agents | `app/lib/ai/agents/` | 🔴 Not yet built |
| Providers (canonical) | `app/lib/ai/providers/` | 🔴 Not yet built |

---

## Migration checklist (per Tab)

To migrate one Tab from Legacy to Canonical, all of these must be done **in order**:

```
□ 1. Build canonical Agent  (app/lib/ai/agents/<module>/)
□ 2. Build/verify canonical Provider adapter  (app/lib/ai/providers/)
□ 3. Wire Route to canonical pipeline:
       validateInput() → runOrchestrator() → getCampaignContextSlice()
       → buildBrief() → runAgent() → runQualityChecks() → writeMemoryEvent()
□ 4. Run the required automated tests
□ 5. Smoke-test end-to-end on staging
□ 6. Delete corresponding legacy/agents/<module>/ folder
□ 7. Verify every sprint Exit Criterion
□ 8. Update this file: change Tab status from 🔴/🟡 to 🟢
```

Step 6 (deletion) is mandatory — a Tab is not "migrated" until the legacy code that served it is gone. Leaving both alive means two code paths can diverge silently. Step 8 is always last: this map records completed reality and must not be updated until every Exit Criterion is verified.

---

## Import rule during migration

While a Tab is still 🔴 Legacy, its Route must import from the legacy path:

```js
// ✅ correct for a Legacy route
import { getProvider } from "@/app/lib/ai/legacy/core/getProvider"
import { runContentAgent } from "@/app/lib/ai/legacy/agents/content"

// ❌ wrong — canonical modules are not wired yet
import { runQualityChecks } from "@/app/lib/ai/quality"
```

Once a Tab is migrated (🟢), it imports exclusively from canonical paths. No file should import from both `legacy/` and the canonical structure — that indicates an incomplete migration.

---

## Video Contract Status

Video architecture is **Contract Locked**, but Video Agent V2 has not been
built.

- Active planning tasks: `video_script`, `storyboard`
- Phase 2 tasks: `reel_package`, `tiktok_video`, `youtube_short`,
  `campaign_package`
- Active planning route: `/api/video/planning/generate`
- The planning route uses the canonical Input Guard, Orchestrator, Context
  Slice, Brief Builder, Provider, Quality Layer, and Memory Write
- No `app/lib/ai/agents/video/` exists yet
- Legacy final-video provider routes are not used by Campaign Video Workspace

## Who owns migration decisions

Migration of each Tab is a product decision, not just a technical one — switching a Tab from Legacy to Canonical changes the behavior the user sees (Campaign Memory, Context Slicing, Risk Gates all become active). Each migration should be reviewed before going to production.
