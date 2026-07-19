# Migration Map

**Last updated:** July 19, 2026
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
| Research | `/api/research/generate` | 🟢 Canonical | None — removed after Sprint A validation | `agents/research/` — Research Agent V2 built and validated |
| SEO | `/api/seo/generate` | 🟢 Canonical | None — removed after Sprint B validation | `agents/seo/` — SEO Agent V2 built and validated |
| Content | `/api/content/generate` | 🟢 Canonical | None — removed after Sprint C validation | `agents/content/` — Content Agent V2 built and validated |
| Creative | `/api/creative/generate` | 🟢 Canonical | None — removed after Sprint D validation | `agents/creative/` — Creative Agent V2 and image pipeline built and validated |
| Video | `/api/video/planning/generate` | 🟢 Canonical | Final-video legacy routes retained outside Planning scope | `agents/video/` — Video Planning Agent V2 built and validated |
| Ads | `/api/ads/generate` | 🟢 Canonical | None — removed after Sprint E validation | `agents/ads/` — Ads Agent V2 built and validated |
| Analytics | `/api/analytics/generate` | 🟢 Canonical | None — no pre-canonical implementation existed | `agents/analytics/` — Analytics Agent V2 built and validated |

---

## Canonical infrastructure status

These modules exist and are tested. Route adoption is tracked in the Tab / Route
Status table above.

| Module | Location | Status |
|---|---|---|
| Campaign Memory | `app/lib/ai/campaign/` | ✅ Built + smoke-tested |
| getCampaignContextSlice() | `app/lib/ai/campaign/getCampaignContextSlice.js` | ✅ Built + smoke-tested |
| Orchestrator | `app/lib/ai/orchestrator/` | ✅ Built + smoke-tested |
| Marketing Input Guard | `app/lib/ai/input-guard/` | ✅ Built + smoke-tested |
| Brief Builder | `app/lib/ai/brief-builder/` | ✅ Built + smoke-tested |
| Quality Layer | `app/lib/ai/quality/` | ✅ Built + smoke-tested |
| Agents | `app/lib/ai/agents/` | ✅ Research, SEO, Content, Creative, Ads, Analytics, and Video Planning canonical |
| Providers (canonical) | `app/lib/ai/providers/` | ✅ Built + all Phase 1 canonical capabilities validated |

---

## Phase 2 Knowledge Engine Sprint Status

| Sprint | Capability | Status | Validation |
|---|---|---|---|
| P2-A | Durable Knowledge Foundation | Closed | Development migration applied; schema, RLS, cross-business isolation, append-only protection, ownership, automated tests, lint, and production build passed |
| P2-B | Source Ingestion and Normalization | Closed | Source registration, hashing, deduplication, four deterministic normalizers, processing state, retry, safe observability, real-source integration, automated tests, lint, and production build passed |
| P2-C | Extraction, Synthesis, and Conflict Detection | Closed | Provider-backed extraction, exact evidence, deterministic identity/confidence, agreement synthesis, explicit conflict gating, review queue, real-provider validation, automated tests, lint, and production build passed |
| P2-D | Validation, Approval, and Versioning | Closed | Authorized approval/revocation, validation and conflict gates, append-only versioning, supersession, rejection, expiry/revocation invisibility, history, evidence, audit, database integration, automated tests, lint, and production build passed |
| P2-E | Knowledge Slice | Closed | Read-only bounded slices, exact module allowlists, scope/validity/status/version/conflict filtering, deterministic ranking, protected constraints/facts, provenance, diagnostics, RLS integration, automated tests, lint, and production build passed |
| P2-F | Canonical Runtime Integration | Not Started | Blocked until P2-E closure |
| P2-G | Candidate Updates and Phase 2 Closure | Not Started | Blocked until P2-F closure |

P2-A database validation used the designated Supabase Development project.
The forward migration was applied atomically. Schema, RLS, two-user/two-business
isolation, and immutable-history protections were verified with transactional
fixtures that were rolled back after validation. The destructive foundation
rollback was intentionally not executed against the existing development
database, per the approved validation exception.

P2-B validation used a real website snapshot and the designated Supabase
Development project. Duplicate content reused the immutable source identity,
changed content created a new snapshot, retryable failure returned safely to
`registered`, and successful normalization reached the `normalized` ready
state. Transactional fixtures confirmed that P2-B created no Candidate Claims,
Knowledge Versions, approved knowledge, or Runtime-visible Knowledge Slice.

P2-C validation used two real OpenAI extractions plus deterministic synthesis,
and the designated Supabase Development project. Agreeing sources collapsed to
one Candidate Claim while preserving both evidence references. Materially
different values created one open conflict and forced every affected Candidate
to `needs_review`. Direct authenticated writes and forged confidence values
were rejected. No approval, Knowledge Version, Knowledge Slice, or Runtime
visibility was created.

P2-D validation used the designated Supabase Development project. Human role
boundaries were verified for reviewer approval and owner/admin revocation;
non-members and direct authenticated writes were rejected. Approval created
immutable, evidence-backed versions; supersession retained history with one
active version; conflicts blocked the complete canonical identity until human
resolution. Rejection, expiry, and revocation remained absent from the current
runtime-visible projection, and every successful state transition produced
append-only audit evidence. Transactional validation fixtures were rolled back.

P2-E validation used the designated Supabase Development project and the
canonical KnowledgeService boundary. Only approved, current, valid, in-scope,
allowed-domain, conflict-free knowledge appeared. RLS prevented cross-business
inputs; candidates, superseded, expired, revoked, conflicted, and mismatched
records remained invisible. Deterministic selection enforced the hard 50-item
maximum while preserving constraints and approved facts under truncation.
Every item retained source provenance, all exclusion diagnostics were explicit,
and repeated Slice reads produced no durable mutation. Transactional fixtures
were rolled back after validation.

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

Video architecture is **Contract Locked**, and Video Planning Agent V2 is
built and validated.

- Active planning tasks: `video_script`, `storyboard`
- Phase 2 tasks: `reel_package`, `tiktok_video`, `youtube_short`,
  `campaign_package`
- Active planning route: `/api/video/planning/generate`
- The planning route uses the canonical Input Guard, Orchestrator, Context
  Slice, Brief Builder, Provider, Quality Layer, and Memory Write
- `app/lib/ai/agents/video/` owns `video_script` and `storyboard` only
- Legacy final-video provider routes are not used by Campaign Video Workspace

## Who owns migration decisions

Migration of each Tab is a product decision, not just a technical one — switching a Tab from Legacy to Canonical changes the behavior the user sees (Campaign Memory, Context Slicing, Risk Gates all become active). Each migration should be reviewed before going to production.
