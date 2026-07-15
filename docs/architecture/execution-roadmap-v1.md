# AI Marketing OS — Execution Roadmap v1

**Status:** Parent Execution Document (Build Order, not Architecture)
**Parents:** `ai-marketing-os-architecture-blueprint-v1.md`,
`implementation-architecture-v1.md`
**Depends on (not re-derived here):** `migration-map.md` (current status —
always check it before starting a sprint; this roadmap will drift, that file
won't), `context-slicing-matrix.md` (dependency order between agents),
`adr-004-canonical-architecture.md` (migration checklist mechanics)

---

## 0. Purpose and Scope

This document answers exactly one question:

> **In what order do we build the remaining pieces, and how do we know each
> piece is actually done?**

It does not re-argue *why* the architecture looks the way it does (Blueprint)
or *where* code goes (Implementation Architecture). It sequences work and
defines exit criteria per sprint, grounded in what `migration-map.md` says is
actually true today — not in an idealized restart.

This roadmap covers **Phase 1 only** (per Blueprint Section 15): finishing
the Campaign Workspace with real Shared Intelligence across all tabs.
Phase 2–4 (Knowledge Engine, Market Memory, Learning Memory) are listed at
the end as backlog, not sequenced in detail — they get their own roadmap
when Phase 1 is done.

---

## 1. Starting Point (as of this writing — verify against `migration-map.md`)

| Piece | Status |
|---|---|
| Canonical infrastructure (Campaign Memory, `getCampaignContextSlice()`, Orchestrator, Input Guard, Brief Builder, Quality Layer) | 🟢 Built + smoke-tested |
| Research Tab | 🟡 In progress — canonical agent built, route not fully migrated |
| Content Tab | 🟡 In progress — canonical agent built, route not fully migrated |
| SEO / Creative / Video / Ads / Analytics Tabs | 🔴 Legacy — canonical agents not built |
| Video planning route | 🟢 Canonical (contract locked), Video Agent V2 itself not built |

**Implication:** we are not starting from zero. The foundation (everything
Section 1 of `implementation-architecture-v1.md` calls "leaf"
infrastructure) is done. The remaining work is entirely at the Agent layer
and the Route-migration layer — no new architectural decisions should be
required to finish Phase 1, per the closing note in
`context-slicing-examples.md`.

---

## 2. Build Order Logic

Agents are not built in an arbitrary or alphabetical order. The order below
follows the dependency chain already locked in `context-slicing-matrix.md`'s
Writer→Reader table: an agent should not be finished before the agents whose
approved output it depends on for meaningful Shared Intelligence.

```
Research   (feeds everyone — no dependencies)
   ↓
SEO        (feeds Content, Creative, Ads)
   ↓
Content    (feeds Creative, Ads) — already 🟡 in progress, finish alongside SEO
   ↓
Creative   (feeds Ads)
   ↓
Ads        (terminal in the current Matrix)
   ↓
Analytics  (reads everything — campaign_learning feeds back to all modules)

Video runs in parallel (independent contract, already locked)
```

Finishing an agent "out of order" (e.g. building Ads before Creative) is not
forbidden, but it means Ads temporarily can't demonstrate real Shared
Intelligence (it would have no `creative_concept` to read yet) — so agents
should be migrated to canonical in this order whenever possible.

---

## 3. Sprint Plan

Each sprint below follows the same shape for every agent, since that shape
is already fully specified: the **Extension Rules** in
`implementation-architecture-v1.md` Section 11.1, and the **Migration
checklist** in `migration-map.md`. This roadmap does not repeat those
step-by-step instructions — it only says which module is being migrated in
which sprint and what "done" means for Phase 1 purposes.

### Sprint A — Finish Research (complete the 🟡 → 🟢 transition)

**Status:** ✅ Completed July 14, 2026. Validated by the approved Sprint A
Local Integration Smoke Test exception; Production Smoke Test deferred until
deployment infrastructure is available and required before the next public
release. See `sprint-a-completion-report.md`.

**Why first:** every other agent's Shared Intelligence depends on approved
Research output existing. Nothing else can be meaningfully demoed without
this being done.

- Follow `migration-map.md` Migration checklist for Research.
- Follow `implementation-architecture-v1.md` Section 11.1 for anything not
  already built (adapter, route wiring).
- **Exit criteria:**
  - Route fully on canonical pipeline (Input Guard → Orchestrator →
    Context Slice → Brief Builder → Agent → Quality → Memory Write).
  - At least one end-to-end smoke test on staging producing an
    `auto_saved` `market_research` or `audience_analysis` event that a
    second module can read via `getCampaignContextSlice()`.
  - `legacy/agents/research/` deleted (Step 6 of the migration checklist —
    not optional).
  - Every Exit Criterion verified.
  - `migration-map.md` updated to 🟢.

### Sprint B — SEO (net-new canonical agent)

**Status:** ✅ Completed July 14, 2026. The approved temporary infrastructure
exception accepted the Local Integration Smoke Test for Sprint B; a Production
Smoke Test remains mandatory before the next public release. See
`sprint-b-validation-report.md`.

**Why second:** Content, Creative, and Ads all read SEO artifacts per the
Matrix; SEO itself only depends on Research, which Sprint A completes.

- Follow Section 11.1 (new Agent) in full, since SEO has no canonical agent
  yet — this is the first "from scratch" sprint, not a migration of
  existing canonical work.
- Confirm the Matrix's SEO Internal Dependency Chain
  (`context-slicing-matrix.md`) is respected in implementation order:
  `keyword_research` → `keyword_cluster` → `topic_cluster` → `seo_strategy`
  → `meta_description`/`faq_generation`.
- **Exit criteria:**
  - Canonical `agents/seo/` built, satisfying `IAgent`.
  - Risk floors for all SEO artifacts present in the Orchestrator's floor
    table (`orchestrator-design.md` Section 3) — `seo_strategy` must be
    `high` per that table; do not ship with a lower default.
  - Route migrated, legacy SEO route deleted, `migration-map.md` updated.
  - Smoke test: a Content-module call in the same campaign can see an
    approved `keyword_cluster` in `relevantEvents`.

### Sprint C — Finish Content (complete the 🟡 → 🟢 transition)

**Why here, not earlier:** Content's canonical agent already exists, but
its most meaningful Shared-Intelligence behavior (reading an approved
Research artifact **and** an approved SEO artifact together, per
`context-slicing-examples.md`) is only fully demonstrable once SEO
(Sprint B) is producing real `seo + keyword_cluster` events.

- Follow `migration-map.md` checklist to finish the route migration.
- **Exit criteria:**
  - Same as Sprint A structure, applied to Content.
  - Smoke test explicitly reproduces the worked example in
    `context-slicing-examples.md` ("Content" section): a Content call
    returns both an approved canonical Research identity (for example,
    `research + audience_analysis`) and `seo + keyword_cluster` in
    `relevantEvents`. Exit Criteria are evaluated by `module + artifact`,
    never by the legacy `type` compatibility field.

### Sprint D — Creative (net-new canonical agent, image pipeline included)

**Why here:** Creative reads approved Content (`blog_draft`) per the
Matrix, so it should follow Content's completion.

- Follow Section 11.1, plus `creative-image-pipeline.md` in full — this is
  the one agent with an already-fully-specified internal pipeline
  (Creative Strategy → Visual Director → Provider-aware Prompt Builder →
  Image Generator → Image Reviewer).
- Confirm the two-event write behavior is implemented exactly as specified:
  one call produces **two** separately-approvable Memory Events
  (`creative_concept` and `image_asset`), never bundled into one.
- **Exit criteria:**
  - Canonical `agents/creative/` built, calling a real image provider
    adapter under `providers/`.
  - Image Reviewer contract implemented (`score`, `passed`, `mode`,
    `checks`, `issues`, `limitations`, `reviewedAt`) with the documented
    disclosure limitations (cannot inspect faces/hands/text/brand color
    without a configured vision reviewer).
  - Route migrated, legacy Creative route deleted, `migration-map.md`
    updated.
  - Smoke test reproduces the resolved edge case in
    `context-slicing-examples.md` ("Creative" section): an approved
    `blog_draft` appears in Creative's `relevantEvents`; a pending one does
    not.

### Sprint E — Ads (net-new canonical agent)

**Why here:** Ads is the last in the current Matrix's linear chain — it
reads approved `seo + seo_strategy` and `creative + creative_concept`/
`creative + image_asset`, not raw `content + blog_draft` (a deliberately resolved edge case, see
`context-slicing-examples.md`, "Ads" section — do not "fix" this during
implementation without updating the Matrix first).

- Follow Section 11.1.
- `ad_copy` risk floor is `high` — confirm the hard approval gate (blocked,
  not just `pending`) is actually enforced end-to-end, since this is the
  one artifact type in the current Matrix explicitly tied to
  budget/publish-adjacent risk.
- **Exit criteria:**
  - Canonical `agents/ads/` built.
  - Smoke test confirms `ad_copy` output is blocked pending explicit human
    approval before it can be marked as publishable — not just flagged.
  - Route migrated, legacy Ads route deleted, `migration-map.md` updated.

### Sprint F — Analytics (net-new canonical agent)

**Why last in the core chain:** Analytics is the documented exception that
reads the *full* Context Object and *all* approved/auto_saved events
regardless of type (`context-slicing-matrix.md`) — it only produces a
meaningful result once the other agents have real approved history to
evaluate.

- Follow Section 11.1.
- Confirm the "full context" exception is implemented as the single
  explicit branch documented in `context-slicing-examples.md`
  ("Analytics" section) — not a broader silent bypass of the Matrix.
- **Exit criteria:**
  - Canonical `agents/analytics/` built.
  - `campaign_learning` write path confirmed working (even though Learning
    Memory itself, i.e. Phase 4 propagation into future agent context, is
    explicitly out of scope for Phase 1 — see Blueprint Section 15).
  - Route built (none existed pre-canonical, per `migration-map.md`),
    `migration-map.md` updated to 🟢.

### Sprint G — Video (parallel track, contract already locked)

Can run in parallel with any of Sprints B–F, since Video's planning contract
is independent of the Research→SEO→Content→Creative→Ads chain.

- Planning route (`/api/video/planning/generate`) already runs the full
  canonical pipeline for `video_script`/`storyboard` — confirm this is
  still true before starting.
- Build `agents/video/` (does not exist yet) to actually handle
  `video_script` and `storyboard` tasks.
- Phase 2 Video tasks (`reel_package`, `tiktok_video`, `youtube_short`,
  `campaign_package`) are explicitly **not** in this sprint — only the
  active planning tasks are, per `migration-map.md`, "Video Contract
  Status."
- **Exit criteria:**
  - `agents/video/` built for `video_script` and `storyboard` only.
  - Legacy final-video provider routes remain untouched (per
    `migration-map.md`, they are not used by the Campaign Video Workspace
    and are not part of this sprint's scope).
  - `migration-map.md` updated to reflect Video Agent V2 status.

---

## 4. Cross-Cutting Work (not tied to one sprint, must be done before Phase 1 is called complete)

- **Multi-agent routing design doc:** per
  `implementation-architecture-v1.md` Section 9, chaining a single request
  across multiple agents (e.g. "build me a full campaign") is an open gap.
  A dedicated design doc must be written and approved (deciding whether
  Risk Gate applies per-agent-output or once at the end of a chain) before
  any sprint above attempts to implement implicit chaining. This is
  currently **not scheduled** into a specific sprint — flag it as a
  prerequisite the moment any sprint's scope tries to grow into
  multi-agent behavior.
- **Response Envelope standardization:** `implementation-architecture-v1.md`
  Section 7.3 defines a response shape that is not yet formally confirmed
  consistent across existing agents (Research, Content). Before Sprint B
  begins, verify Research/Content's actual route responses match this
  envelope, or update the envelope definition — don't let each new agent
  invent its own shape.
- **Per-Tab migration is a product review, not just a merge:** per
  `migration-map.md`, "Who owns migration decisions" — each sprint's Exit
  Criteria above are necessary but not sufficient. Product review of
  user-visible behavior change (Campaign Memory, Context Slicing, and Risk
  Gates becoming active for that Tab) must happen before flipping a Tab to
  production 🟢.

---

## 5. Explicitly Deferred (Backlog, not Phase 1)

These are real, already-identified gaps — listed here so they are not lost,
not because they're scheduled:

| Item | Owner document when it starts |
|---|---|
| UX Approval Modes (Guided / Professional / Autonomous) — Blueprint Section 10 | New ADR + `implementation-architecture-v1.md` update (new `approval/` folder) |
| Knowledge Engine (Phase 2) | New ADR + new specialized doc, per Blueprint Section 8 |
| Market Memory (Phase 3) | New ADR |
| Learning Memory feedback loop into agent context (Phase 4) | New ADR — note `campaign_learning` writes already happen in Sprint F; the *feedback into other agents' context* is what's deferred |
| Video Phase 2 tasks (`reel_package`, `tiktok_video`, `youtube_short`, `campaign_package`) | Extension of Sprint G once Phase 1 core is done |

---

## 6. Definition of "Phase 1 Complete"

Phase 1 (per Blueprint Section 15) is complete when, and only when:

- [ ] All seven Tabs (Research, SEO, Content, Creative, Video, Ads,
      Analytics) are 🟢 in `migration-map.md`.
- [ ] All corresponding `legacy/agents/<module>/` folders are deleted (not
      archived-and-ignored).
- [ ] The Shared Intelligence worked example in Blueprint Section 6.1
      (pricing-fear → Creative/Ads/SEO/Content adjusting independently) can
      be demonstrated live on staging with real approved events, not
      mocked data.
- [ ] `migration-map.md` shows no Tab importing from both `legacy/` and
      canonical paths.

Only after this checklist is fully checked should Phase 2 planning
(Knowledge Engine) begin in earnest.
